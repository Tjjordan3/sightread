# Deploy Sightread to Cloudflare Pages

Sightread ships as a static Vite build with **Pages Functions** for server-side API proxies:

| Route | Purpose |
|-------|---------|
| `POST /api/nvidia/v1/chat/completions` | Proxies NVIDIA NIM (browser CORS workaround) |
| `GET /api/nvidia/v1/health` | Health check for NVIDIA proxy |
| `POST /api/search` | Serper web search (keeps `SERPER_API_KEY` off the client) |
| `GET /api/search` | Search proxy health / config status |

Everything else is static assets from `dist/`.

---

## Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/)
- Node.js 20+
- Git repo connected to Cloudflare Pages (or Wrangler CLI)

---

## One-time setup

### 1. Install dependencies

```bash
cd web/Sightread
npm install
```

### 2. Create the Pages project

**Dashboard:** Workers & Pages → Create → Pages → Connect to Git → select this repo.

Build settings:

| Setting | Value |
|---------|--------|
| Root directory | `web/Sightread` |
| Build command | `npm run build` |
| Build output directory | `dist` |

Cloudflare auto-detects the `functions/` folder and `wrangler.toml` in the project root.

### 3. Set the Serper secret

Web search requires a [Serper](https://serper.dev/) API key stored as a Pages secret:

```bash
cd web/Sightread
npx wrangler pages secret put SERPER_API_KEY --project-name=sightread
```

Paste your key when prompted. Repeat for **Preview** if you use preview deployments:

```bash
npx wrangler pages secret put SERPER_API_KEY --project-name=sightread --env preview
```

NVIDIA does **not** need a server secret — users supply their own NVIDIA API key in Settings; the function forwards it in the `Authorization` header.

---

## Deploy

### Git (recommended)

Push to your connected branch. Cloudflare builds and deploys automatically.

### CLI

```bash
cd web/Sightread
npm run pages:deploy
```

First run may prompt you to log in and select/create a project.

---

## Local development

### Frontend only (Vite)

```bash
npm run dev
```

- NVIDIA: proxied directly to `integrate.api.nvidia.com` via Vite.
- Search: requires the local Node proxy (`npm run search-proxy` with `SERPER_API_KEY` set).

### Full stack with Cloudflare Functions

```bash
npm run pages:dev
```

Builds the app and runs `wrangler pages dev dist`, so `/api/*` routes behave like production. Set secrets locally in `.dev.vars`:

```
SERPER_API_KEY=your_key_here
```

`.dev.vars` is gitignored — never commit it.

---

## Verify after deploy

1. Open `https://<your-project>.pages.dev`
2. **Settings → NVIDIA → Test NVIDIA connection** (needs your NVIDIA API key in Settings)
3. In Agent chat, ask something that triggers web search (if enabled in your build)

Health checks:

```bash
curl https://<your-project>.pages.dev/api/nvidia/v1/health
curl https://<your-project>.pages.dev/api/search
```

---

## Project layout

```
web/Sightread/
  functions/
    api/
      search.ts
      nvidia/v1/
        health.ts
        chat/completions.ts
  wrangler.toml
  vite.config.ts
  dist/                 ← build output (gitignored)
```

---

## Custom domain

Cloudflare Pages → your project → **Custom domains** → add your domain. HTTPS is automatic.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| NVIDIA "Failed to fetch" | Confirm `/api/nvidia/v1/health` returns `{ ok: true }`. Check browser network tab for 401/502. |
| Search returns 503 | `SERPER_API_KEY` secret not set on the Pages project. |
| PWA/API conflict | Service worker excludes `/api/*` via `navigateFallbackDenylist` in `vite.config.ts`. |
| Functions not running | Ensure `functions/` sits next to `wrangler.toml` under `web/Sightread`, not repo root. |

---

## IIS vs Cloudflare

The existing `server/*.mjs` proxies and `public/web.config` are for **IIS on Windows**. Cloudflare Pages replaces both with `functions/` — you do not need IIS or Node running on the server for `/api/*` when deployed to Cloudflare.
