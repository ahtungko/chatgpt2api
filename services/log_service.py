from __future__ import annotations

import json
import itertools
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from threading import RLock
from typing import Any

from fastapi import HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse, StreamingResponse

from services.config import DATA_DIR
from utils.helper import anthropic_sse_stream, sse_json_stream

LOG_TYPE_CALL = "call"
LOG_TYPE_ACCOUNT = "account"


class LogService:
    def __init__(self, path: Path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def add(self, type: str, summary: str = "", detail: dict[str, Any] | None = None, **data: Any) -> None:
        item = {
            "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "type": type,
            "summary": summary,
            "detail": detail or data,
        }
        with self.path.open("a", encoding="utf-8") as file:
            file.write(json.dumps(item, ensure_ascii=False, separators=(",", ":")) + "\n")

    def list(self, type: str = "", start_date: str = "", end_date: str = "", limit: int = 200) -> list[dict[str, Any]]:
        if not self.path.exists():
            return []
        items: list[dict[str, Any]] = []
        for line in reversed(self.path.read_text(encoding="utf-8").splitlines()):
            try:
                item = json.loads(line)
            except Exception:
                continue
            t = str(item.get("time") or "")
            day = t[:10]
            if type and item.get("type") != type:
                continue
            if start_date and day < start_date:
                continue
            if end_date and day > end_date:
                continue
            items.append(item)
            if len(items) >= limit:
                break
        return items


log_service = LogService(DATA_DIR / "logs.jsonl")


PROMPT_PREVIEW_LIMIT = 500


def _now_text() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _clean(value: object, default: str = "") -> str:
    return str(value or default).strip()


def _prompt_preview(value: object) -> str:
    text = _clean(value)
    if len(text) <= PROMPT_PREVIEW_LIMIT:
        return text
    return f"{text[:PROMPT_PREVIEW_LIMIT]}..."


def _text_from_content(value: object) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        parts: list[str] = []
        for item in value:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict):
                text = item.get("text") or item.get("input_text") or item.get("content")
                if isinstance(text, str):
                    parts.append(text)
        return "\n".join(parts)
    if isinstance(value, dict):
        text = value.get("text") or value.get("input_text") or value.get("content")
        return _text_from_content(text)
    return ""


def _prompt_from_payload(payload: dict[str, Any]) -> str:
    prompt = _clean(payload.get("prompt"))
    if prompt:
        return _prompt_preview(prompt)

    input_value = payload.get("input")
    if isinstance(input_value, str):
        return _prompt_preview(input_value)
    if isinstance(input_value, list):
        parts: list[str] = []
        for item in input_value:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict):
                text = _text_from_content(item.get("content") or item.get("text"))
                if text:
                    parts.append(text)
        if parts:
            return _prompt_preview("\n".join(parts))

    messages = payload.get("messages")
    if isinstance(messages, list):
        parts = []
        for item in messages:
            if isinstance(item, dict):
                text = _text_from_content(item.get("content"))
                if text:
                    parts.append(text)
        if parts:
            return _prompt_preview("\n".join(parts[-3:]))
    return ""


def _size_from_payload(payload: dict[str, Any]) -> str:
    size = _clean(payload.get("size"))
    if size:
        return size
    tools = payload.get("tools")
    if isinstance(tools, list):
        for tool in tools:
            if isinstance(tool, dict):
                size = _clean(tool.get("size"))
                if size:
                    return size
    return ""


def _mode_from_endpoint(endpoint: str) -> str:
    if endpoint.endswith("/images/generations"):
        return "generate"
    if endpoint.endswith("/images/edits"):
        return "edit"
    if endpoint.endswith("/responses"):
        return "responses"
    if endpoint.endswith("/chat/completions"):
        return "chat"
    if endpoint.endswith("/messages"):
        return "messages"
    return endpoint.rsplit("/", 1)[-1] or "api"


class ActiveCallService:
    def __init__(self):
        self._lock = RLock()
        self._counter = itertools.count(1)
        self._items: dict[str, dict[str, Any]] = {}

    def start(self, call: "LoggedCall", args: tuple[object, ...]) -> str:
        payload = next((arg for arg in args if isinstance(arg, dict)), {})
        item_id = f"direct-{int(call.started * 1000)}-{next(self._counter)}"
        now = _now_text()
        item = {
            "id": item_id,
            "status": "running",
            "mode": _mode_from_endpoint(call.endpoint),
            "model": call.model,
            "size": _size_from_payload(payload),
            "created_at": datetime.fromtimestamp(call.started).strftime("%Y-%m-%d %H:%M:%S"),
            "updated_at": now,
            "owner_id": call.identity.get("id"),
            "owner_role": call.identity.get("role"),
            "owner_name": call.identity.get("name"),
            "prompt_preview": _prompt_from_payload(payload),
            "endpoint": call.endpoint,
            "source": "direct",
        }
        with self._lock:
            self._items[item_id] = item
        return item_id

    def finish(self, item_id: str | None) -> None:
        if not item_id:
            return
        with self._lock:
            self._items.pop(item_id, None)

    def list_running(self) -> list[dict[str, Any]]:
        with self._lock:
            items = [dict(item) for item in self._items.values()]
        items.sort(key=lambda item: str(item.get("created_at") or ""), reverse=True)
        return items


active_call_service = ActiveCallService()


def _collect_urls(value: object) -> list[str]:
    urls: list[str] = []
    if isinstance(value, dict):
        for key, item in value.items():
            if key == "url" and isinstance(item, str):
                urls.append(item)
            elif key == "urls" and isinstance(item, list):
                urls.extend(str(url) for url in item if isinstance(url, str))
            else:
                urls.extend(_collect_urls(item))
    elif isinstance(value, list):
        for item in value:
            urls.extend(_collect_urls(item))
    return urls


def _image_error_response(exc: Exception) -> JSONResponse:
    message = str(exc)
    if "no available image quota" in message.lower():
        return JSONResponse(
            status_code=429,
            content={
                "error": {
                    "message": "no available image quota",
                    "type": "insufficient_quota",
                    "param": None,
                    "code": "insufficient_quota",
                }
            },
        )
    if hasattr(exc, "to_openai_error") and hasattr(exc, "status_code"):
        return JSONResponse(status_code=int(exc.status_code), content=exc.to_openai_error())
    return JSONResponse(
        status_code=502,
        content={
            "error": {
                "message": message,
                "type": "server_error",
                "param": None,
                "code": "upstream_error",
            }
        },
    )


def _next_item(items):
    try:
        return True, next(items)
    except StopIteration:
        return False, None


@dataclass
class LoggedCall:
    identity: dict[str, object]
    endpoint: str
    model: str
    summary: str
    started: float = field(default_factory=time.time)

    async def run(self, handler, *args, sse: str = "openai", task_reservation=None, task_finish=None):
        from services.protocol.conversation import ImageGenerationError

        active_call_id = active_call_service.start(self, args)
        finish_on_return = True
        reservation_finished = False

        def finish_task_reservation() -> None:
            nonlocal reservation_finished
            if reservation_finished:
                return
            reservation_finished = True
            if task_finish is not None:
                task_finish(task_reservation)

        try:
            try:
                result = await run_in_threadpool(handler, *args)
            except ImageGenerationError as exc:
                self.log(" failed", status="failed", error=str(exc))
                return _image_error_response(exc)
            except HTTPException as exc:
                self.log(" failed", status="failed", error=str(exc.detail))
                raise
            except Exception as exc:
                self.log(" failed", status="failed", error=str(exc))
                raise HTTPException(status_code=502, detail={"error": str(exc)}) from exc

            if isinstance(result, dict):
                self.log(" completed", result)
                return result

            sender = anthropic_sse_stream if sse == "anthropic" else sse_json_stream
            try:
                has_first, first = await run_in_threadpool(_next_item, result)
            except ImageGenerationError as exc:
                self.log(" failed", status="failed", error=str(exc))
                return _image_error_response(exc)
            except HTTPException as exc:
                self.log(" failed", status="failed", error=str(exc.detail))
                raise
            except Exception as exc:
                self.log(" failed", status="failed", error=str(exc))
                raise HTTPException(status_code=502, detail={"error": str(exc)}) from exc
            if not has_first:
                self.log(" stream ended")
                finish_on_return = False
                return StreamingResponse(
                    sender(self.stream((), active_call_id=active_call_id, task_finish=finish_task_reservation)),
                    media_type="text/event-stream",
                )
            finish_on_return = False
            return StreamingResponse(
                sender(
                    self.stream(
                        itertools.chain([first], result),
                        active_call_id=active_call_id,
                        task_finish=finish_task_reservation,
                    )
                ),
                media_type="text/event-stream",
            )
        finally:
            if finish_on_return:
                active_call_service.finish(active_call_id)
                finish_task_reservation()

    def stream(self, items, active_call_id: str | None = None, task_finish=None):
        urls: list[str] = []
        failed = False
        try:
            for item in items:
                urls.extend(_collect_urls(item))
                yield item
        except Exception as exc:
            failed = True
            self.log(" stream failed", status="failed", error=str(exc), urls=urls)
            raise
        finally:
            if not failed:
                self.log(" stream ended", urls=urls)
            active_call_service.finish(active_call_id)
            if task_finish is not None:
                task_finish()

    def log(self, suffix: str, result: object = None, status: str = "success", error: str = "",
            urls: list[str] | None = None) -> None:
        detail = {
            "key_id": self.identity.get("id"),
            "key_name": self.identity.get("name"),
            "role": self.identity.get("role"),
            "endpoint": self.endpoint,
            "model": self.model,
            "started_at": datetime.fromtimestamp(self.started).strftime("%Y-%m-%d %H:%M:%S"),
            "ended_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "duration_ms": int((time.time() - self.started) * 1000),
            "status": status,
        }
        if error:
            detail["error"] = error
        collected_urls = [*(urls or []), *_collect_urls(result)]
        if collected_urls:
            detail["urls"] = list(dict.fromkeys(collected_urls))
        log_service.add(LOG_TYPE_CALL, f"{self.summary}{suffix}", detail)
