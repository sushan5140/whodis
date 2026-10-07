# whodis face service

Event-scoped, opt-in face matching for the whodis networking app.

## Privacy boundary

This service only compares a submitted face against people who explicitly enrolled in the same event directory. It is not a public-web identity search engine.

## Run locally

```bash
cd backend
python -m venv .venv
# Windows:
.venv\\Scripts\\activate
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The first ArcFace/RetinaFace run may download model weights.

## API

### Health
`GET /health`

### Enroll
`POST /events/{event_id}/enroll` as multipart form:
- `attendee_id`
- `display_name`
- `consent=true`
- `photo`

### Match
`POST /events/{event_id}/match` with multipart `photo`

### Revoke
`DELETE /events/{event_id}/attendees/{attendee_id}`

### List directory
`GET /events/{event_id}/attendees`

## Notes
- Default recognition model: ArcFace through DeepFace.
- Default detector: RetinaFace.
- Threshold is sourced from DeepFace when available; set `WHODIS_MATCH_THRESHOLD` to tune it on your own consented event validation set.
- The JSON store is deliberately simple for the prototype. Production should use authenticated event membership and a database with encrypted embeddings and deletion controls.
- Before any commercial deployment, verify the license terms of the exact pretrained weights you ship. Open-source wrapper code and pretrained model weights can have different licenses.
