from __future__ import annotations

import os
import tempfile
from typing import Any

import numpy as np
from deepface import DeepFace
from deepface.modules import verification
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from storage import build_store

MODEL_NAME = os.getenv("WHODIS_FACE_MODEL", "ArcFace")
DETECTOR_BACKEND = os.getenv("WHODIS_DETECTOR", "retinaface")
DISTANCE_METRIC = os.getenv("WHODIS_DISTANCE_METRIC", "cosine")
store = build_store()

app = FastAPI(title="whodis face service", version="0.3.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv("WHODIS_CORS_ORIGINS", "http://localhost:8080").split(",") if origin.strip()],
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def _public_profile(record: dict[str, Any]) -> dict[str, Any]:
    attendee_id = record["attendee_id"]
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

    embedding = reps[0].get("embedding")
    if not embedding:
        raise HTTPException(status_code=422, detail="No face embedding produced.")
    return [float(x) for x in embedding]


def _vector(value: Any) -> list[float]:
    if isinstance(value, list):
        return [float(x) for x in value]
    if isinstance(value, str):
        stripped = value.strip().strip("[]")
        return [float(x) for x in stripped.split(",") if x.strip()]
    raise ValueError("Unsupported embedding format")


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
        "api_version": "0.3.0",
        "storage": store.kind,
    }


@app.get("/events/{event_id}/attendees")
def list_attendees(event_id: str) -> dict[str, Any]:
    profiles = [_public_profile(row) for row in store.list_event(event_id) if row.get("consent")]
    return {"event_id": event_id, "count": len(profiles), "attendees": profiles}


@app.get("/events/{event_id}/attendees/{attendee_id}")
def get_attendee(event_id: str, attendee_id: str) -> dict[str, Any]:
    record = store.get_attendee(event_id, attendee_id)
    if not record or not record.get("consent"):
        raise HTTPException(status_code=404, detail="Attendee not found in this event.")
    return {"event_id": event_id, "profile": _public_profile(record)}


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

    record = store.upsert_attendee(
        event_id,
        attendee_id,
        {
            "display_name": display_name.strip() or attendee_id,
            "role": role.strip() or "Event attendee",
            "org": org.strip() or "whodis event",
            "initials": initials.strip()[:4] or "?",
            "interests": _split_csv(interests),
            "goals": _split_csv(goals),
            "projects": _split_csv(projects),
            "links": _split_csv(links) or ["Event profile"],
            "embedding": _embedding_from_bytes(raw),
            "consent": True,
        },
    )

    return {"ok": True, "event_id": event_id, "profile": _public_profile(record)}


@app.delete("/events/{event_id}/attendees/{attendee_id}")
def revoke(event_id: str, attendee_id: str) -> dict[str, Any]:
    return {"ok": True, "removed": store.delete_attendee(event_id, attendee_id)}


@app.post("/events/{event_id}/match")
async def match(event_id: str, photo: UploadFile = File(...)) -> dict[str, Any]:
    rows = store.list_event(event_id)
    if not rows:
        raise HTTPException(status_code=404, detail="No opted-in attendees enrolled for this event.")

    raw = await photo.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty image upload.")

    probe = _embedding_from_bytes(raw)
    ranked: list[tuple[float, dict[str, Any]]] = []

    for record in rows:
        if not record.get("consent") or not record.get("embedding"):
            continue
        ranked.append((_cosine_distance(probe, _vector(record["embedding"])), record))

    if not ranked:
        raise HTTPException(status_code=404, detail="No consented attendees available.")

    ranked.sort(key=lambda row: row[0])
    distance, record = ranked[0]
    threshold = _threshold()
    matched = distance <= threshold

    return {
        "matched": matched,
        "event_id": event_id,
        "profile": _public_profile(record) if matched else None,
        "distance": round(distance, 6),
        "threshold": threshold,
        "candidate_count": len(ranked),
        "note": "A face match is probabilistic and must not be treated as proof of identity.",
    }
