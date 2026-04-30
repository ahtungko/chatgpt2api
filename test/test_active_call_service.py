from __future__ import annotations

import asyncio
import threading
import unittest

from fastapi.responses import JSONResponse

from services.log_service import LoggedCall, active_call_service


def cleanup_active_calls() -> None:
    for item in active_call_service.list_running():
        active_call_service.finish(str(item.get("id") or ""))


class ActiveCallServiceTests(unittest.TestCase):
    def setUp(self):
        cleanup_active_calls()

    def tearDown(self):
        cleanup_active_calls()

    def test_logged_call_is_visible_while_running(self):
        release = threading.Event()

        def handler(_payload):
            release.wait(timeout=2)
            return {"data": [{"url": "http://example.test/image.png"}]}

        async def run_case():
            call = LoggedCall(
                {"id": "admin", "name": "Admin", "role": "admin"},
                "/v1/images/generations",
                "gpt-image-2",
                "image",
            )
            running = asyncio.create_task(call.run(handler, {"prompt": "cat", "size": "1024x1024"}))
            try:
                for _ in range(50):
                    items = active_call_service.list_running()
                    if items:
                        break
                    await asyncio.sleep(0.02)
                else:
                    self.fail("active call was not registered")

                item = active_call_service.list_running()[0]
                self.assertEqual(item["status"], "running")
                self.assertEqual(item["mode"], "generate")
                self.assertEqual(item["model"], "gpt-image-2")
                self.assertEqual(item["size"], "1024x1024")
                self.assertEqual(item["prompt_preview"], "cat")
            finally:
                release.set()
                await running

            self.assertEqual(active_call_service.list_running(), [])

        asyncio.run(run_case())

    def test_image_call_without_image_data_is_not_logged_as_success(self):
        async def run_case():
            call = LoggedCall(
                {"id": "user-1", "name": "Browser", "role": "user"},
                "/v1/images/edits",
                "gpt-image-2",
                "image",
            )
            result = await call.run(lambda _payload: {"created": 1, "data": [], "message": "image api returned no image data"}, {"prompt": "cat"})

            self.assertIsInstance(result, JSONResponse)
            self.assertEqual(result.status_code, 502)
            self.assertEqual(active_call_service.list_running(), [])

        asyncio.run(run_case())


if __name__ == "__main__":
    unittest.main()
