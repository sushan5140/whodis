# whodis. — MVP

Privacy-first networking assistant for conferences and meetups.

## What works
- Opt-in attendee directory (demo data)
- Badge/QR scanning through the browser `BarcodeDetector` API when supported
- Manual badge-code fallback (`WD-MINJUN`, `WD-SORA`, etc.)
- Local user profile and preferences
- Shared-interest / shared-goal scoring
- Collaboration angle generation
- Contextual conversation opener generation
- Responsive desktop/mobile UI
- Local-only persistence via `localStorage`
- Modular next-move hub after an attendee match
- **Get In** master plan: direct, value, warm-path, timing, and relationship moves
- **Before I Say Hi** context-aware conversation prep
- **Door In** value-first contribution ideas
- **Six Degrees** warm-path planning from real public/shared context
- **Reply Window** transparent outreach-timing guidance
- **Met U** local-only relationship memory
- **Orbit** explicit local watchlist
- **Room Intel** public event-board triage
- **Who2Meet** top-3 pre-event shortlist

## Run
Serve this folder over localhost (camera access usually requires HTTPS or localhost):

```bash
python -m http.server 8080
```
Then open `http://localhost:8080`.

## Production architecture
1. Authentication + attendee consent
2. Event-scoped profiles
3. QR badge token per attendee
4. Backend profile store (Supabase/Postgres)
5. Embeddings for projects/interests
6. LLM-generated, source-grounded networking brief
7. Optional face matching only against an explicitly enrolled event directory
8. Audit log + revoke/disappear control

## Privacy rule
This prototype intentionally does not identify arbitrary people from covert photographs or scrape private identity data.

Networking actions are built around opted-in profile data, public event context, or information the user deliberately supplies. Warm-path features do not invent mutual connections, Orbit is explicit opt-in tracking by the user, and the current MVP does not pretend to have live public-activity monitoring when no connector is configured.
