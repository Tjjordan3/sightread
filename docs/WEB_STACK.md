# Sightread — Web stack (web-first)

**Status:** Planned architecture  
**Direction:** Ship web app functionality first; add Ray-Ban Meta / DAT glasses integration later as a feature.

This document describes the recommended stack for a **backend proxy + web dashboard**. It is not a browser-based glasses streaming client — browsers cannot use Meta’s DAT SDK. Glasses remain a future mobile enhancement on top of the same API.

---

## Product shape

| Phase | Focus |
|-------|--------|
| **Now** | Web app: vision AI + chat, presets, session history; API keys held server-side |
| **Later** | Mobile clients + DAT SDK for hands-free capture and TTS/STT via glasses |

The web layer is the **control plane**: authentication, AI proxying, configuration, and history. Mobile/glasses clients become thin capture and playback surfaces that call the same API.

---

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Web app    │────▶│                  │────▶│  Gemini API     │
│  (dashboard)│     │   API server     │     │  OpenAI API     │
└─────────────┘     │                  │     └─────────────────┘
                    │  auth · limits   │
┌─────────────┐     │  presets · logs  │     ┌─────────────────┐
│  Mobile     │────▶│                  │────▶│  PostgreSQL     │
│  (later)    │     └──────────────────┘     │  Redis          │
└─────────────┘              │               └─────────────────┘
                             ▼
                      Secrets manager
                      (API keys, never on client)
```

**Request flow (v1):** Client uploads image and/or text → API authenticates user → server attaches provider API keys → forwards to Gemini or OpenAI → returns response and optionally logs session metadata.

---

## Stack

### API server

| Component | Choice | Notes |
|-----------|--------|--------|
| Runtime | **TypeScript (Node)** or **Python (FastAPI)** | Either works; pick based on team familiarity. JSON + HTTPS matches existing mobile patterns. |
| API style | **REST** | `POST` for vision analyze and chat; `GET`/`PUT` for presets and history. |
| Auth | **JWT** (access + refresh tokens) | Bearer tokens for web and future mobile. Short-lived access tokens; refresh stored securely. |
| Provider keys | **Environment / secrets manager** | Gemini and OpenAI keys live only on the server — not in client apps or repos. |
| Database | **PostgreSQL** | Users, presets, session metadata, usage counters. |
| Cache / rate limits | **Redis** | Per-user rate limiting, optional request deduplication. |

### Web dashboard

| Component | Choice | Notes |
|-----------|--------|--------|
| Framework | **Next.js** (App Router) | API routes can live alongside the UI if desired; good default for a full-stack web product. |
| Styling | **Tailwind CSS + shadcn/ui** | Fast settings pages, tables, and forms without a heavy design system. |
| Data fetching | **TanStack Query** | Loading, error, and cache states for dashboard reads. |
| Auth UI | **Clerk** or **Auth.js** | Speeds up sign-up, login, and session handling; can be replaced with custom auth on the API later. |

### Infrastructure

| Component | Choice | Notes |
|-----------|--------|--------|
| API hosting | **Fly.io**, **Railway**, or **Render** | Simple deploy for a stateless API + managed Postgres add-on. |
| Web hosting | **Vercel** | Natural fit for Next.js. |
| Secrets | Platform secret store | Rotate keys without redeploying client apps. |
| File storage | **S3-compatible** (optional, v1+) | Only if persisting frame thumbnails or chat attachments server-side. |

---

## API surface (v1)

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/v1/vision/analyze` | Image + prompt → model response |
| `POST` | `/v1/chat` | Text (+ optional image) → model response |
| `GET` | `/v1/presets` | List prompt presets |
| `PUT` | `/v1/presets/:id` | Create or update a preset |
| `GET` | `/v1/sessions` | Session / chat history for dashboard |

Auth, health check, and user profile endpoints sit alongside these as needed.

---

## What the web app does (v1)

- Sign in and manage account
- Run vision analysis and chat against the proxied API (upload image or paste/describe context)
- Edit and save prompt presets (scene, navigation, accessibility, etc.)
- View session and chat history
- See basic usage (request counts; billing can come later)

## What the web app does *not* do (v1)

- Stream live video from Ray-Ban Meta glasses (DAT SDK is mobile-only)
- Store user-pasted API keys on the client (keys stay on the server)
- Replace the need for a future mobile app when glasses support is added

---

## Deferred (not in current stack)

| Item | When |
|------|------|
| Stripe / subscriptions | When moving beyond personal or invite-only use |
| SSE streaming responses | Optional enhancement after REST v1 |
| Mobile apps calling the same API | When adding glasses capture and TTS/STT |
| Meta DAT SDK integration | Glasses feature phase — frame capture on device, AI via this API |

---

## Default stack (single recommendation)

If choosing one concrete stack without further debate:

**Next.js · FastAPI (or Hono) · PostgreSQL · Redis · Clerk · Fly.io + Vercel**

- **Next.js** — dashboard and marketing/docs if needed  
- **FastAPI** — AI proxy and business logic (or **Hono** if staying all-TypeScript)  
- **PostgreSQL** — durable data  
- **Redis** — rate limits  
- **Clerk** — auth UI and user management  
- **Fly.io** — API; **Vercel** — web  

---

## Relation to existing Sightread mobile code

The current iOS and Android apps call Gemini and OpenAI **directly from the device** with user-held API keys. A web-first product inverts that:

1. **Server** holds provider keys and proxies AI calls.  
2. **Web** is the primary interface for analysis, chat, and configuration.  
3. **Mobile + glasses** (later) upload frames and receive responses through the same API — reusing presets, history, and auth without duplicating AI integration.

Existing mobile code remains a useful reference for prompt presets, vision/chat payloads, and (eventually) DAT streaming — but the web API becomes the source of truth for new development.

---

*Last updated: June 2025*
