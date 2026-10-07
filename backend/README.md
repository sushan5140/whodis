# whodis face service

Event-scoped, opt-in face matching plus shared networking profiles for whodis.

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
- `role`
- `org`
- `initials`
- `interests` (comma-separated)
- `goals` (comma-separated)
- `projects` (comma-separated)
- `links` (comma-separated)
- `consent=true`
- `photo`

Enrollment stores the face embedding and the attendee's public event profile together.

### Match
`POST /events/{event_id}/match` with multipart `photo`

A confident match returns the full public networking profile, so the frontend works across devices without localStorage profile lookup.

### List directory
`GET /events/{event_id}/attendees`

Returns full public profiles for consented attendees in the event.

### Get attendee
`GET /events/{event_id}/attendees/{attendee_id}`

### Revoke
`DELETE /events/{event_id}/attendees/{attendee_id}`

Deletes both the event profile and its stored embedding.

## Notes
- Default recognition model: ArcFace through DeepFace.
- Default detector: RetinaFace.
- Threshold is sourced from DeepFace when available; set `WHODIS_MATCH_THRESHOLD` to tune it on your own consented event validation set.
- The JSON store is still prototype-only. Production should move this data to authenticated, encrypted storage with event permissions and durable revoke/audit controls.
- Before commercial deployment, verify the license terms of the exact pretrained weights you ship. Open-source wrapper code and pretrained model weights can have different licenses.

## Supabase storage

The backend automatically uses Supabase when both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present. Otherwise it falls back to the JSON store for local development.

1. Create a dedicated Supabase project for whodis.
2. Run `supabase/schema.sql` in that project.
3. Copy `backend/.env.example` to your local secret environment configuration.
4. Set the two Supabase variables on the backend deployment only.
5. Never put the service-role key in `index.html`, `app.js`, or any public environment variable.

The database table has RLS enabled and direct access is revoked from `anon` and `authenticated`; only the trusted backend service role can access raw face embeddings.
