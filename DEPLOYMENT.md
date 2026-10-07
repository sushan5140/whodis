# Deployment

## Frontend
The static frontend is linked to Vercel from the `main` branch.

## Face backend
The repository includes a Render Blueprint at `render.yaml`.

The service uses:
- Docker runtime
- Singapore region
- `backend/Dockerfile`
- `/health` health check
- automatic deploys from `main`
- explicit CORS access for the whodis Vercel frontend

The backend can run with local JSON persistence if no Supabase variables are configured. For durable production persistence, provide `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from a dedicated whodis project.

Never expose `SUPABASE_SERVICE_ROLE_KEY` in the browser.

## After backend provisioning
Update the frontend Face API setting to the HTTPS URL returned by Render. The browser camera requires a secure context in production.
