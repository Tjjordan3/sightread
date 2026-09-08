# Web companion roadmap

Plan for `web/Sightread` as the phone/browser Agent + Vision product (Capacitor app ID `com.sightread.app`).

**Status (2026-09):** Core workstreams below are **shipped**. This doc is retained as the historical design record and for remaining follow-ups.

**Also shipped:** Two-tier vision (Gemini 3.5 Flash-Lite scene JSON → Agent system prompt), Capacitor iOS/Android shells, native TTS + spatial audio, `/api/vision/scene` with rate limits. See [ARCHITECTURE_VISION.md](./ARCHITECTURE_VISION.md).

Cross-cutting product Phase 3–5 work (dataset, feedback, tracking, edge, dashboard): [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md).

---

## Shipped vs remaining

| Workstream | Status | Notes |
|------------|--------|-------|
| **1. Conversation persistence** | **Done** | IndexedDB via `idb`; list UI; image blobs; limits; clear-all |
| **1d. Export** | **Done** | JSON, Markdown, PDF (`jspdf`) |
| **JSON import** | Remaining | Documented follow-up |
| **Cloud sync / accounts** | Deferred | Needs backend; privacy-first on-device for now |
| **2. Voice v2** | **Done** | Continuous voice chat, always-listening, silence timeout |
| **2c. Wake phrase** | **Done (POC)** | “Hey Sightread” transcript/keyword path |
| **3. PWA shell** | **Done** | `vite-plugin-pwa`, manifest, install prompt, A2HS guidance, safe areas |

### Current baseline (shipped)

- Agent tab with multi-turn chat, photo attach, mic input, voice-chat loop, wake phrase
- Conversation history in IndexedDB (survives refresh); Settings in `localStorage` / Capacitor Preferences
- Vision tab with live webcam analysis + Tier-1 scene JSON
- PWA installable shell with service-worker precache of static assets
- Export conversations as JSON / Markdown / PDF

---

## Guiding principles (unchanged)

- **No backend required for v1** of each feature — stay client-only unless a capability is impossible in-browser.
- **Privacy-first** — conversations and images stay on-device; document what is stored and how to clear it.
- **Progressive enhancement** — features degrade gracefully when IndexedDB, service workers, or speech APIs are unavailable.
- **Reuse mobile concepts** — align naming and UX with iOS/Android where it helps users moving between platforms.

---

## 1. Conversation history persistence — DONE

Implementation lives under `src/lib/storage/` and `useConversationPersistence`.

| Data | Store |
|------|--------|
| API keys & toggles | `localStorage` (`sightread_settings`); Capacitor Preferences on native shells |
| Conversations & image blobs | IndexedDB (`sightread`) |

Limits: ~50 conversations, ~200 messages/thread, image LRU toward ~100 MB. Settings → **Clear chat history**.

**Remaining:** JSON import; optional Credential Management API for keys; cloud sync (deferred).

---

## 2. Always-listening / wake-style voice — DONE

| Mode | Status |
|------|--------|
| Push-to-talk | Shipped |
| Voice chat loop | Shipped |
| Always listening | Shipped |
| “Hey Sightread” wake phrase | Shipped (browser/transcript POC; OS background limits remain) |

---

## 3. Mobile PWA shell — DONE

Manifest + Workbox precache via `vite-plugin-pwa`, install prompt, iOS A2HS helper, `visualViewport` composer polish.

Offline: app shell + cached history browse only — AI calls still need network.

---

## Historical design notes

The original phase tables (1a–1d, 2a–2c, 3a–3d), IndexedDB schema, and voice state machine remain valid as design history. Prefer the shipped tree under `web/Sightread/src/` over re-implementing from this doc.

Suggested original order (completed):

```
Phase 1 (persistence) ──┐
                        ├──> Phase 3 (PWA) ──> polish
Phase 2 (voice) ────────┘
```

---

## Resolved decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | **Provider per conversation?** | **No** — always use the provider selected in current Settings. |
| 2 | **Export conversations?** | **Yes** — JSON, Markdown, PDF. Client-side download only. |
| 3 | **Wake phrase** | **“Hey Sightread”** |
| 4 | **Shared history with mobile?** | **Deferred** until a backend exists. |

---

## Related docs

- [web/Sightread/README.md](../web/Sightread/README.md) — current web setup
- [ARCHITECTURE_VISION.md](./ARCHITECTURE_VISION.md) — two-tier vision + track ownership
- [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md) — Scale / Advanced / Maturity workstreams
- [SETUP.md](SETUP.md) — API keys and glasses setup (mobile)
- [SAMPLE_PROMPTS.md](SAMPLE_PROMPTS.md) — prompt presets shared across platforms
