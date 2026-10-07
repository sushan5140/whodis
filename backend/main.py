from __future__ import annotations

import json
import os
import tempfile
import threading
from pathlib import Path
from typing import Any

import numpy as np
from deepface import DeepFace
from deepface.modules import verification
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

MODEL_NAME = os.getenv("WHODIS_FACE_MODEL", "ArcFace")
DETECTOR_BACKEND = os.getenv("WHODIS_DETECTOR", "retinaface")
DISTANCE_METRIC = os.getenv("WHODIS_DISTANCE_METRIC", "cosine")
DATA_FILE = Path(os.getenv("WHODIS_FACE_DB", "data/enrollments.json"))

app = FastAPI(title="whodis face service", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv("WHODIS_CORS_ORIGINS", "http://localhost:8080").split(",") if origin.strip()],
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)

_lock = threading.Lock()
DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
if not DATA_FILE.exists():
    DATA_FILE.write_text("{}", encoding="utf-8")


def _read_db() -> dict[str, Any]:
    with _lock:
        try:
            return json.loads(DATA_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as exc:
            raise RuntimeError("Face enrollment store is unreadable") from exc


def _write_db(db: dict[str, Any]) -> None:
    with _lock:
        tmp = DATA_FILE.with_suffix(".tmp")
        tmp.write_text(json.dumps(db, separators=(",", ":")), encoding="utf-8")
        tmp.replace(DATA_FILE)


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def _public_profile(attendee_id: str, record: dict[str, Any]) -> dict[str, Any]:
    return {
        "attendee_id": attendee_id,
        "code": attendee_id,
        "name": record.get("display_name", attendee_id),
        "initials": record.get("initials", "?"),
        "role": record.get("role", "Event attendee"),
        "org": record.get("org", "whodis event"),
        "interests": record.get("interests", []),
        "goals": record.get("goals", []),
        "projects": record.get("projects", []),
        "links": record.get("links", ["Event profile"]),
    }


def _embedding_from_bytes(raw: bytes) -> list[float]:
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=True) as f:
        f.write(raw)
        f.flush()
        try:
            reps = DeepFace.represent(
                img_path=f.name,
                model_name=MODEL_NAME,
                detector_backend=DETECTOR_BACKEND,
                enforce_detection=True,
                align=True,
            )
        except Exception as exc:
            raise HTTPException(status_code=422, detail=f"Could not extract a clear face: {exc}") from exc

    if len(reps) != 1:
        raise HTTPException(status_code=422, detail="Enrollment/match image must contain exactly one detectable face.")

    emb = reps[0].get("embedding")
    if not emb:
        raise HTTPException(status_code=422, detail="No face embedding produced.")
    return [float(x) for x in emb]


def _cosine_distance(a: list[float], b: list[float]) -> float:
    av = np.asarray(a, dtype=np.float32)
    bv = np.asarray(b, dtype=np.float32)
    denom = float(np.linalg.norm(av) * np.linalg.norm(bv))
    if denom == 0:
        return 1.0
    return float(1.0 - np.dot(av, bv) / denom)


def _threshold() -> float:
    override = os.getenv("WHODIS_MATCH_THRESHOLD")
    if override:
        return float(override)
    try:
        return float(verification.find_threshold(MODEL_NAME, DISTANCE_METRIC))
    except Exception:
        return 0.68


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "model": MODEL_NAME,
        "detector": DETECTOR_BACKEND,
        "metric": DISTANCE_METRIC,
        "threshold": _threshold(),
        "api_version": "0.2.0",
    }


@app.get("/events/{event_id}/attendees")
def list_attendees(event_id: str) -> dict[str, Any]:
    db = _read_db()
    people = db.get(event_id, {})
    profiles = [
        _public_profile(attendee_id, record)
        for attendee_id, record in people.items()
        if record.get("consent")
    ]
    return {"event_id": event_id, "count": len(profiles), "attendees": profiles}


@app.get("/events/{event_id}/attendees/{attendee_id}")
def get_attendee(event_id: str, attendee_id: str) -> dict[str, Any]:
    db = _read_db()
    record = db.get(event_id, {}).get(attendee_id)
    if not record or not record.get("consent"):
        raise HTTPException(status_code=404, detail="Attendee not found in this event.")
    return {"event_id": event_id, "profile": _public_profile(attendee_id, record)}


@app.post("/events/{event_id}/enroll")
async def enroll(
    event_id: str,
    attendee_id: str = Form(...),
    display_name: str = Form(...),
    role: str = Form("Event attendee"),
    org: str = Form("whodis event"),
    initials: str = Form("?"),
    interests: str = Form(""),
    goals: str = Form(""),
    projects: str = Form(""),
    links: str = Form("Event profile"),
    consent: bool = Form(...),
    photo: UploadFile = File(...),
) -> dict[str, Any]:
    if not consent:
        raise HTTPException(status_code=400, detail="Explicit attendee consent is required.")

    raw = await photo.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty image upload.")

    embedding = _embedding_from_bytes(raw)
    db = _read_db()
    event = db.setdefault(event_id, {})
    record = {
        "display_name": display_name.strip() or attendee_id,
        "role": role.strip() or "Event attendee",
        "org": org.strip() or "whodis event",
        "initials": initials.strip()[:4] or "?",
        "interests": _split_csv(interests),
        "goals": _split_csv(goals),
        "projects": _split_csv(projects),
        "links": _split_csv(links) or ["Event profile"],
        "embedding": embedding,
        "consent": True,
    }
    event[attendee_id] = record
    _write_db(db)

    return {
        "ok": True,
        "event_id": event_id,
        "profile": _public_profile(attendee_id, record),
    }


@app.delete("/events/{event_id}/attendees/{attendee_id}")
def revoke(event_id: str, attendee_id: str) -> dict[str, Any]:
    db = _read_db()
    event = db.get(event_id, {})
    existed = attendee_id in event
    event.pop(attendee_id, None)
    if not event and event_id in db:
        db.pop(event_id, None)
    _write_db(db)
    return {"ok": True, "removed": existed}


@app.post("/events/{event_id}/match")
async def match(event_id: str, photo: UploadFile = File(...)) -> dict[str, Any]:
    db = _read_db()
    event = db.get(event_id, {})
    if not event:
        raise HTTPException(status_code=404, detail="No opted-in attendees enrolled for this event.")

    raw = await photo.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty image upload.")

    probe = _embedding_from_bytes(raw)
    ranked: list[tuple[str, float, dict[str, Any]]] = []

    for attendee_id, record in event.items():
        if not record.get("consent"):
            continue
        embedding = record.get("embedding")
        if not embedding:
            continue
        ranked.append((attendee_id, _cosine_distance(probe, embedding), record))

    if not ranked:
        raise HTTPException(status_code=404, detail="No consented attendees available.")

    ranked.sort(key=lambda row: row[1])
    attendee_id, distance, record = ranked[0]
    threshold = _threshold()
    matched = distance <= threshold

    return {
        "matched": matched,
        "event_id": event_id,
        "profile": _public_profile(attendee_id, record) if matched else None,
        "distance": round(distance, 6),
        "threshold": threshold,
        "candidate_count": len(ranked),
        "note": "A face match is probabilistic and must not be treated as proof of identity.",
    }
