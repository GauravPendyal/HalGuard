# HalluciGuard web application

The canonical web application combines the public GSAP/Lenis experience from
`HalluciGuard-Front` with the authenticated workspace from `ChatUI`. The donor
ChatUI simulation and browser API-key setting are intentionally not included.

## Runtime boundary

The browser calls same-origin Next.js route handlers. Those handlers proxy to
the FastAPI service using `BACKEND_URL`; no OpenRouter, retrieval, OAuth-secret,
or JWT-signing credential is included in the client bundle.

The real verification path is:

`OpenRouter → Detector → Verifier → Judge → Corrector → Re-verifier → Judge → Memory`

Correction is conditional on the first Judge decision. Every terminal outcome
crosses the Memory boundary for an auditable trace, but Memory persists only
Judge-accepted verified facts.

## Local development

```bash
npm install
npm run dev
```

With no `BACKEND_URL`, local route handlers use `http://127.0.0.1:8000`.

## Frontend environment

| Variable | Purpose |
| --- | --- |
| `BACKEND_URL` | Server-only FastAPI origin. Production defaults to the current Render service and may be overridden. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Public Google Identity Services web client ID. |
| `NEXT_PUBLIC_API_TIMEOUT_MS` | Browser verification timeout; defaults to 120 seconds. |

`OPENROUTER_API_KEY`, `JWT_SECRET`, and retrieval credentials belong only on
the backend deployment.

## Verification

```bash
npm run build
```

The build performs Next.js compilation and TypeScript checking. The `/verify`,
`/health`, `/auth/*`, and `/api/history` handlers contain no fallback data; an
unavailable backend produces an explicit 502/503 response.
