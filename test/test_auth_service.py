from __future__ import annotations

import unittest
from typing import Any

from services.auth_service import AuthService, UserKeyTaskLimitExceededError
from services.storage.base import StorageBackend


class MemoryStorage(StorageBackend):
    def __init__(self):
        self.accounts: list[dict[str, Any]] = []
        self.auth_keys: list[dict[str, Any]] = []

    def load_accounts(self) -> list[dict[str, Any]]:
        return list(self.accounts)

    def save_accounts(self, accounts: list[dict[str, Any]]) -> None:
        self.accounts = list(accounts)

    def load_auth_keys(self) -> list[dict[str, Any]]:
        return list(self.auth_keys)

    def save_auth_keys(self, auth_keys: list[dict[str, Any]]) -> None:
        self.auth_keys = list(auth_keys)

    def health_check(self) -> dict[str, Any]:
        return {"ok": True}

    def get_backend_info(self) -> dict[str, Any]:
        return {"type": "memory"}


class AuthServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.storage = MemoryStorage()
        self.service = AuthService(self.storage)

    def test_create_key_exposes_max_running_tasks(self) -> None:
        item, _raw_key = self.service.create_key(role="user", name="Worker", max_running_tasks=2)

        self.assertEqual(item["max_running_tasks"], 2)
        self.assertEqual(self.service.list_keys(role="user")[0]["max_running_tasks"], 2)

    def test_running_task_limit_blocks_extra_reservation(self) -> None:
        item, _raw_key = self.service.create_key(role="user", name="Worker", max_running_tasks=1)
        identity = {"id": item["id"], "name": item["name"], "role": "user"}

        reservation = self.service.reserve_running_task(identity)
        self.assertIsNotNone(reservation)

        with self.assertRaises(UserKeyTaskLimitExceededError):
            self.service.reserve_running_task(identity)

        self.service.release_running_task(reservation)
        second = self.service.reserve_running_task(identity)
        self.assertIsNotNone(second)
        self.service.release_running_task(second)


if __name__ == "__main__":
    unittest.main()
