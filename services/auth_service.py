from __future__ import annotations

import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timezone
from threading import Lock
from typing import Literal

from services.config import config
from services.storage.base import StorageBackend

AuthRole = Literal["admin", "user"]


class UserKeyQuotaExceededError(RuntimeError):
    def __init__(self, quota_type: Literal["generate", "edit"], remaining: int, requested: int):
        self.quota_type = quota_type
        self.remaining = remaining
        self.requested = requested
        super().__init__(f"user key {quota_type} quota exhausted")


class UserKeyTaskLimitExceededError(RuntimeError):
    def __init__(self, running: int, maximum: int):
        self.running = running
        self.maximum = maximum
        super().__init__(f"user key already has {running} running tasks (limit {maximum})")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _hash_key(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


class AuthService:
    def __init__(self, storage: StorageBackend):
        self.storage = storage
        self._lock = Lock()
        self._items = self._load()
        self._last_used_flush_at: dict[str, datetime] = {}
        self._active_task_counts: dict[str, int] = {}

    @staticmethod
    def _clean(value: object) -> str:
        return str(value or "").strip()

    @staticmethod
    def _default_name(role: object) -> str:
        return "管理员密钥" if str(role or "").strip().lower() == "admin" else "普通用户"

    @staticmethod
    def _normalize_quota(value: object) -> int | None:
        if value is None:
            return None
        text = str(value).strip()
        if not text:
            return None
        try:
            return max(0, int(float(text)))
        except Exception:
            return None

    @staticmethod
    def _normalize_counter(value: object) -> int:
        try:
            return max(0, int(float(str(value or 0).strip() or 0)))
        except Exception:
            return 0

    @staticmethod
    def _quota_field_names(quota_type: Literal["generate", "edit"]) -> tuple[str, str]:
        if quota_type == "edit":
            return "edit_remaining", "edit_used"
        return "generate_remaining", "generate_used"

    def _find_item_index_by_id(self, item_id: str) -> int:
        for index, item in enumerate(self._items):
            if self._clean(item.get("id")) == item_id:
                return index
        return -1

    def _normalize_item(self, raw: object) -> dict[str, object] | None:
        if not isinstance(raw, dict):
            return None
        role = self._clean(raw.get("role")).lower()
        if role not in {"admin", "user"}:
            return None
        key_hash = self._clean(raw.get("key_hash"))
        if not key_hash:
            return None
        item_id = self._clean(raw.get("id")) or uuid.uuid4().hex[:12]
        name = self._clean(raw.get("name")) or ("管理员密钥" if role == "admin" else "普通用户")
        created_at = self._clean(raw.get("created_at")) or _now_iso()
        last_used_at = self._clean(raw.get("last_used_at")) or None
        generate_remaining = self._normalize_quota(raw.get("generate_remaining"))
        edit_remaining = self._normalize_quota(raw.get("edit_remaining"))
        max_running_tasks = self._normalize_quota(raw.get("max_running_tasks"))
        generate_used = self._normalize_counter(raw.get("generate_used"))
        edit_used = self._normalize_counter(raw.get("edit_used"))
        return {
            "id": item_id,
            "name": name,
            "role": role,
            "key_hash": key_hash,
            "enabled": bool(raw.get("enabled", True)),
            "created_at": created_at,
            "last_used_at": last_used_at,
            "generate_remaining": generate_remaining,
            "edit_remaining": edit_remaining,
            "max_running_tasks": max_running_tasks,
            "generate_used": generate_used,
            "edit_used": edit_used,
        }

    def _load(self) -> list[dict[str, object]]:
        try:
            items = self.storage.load_auth_keys()
        except Exception:
            return []
        if not isinstance(items, list):
            return []
        return [normalized for item in items if (normalized := self._normalize_item(item)) is not None]

    def _save(self) -> None:
        self.storage.save_auth_keys(self._items)

    def _reload_locked(self) -> None:
        self._items = self._load()

    @staticmethod
    def _public_item(item: dict[str, object]) -> dict[str, object]:
        return {
            "id": item.get("id"),
            "name": item.get("name"),
            "role": item.get("role"),
            "enabled": bool(item.get("enabled", True)),
            "created_at": item.get("created_at"),
            "last_used_at": item.get("last_used_at"),
            "generate_remaining": item.get("generate_remaining"),
            "edit_remaining": item.get("edit_remaining"),
            "max_running_tasks": item.get("max_running_tasks"),
            "generate_used": int(item.get("generate_used") or 0),
            "edit_used": int(item.get("edit_used") or 0),
        }

    def list_keys(self, role: AuthRole | None = None) -> list[dict[str, object]]:
        with self._lock:
            self._reload_locked()
            items = [item for item in self._items if role is None or item.get("role") == role]
            return [self._public_item(item) for item in items]

    def _has_key_hash_locked(self, key_hash: str, *, exclude_id: str = "") -> bool:
        for item in self._items:
            item_id = self._clean(item.get("id"))
            if exclude_id and item_id == exclude_id:
                continue
            stored_hash = self._clean(item.get("key_hash"))
            if stored_hash and hmac.compare_digest(stored_hash, key_hash):
                return True
        return False

    def _build_key_hash_locked(self, raw_key: str, *, exclude_id: str = "") -> str:
        candidate = self._clean(raw_key)
        if not candidate:
            raise ValueError("请输入新的专用密钥")
        admin_key = self._clean(config.auth_key)
        if admin_key and hmac.compare_digest(candidate, admin_key):
            raise ValueError("这个密钥和管理员密钥冲突了，请换一个新的密钥")
        key_hash = _hash_key(candidate)
        if self._has_key_hash_locked(key_hash, exclude_id=exclude_id):
            raise ValueError("这个专用密钥已经存在，请换一个新的密钥")
        return key_hash

    def _has_name_locked(self, name: str, *, role: AuthRole | None = None, exclude_id: str = "") -> bool:
        candidate = self._clean(name)
        if not candidate:
            return False
        for item in self._items:
            item_id = self._clean(item.get("id"))
            if exclude_id and item_id == exclude_id:
                continue
            if role is not None and item.get("role") != role:
                continue
            if self._clean(item.get("name")) == candidate:
                return True
        return False

    def _build_default_name_locked(self, role: AuthRole, *, exclude_id: str = "") -> str:
        base_name = self._default_name(role)
        if not self._has_name_locked(base_name, role=role, exclude_id=exclude_id):
            return base_name
        suffix = 2
        while True:
            candidate = f"{base_name} {suffix}"
            if not self._has_name_locked(candidate, role=role, exclude_id=exclude_id):
                return candidate
            suffix += 1

    def _build_name_locked(self, name: str, *, role: AuthRole, exclude_id: str = "") -> str:
        candidate = self._clean(name)
        if not candidate:
            return self._build_default_name_locked(role, exclude_id=exclude_id)
        if self._has_name_locked(candidate, role=role, exclude_id=exclude_id):
            raise ValueError("这个名称已经在使用中了，换一个更容易区分的名称吧")
        return candidate

    def create_key(
        self,
        *,
        role: AuthRole,
        name: str = "",
        generate_remaining: int | None = None,
        edit_remaining: int | None = None,
        max_running_tasks: int | None = None,
    ) -> tuple[dict[str, object], str]:
        with self._lock:
            self._reload_locked()
            normalized_name = self._build_name_locked(name, role=role)
            while True:
                raw_key = f"sk-{secrets.token_urlsafe(24)}"
                try:
                    key_hash = self._build_key_hash_locked(raw_key)
                    break
                except ValueError:
                    continue
            item = {
                "id": uuid.uuid4().hex[:12],
                "name": normalized_name,
                "role": role,
                "key_hash": key_hash,
                "enabled": True,
                "created_at": _now_iso(),
                "last_used_at": None,
                "generate_remaining": self._normalize_quota(generate_remaining),
                "edit_remaining": self._normalize_quota(edit_remaining),
                "max_running_tasks": self._normalize_quota(max_running_tasks),
                "generate_used": 0,
                "edit_used": 0,
            }
            self._items.append(item)
            self._save()
            return self._public_item(item), raw_key

    def update_key(
        self,
        key_id: str,
        updates: dict[str, object],
        *,
        role: AuthRole | None = None,
    ) -> dict[str, object] | None:
        normalized_id = self._clean(key_id)
        if not normalized_id:
            return None
        with self._lock:
            self._reload_locked()
            for index, item in enumerate(self._items):
                if item.get("id") != normalized_id:
                    continue
                if role is not None and item.get("role") != role:
                    return None
                next_item = dict(item)
                next_role = "admin" if str(next_item.get("role") or "").strip().lower() == "admin" else "user"
                if "name" in updates and updates.get("name") is not None:
                    next_item["name"] = self._build_name_locked(
                        str(updates.get("name") or ""),
                        role=next_role,
                        exclude_id=normalized_id,
                    )
                if "enabled" in updates and updates.get("enabled") is not None:
                    next_item["enabled"] = bool(updates.get("enabled"))
                if "key" in updates and updates.get("key") is not None:
                    next_item["key_hash"] = self._build_key_hash_locked(str(updates.get("key") or ""), exclude_id=normalized_id)
                if "generate_remaining" in updates:
                    next_item["generate_remaining"] = self._normalize_quota(updates.get("generate_remaining"))
                if "edit_remaining" in updates:
                    next_item["edit_remaining"] = self._normalize_quota(updates.get("edit_remaining"))
                if "max_running_tasks" in updates:
                    next_item["max_running_tasks"] = self._normalize_quota(updates.get("max_running_tasks"))
                if "generate_used" in updates:
                    next_item["generate_used"] = self._normalize_counter(updates.get("generate_used"))
                if "edit_used" in updates:
                    next_item["edit_used"] = self._normalize_counter(updates.get("edit_used"))
                self._items[index] = next_item
                self._save()
                return self._public_item(next_item)
        return None

    def delete_key(self, key_id: str, *, role: AuthRole | None = None) -> bool:
        normalized_id = self._clean(key_id)
        if not normalized_id:
            return False
        with self._lock:
            self._reload_locked()
            before = len(self._items)
            self._items = [
                item
                for item in self._items
                if not (item.get("id") == normalized_id and (role is None or item.get("role") == role))
            ]
            if len(self._items) == before:
                return False
            self._save()
            return True

    def authenticate(self, raw_key: str) -> dict[str, object] | None:
        candidate = self._clean(raw_key)
        if not candidate:
            return None
        candidate_hash = _hash_key(candidate)
        with self._lock:
            for index, item in enumerate(self._items):
                if not bool(item.get("enabled", True)):
                    continue
                stored_hash = self._clean(item.get("key_hash"))
                if not stored_hash or not hmac.compare_digest(stored_hash, candidate_hash):
                    continue
                next_item = dict(item)
                now = datetime.now(timezone.utc)
                next_item["last_used_at"] = now.isoformat()
                self._items[index] = next_item
                item_id = self._clean(next_item.get("id"))
                last_flush_at = self._last_used_flush_at.get(item_id)
                if last_flush_at is None or (now - last_flush_at).total_seconds() >= 60:
                    try:
                        self._save()
                        self._last_used_flush_at[item_id] = now
                    except Exception:
                        pass
                return self._public_item(next_item)
        return None

    def reserve_image_quota(
        self,
        identity: dict[str, object],
        quota_type: Literal["generate", "edit"],
        amount: int = 1,
    ) -> dict[str, object] | None:
        if identity.get("role") != "user":
            return None
        key_id = self._clean(identity.get("id"))
        if not key_id:
            return None
        requested = max(1, int(amount or 1))
        remaining_field, used_field = self._quota_field_names(quota_type)
        with self._lock:
            index = self._find_item_index_by_id(key_id)
            if index < 0:
                return None
            next_item = dict(self._items[index])
            remaining_value = next_item.get(remaining_field)
            deducted = 0
            if remaining_value is not None:
                remaining = self._normalize_counter(remaining_value)
                if remaining < requested:
                    raise UserKeyQuotaExceededError(quota_type, remaining, requested)
                next_item[remaining_field] = remaining - requested
                deducted = requested
                self._items[index] = next_item
                self._save()
            return {
                "key_id": key_id,
                "quota_type": quota_type,
                "remaining_field": remaining_field,
                "used_field": used_field,
                "amount": requested,
                "deducted": deducted,
            }

    def reserve_running_task(self, identity: dict[str, object]) -> dict[str, object] | None:
        if identity.get("role") != "user":
            return None
        key_id = self._clean(identity.get("id"))
        if not key_id:
            return None
        with self._lock:
            index = self._find_item_index_by_id(key_id)
            if index < 0:
                return None
            item = self._items[index]
            if item.get("role") != "user" or not bool(item.get("enabled", True)):
                raise RuntimeError("user key is invalid or disabled")
            running = self._normalize_counter(self._active_task_counts.get(key_id))
            maximum = self._normalize_quota(item.get("max_running_tasks"))
            if maximum is not None and running >= maximum:
                raise UserKeyTaskLimitExceededError(running, maximum)
            self._active_task_counts[key_id] = running + 1
            return {"key_id": key_id}

    def release_running_task(self, reservation: dict[str, object] | None) -> None:
        if not reservation:
            return
        key_id = self._clean(reservation.get("key_id"))
        if not key_id:
            return
        with self._lock:
            running = self._normalize_counter(self._active_task_counts.get(key_id))
            if running <= 1:
                self._active_task_counts.pop(key_id, None)
            else:
                self._active_task_counts[key_id] = running - 1

    def commit_image_quota(self, reservation: dict[str, object] | None) -> None:
        if not reservation:
            return
        key_id = self._clean(reservation.get("key_id"))
        used_field = self._clean(reservation.get("used_field"))
        amount = self._normalize_counter(reservation.get("amount"))
        if not key_id or not used_field or amount <= 0:
            return
        with self._lock:
            index = self._find_item_index_by_id(key_id)
            if index < 0:
                return
            next_item = dict(self._items[index])
            next_item[used_field] = self._normalize_counter(next_item.get(used_field)) + amount
            self._items[index] = next_item
            self._save()

    def refund_image_quota(self, reservation: dict[str, object] | None) -> None:
        if not reservation:
            return
        key_id = self._clean(reservation.get("key_id"))
        remaining_field = self._clean(reservation.get("remaining_field"))
        deducted = self._normalize_counter(reservation.get("deducted"))
        if not key_id or not remaining_field or deducted <= 0:
            return
        with self._lock:
            index = self._find_item_index_by_id(key_id)
            if index < 0:
                return
            next_item = dict(self._items[index])
            remaining = self._normalize_quota(next_item.get(remaining_field))
            next_item[remaining_field] = deducted if remaining is None else remaining + deducted
            self._items[index] = next_item
            self._save()

    def is_identity_active(self, identity: dict[str, object]) -> bool:
        role = self._clean(identity.get("role")).lower()
        if role == "admin":
            return True
        if role != "user":
            return False
        key_id = self._clean(identity.get("id"))
        if not key_id:
            return False
        with self._lock:
            index = self._find_item_index_by_id(key_id)
            if index < 0:
                return False
            item = self._items[index]
            return item.get("role") == "user" and bool(item.get("enabled", True))


auth_service = AuthService(config.get_storage_backend())
