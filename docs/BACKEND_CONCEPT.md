# Sightread backend — concept plan

Local-only proof of concept (`concept-backend/`). **Not wired into production clients and not pushed to GitHub.**

## Problem

Today every Sightread client (web, iOS, Android) calls Gemini / OpenAI / Groq directly with user-supplied API keys. That works for privacy and speed, but blocks:

- Hiding provider keys from end users
- Usage limits and cost control
- Cross-device conversation sync
- Centralized logging and abuse prevention

## Concept goals

| Goal | In concept? | Notes |
|------|-------------|-------|
| Proxy chat + vision to providers | Yes | Server holds `GROQ_API_KEY`, etc. |
| Device token auth | Yes | Single shared token for POC |
| Conversation sync API | Yes | SQLite on disk |
| Accounts / OAuth | No | Deferred |
| Billing / Stripe | No | Deferred |
| Production hardening | No | No TLS termination, WAF, etc. |

## Architecture

```
┌─────────────┐     Bearer token      ┌──────────────────────┐
│ Web / iOS / │ ────────────────────► │ concept-backend      │
│ Android     │     JSON over HTTP    │ (Hono + SQLite)      │
└─────────────┘                       └──────────┬───────────┘
                                                 │
                    ┌────────────────────────────┼────────────────────────────┐
                    ▼                            ▼                            ▼
              Groq API                     Gemini API                    OpenAI API
```

### API surface (v1 concept)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Liveness (no auth) |
| `GET` | `/v1/meta` | Full route catalog + feature flags |
| `GET` | `/v1/providers` | Server-configured providers |
| `POST` | `/v1/providers` | Server + client BYOK availability |
| `POST` | `/v1/chat`, `/v1/ai/chat` | Multi-turn chat, optional image |
| `POST` | `/v1/vision`, `/v1/ai/vision` | Single-frame analysis |
| `GET` | `/v1/prompts/presets` | List prompt presets |
| `POST` | `/v1/prompts/resolve` | Smart/manual prompt resolution |
| `GET` | `/v1/conversations` | List synced threads |
| `POST` | `/v1/conversations` | Create thread |
| `DELETE` | `/v1/conversations/:id` | Delete thread |
| `GET` | `/v1/conversations/:id/messages` | Load messages |
| `POST` | `/v1/conversations/:id/messages` | Append message |

Auth: `Authorization: Bearer <SIGHTREAD_CONCEPT_TOKEN>` on all `/v1/*` routes.

**Provider keys:** Server `.env` keys are preferred. Requests may also include:

```json
{
  "apiKeys": {
    "groq": "gsk_…",
    "gemini": "…",
    "openai": "sk-…"
  }
}
```

This enables BYOK-through-proxy when the server lacks a provider key.

### Web routing modes

| Mode | Behavior |
|------|----------|
| `local` | Direct browser → provider (default without `.env.local`) |
| `backend` | All AI via concept server |
| `auto` | Backend first; falls back to local keys on failure |

### Data model (SQLite)

- `conversations` — id, title, created_at, updated_at
- `messages` — id, conversation_id, role, text, image_path (optional), created_at

Images stored as files under `concept-backend/data/images/` (not in DB blobs).

### Client migration path (future)

1. Add `backendUrl` + `deviceToken` to Settings (optional mode: “Use Sightread cloud”).
2. New `createBackendChatService()` / `createBackendVisionService()` calling `/v1/*`.
3. `useConversationSession` can sync to server when backend mode is on.
4. Glasses apps keep direct provider path as fallback for latency-sensitive streams.

## What production would add

- Real auth (JWT, refresh tokens, per-user API keys)
- Postgres + S3 instead of SQLite + local files
- Rate limits per user/plan
- Request size caps and image compression at edge
- Audit logs, GDPR delete, encryption at rest
- Deploy (Fly.io, Railway, AWS) with secrets manager

## Run locally

```bash
cd concept-backend
cp .env.example .env   # add GROQ_API_KEY and SIGHTREAD_CONCEPT_TOKEN
npm install
npm run dev
curl http://localhost:8787/health
```

See `concept-backend/README.md` for curl examples and client integration sketch.
