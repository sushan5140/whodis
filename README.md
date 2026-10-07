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
