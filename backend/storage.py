from __future__ import annotations

import json
import os
import threading
from pathlib import Path
from typing import Any, Protocol

from supabase import Client, create_client


class Store(Protocol):
    kind: str

    def list_event(self, event_id: str) -> list[dict[str, Any]]: ...
    def get_attendee(self, event_id: str, attendee_id: str) -> dict[str, Any] | None: ...
    def upsert_attendee(self, event_id: str, attendee_id: str, record: dict[str, Any]) -> dict[str, Any]: ...
    def delete_attendee(self, event_id: str, attendee_id: str) -> bool: ...


class JsonStore:
    kind = "json"

    def __init__(self, path: str) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.lock = threading.Lock()
        if not self.path.exists():
            self.path.write_text("{}", encoding="utf-8")

    def _read(self) -> dict[str, Any]:
        with self.lock:
            return json.loads(self.path.read_text(encoding="utf-8"))

    def _write(self, db: dict[str, Any]) -> None:
        with self.lock:
            tmp = self.path.with_suffix(".tmp")
            tmp.write_text(json.dumps(db, separators=(",", ":")), encoding="utf-8")
            tmp.replace(self.path)

    def list_event(self, event_id: str) -> list[dict[str, Any]]:
        db = self._read()
        return [
            {"attendee_id": attendee_id, **record}
            for attendee_id, record in db.get(event_id, {}).items()
            if record.get("consent")
        ]

    def get_attendee(self, event_id: str, attendee_id: str) -> dict[str, Any] | None:
        record = self._read().get(event_id, {}).get(attendee_id)
        return {"attendee_id": attendee_id, **record} if record else None

    def upsert_attendee(self, event_id: str, attendee_id: str, record: dict[str, Any]) -> dict[str, Any]:
        db = self._read()
        event = db.setdefault(event_id, {})
        event[attendee_id] = record
        self._write(db)
        return {"attendee_id": attendee_id, **record}

    def delete_attendee(self, event_id: str, attendee_id: str) -> bool:
        db = self._read()
        event = db.get(event_id, {})
        existed = attendee_id in event
        event.pop(attendee_id, None)
        if not event:
            db.pop(event_id, None)
        self._write(db)
        return existed


class SupabaseStore:
    kind = "supabase"

    def __init__(self, url: str, service_key: str) -> None:
        self.client: Client = create_client(url, service_key)
        self.table = "whodis_attendees"

    def list_event(self, event_id: str) -> list[dict[str, Any]]:
        response = (
            self.client.table(self.table)
            .select("*")
            .eq("event_id", event_id)
            .eq("consent", True)
            .execute()
        )
        return response.data or []

    def get_attendee(self, event_id: str, attendee_id: str) -> dict[str, Any] | None:
        response = (
            self.client.table(self.table)
            .select("*")
            .eq("event_id", event_id)
            .eq("attendee_id", attendee_id)
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None

    def upsert_attendee(self, event_id: str, attendee_id: str, record: dict[str, Any]) -> dict[str, Any]:
        payload = {"event_id": event_id, "attendee_id": attendee_id, **record}
        response = (
            self.client.table(self.table)
            .upsert(payload, on_conflict="event_id,attendee_id")
            .select("*")
            .execute()
        )
        if not response.data:
            raise RuntimeError("Supabase attendee upsert returned no row")
        return response.data[0]

    def delete_attendee(self, event_id: str, attendee_id: str) -> bool:
        response = (
            self.client.table(self.table)
            .delete()
            .eq("event_id", event_id)
            .eq("attendee_id", attendee_id)
            .select("attendee_id")
            .execute()
        )
        return bool(response.data)


def build_store() -> Store:
    url = os.getenv("SUPABASE_URL", "").strip()
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if url and service_key:
        return SupabaseStore(url, service_key)

    return JsonStore(os.getenv("WHODIS_FACE_DB", "data/enrollments.json"))
