# HalluciGuard deployment

## Topology

- Vercel builds `frontend-v2` using the repository-root `vercel.json`.
- Next.js proxies authentication, verification, health, and history to FastAPI.
- Render starts `orchestration.api:app` from the repository-root `render.yaml`.
- Render mounts `/var/data` so accounts and verification history survive deploys.
- OpenRouter and every model credential remain server-side.
- n8n retrieval is paused (`N8N_RETRIEVAL_ENABLED=false`); the Verifier uses its
  Python retrieval adapters.

## Required Render secrets

```env
OPENROUTER_API_KEY=<secret>
JWT_SECRET=<at-least-32-random-characters>
```

The blueprint supplies the public Google client ID and all non-secret defaults.
If a different Google OAuth credential is used, change both
`GOOGLE_CLIENT_ID` on Render and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` on Vercel.

## Optional Vercel override

```env
BACKEND_URL=https://your-fastapi-service.example.com
```

The code defaults to the existing public Render service. Set this variable when
the backend origin changes.

## Local run

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export OPENROUTER_API_KEY=<secret>
export JWT_SECRET=<at-least-32-random-characters>
uvicorn orchestration.api:app --host 0.0.0.0 --port 8000 --reload
```

In another terminal:

```bash
cd frontend-v2
npm install
npm run dev
```

## Release checks

```bash
python -m compileall -q orchestration services agents
pytest orchestration/tests agents/*/tests
cd frontend-v2 && npm ci && npm run build
curl -fsS https://halluciguard-api-okvo.onrender.com/health?deep=true
```

Deep health is ready only when OpenRouter, Detector, Verifier, Judge, Corrector,
Re-verifier, and Memory checks are healthy. A missing model/key is reported as
degraded; the API must never substitute a fake successful result.
