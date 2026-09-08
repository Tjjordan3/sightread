# Android companion roadmap

Plan for bringing `android/Sightread` to feature and security parity with `web/Sightread`.

**Status (2026-09):** Agent-first pivot and P0–P3 core parity are **implemented** — app opens to Agent; phone camera vision default; glasses optional in Settings; encrypted keys; Room persistence; 7 providers; STT; theme; JSON export.

**Remaining:** wire web-search client to chat, PDF/Markdown export parity, wake phrase, Tier-1 scene extraction (web-only today), DAT SDK 0.9 Camera API migration.

See also [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md) and [ARCHITECTURE_VISION.md](./ARCHITECTURE_VISION.md).

---

## Product focus (web parity pivot) — DONE

Android matches the web app's **Agent-first** model:

```
Launch → Agent tab (default)
       ├── Vision: Phone camera (default) | Glasses (optional, if connected)
       └── Settings: API keys, theme, Connect glasses
```

| Before (glasses-first) | After (web-aligned) |
|------------------------|---------------------|
| Registration gate on launch | Open directly to Agent |
| Vision = DAT device selection | Vision = phone camera + optional glasses |
| Chat embedded in stream sheet | Agent tab with persistent history |
| Glasses required for core UX | Glasses optional enhancement |

Key files: `MainAppScaffold.kt`, `VisionTabScreen.kt`, `PhoneVisionScreen.kt`, `GlassesConnectSection.kt`

## Guiding principles

- **Agent-first** — match web `App.tsx`; glasses are optional, not the entry gate.
- **Privacy-first** — conversations and images stay on-device; no cloud sync or accounts.
- **Reuse web concepts** — align naming, settings keys, storage limits, and UX with the web app.
- **Preserve glasses value** — DAT streaming, photo capture, and Bluetooth SCO TTS remain first-class.
- **Native security** — encrypted credential storage (iOS Keychain parity), HTTPS-only networking, masked key fields.

---

## Current baseline (shipped)

| Area | Android today | Web |
|------|---------------|-----|
| AI providers | Gemini, OpenAI, Groq, Anthropic, Mistral, OpenRouter, NVIDIA | Same 7 |
| Chat | Agent tab + Room persistence | Agent + IndexedDB |
| Navigation | Agent / Vision / Settings (glasses optional) | Same tabs |
| API key storage | EncryptedSharedPreferences | localStorage / Capacitor Preferences |
| Voice input | Push-to-talk STT | STT + wake phrase |
| Export | JSON (Markdown helper exists; UI JSON-first) | JSON / Markdown / PDF |
| Web search | Proxy URL in Settings; **client not wired into ChatService** | `/api/search` proxy |
| Theme | Light / dark / system | Same |
| Tier-1 scene JSON | **Not ported** | Gemini 3.5 Flash-Lite |

---

## Feature gap matrix

### Done (was P0–P3)

| Item | Status |
|------|--------|
| Encrypted API keys + masked fields | Done |
| Conversation persistence + multi-convo UI | Done |
| Agent / Vision / Settings tabs | Done |
| HTTPS-only + OkHttp timeouts | Done |
| 7 providers + model pickers | Done |
| Vision → Agent handoff | Done |
| Speech input (push-to-talk) | Done |
| Theme + onboarding | Done |
| Export JSON | Done |

### Remaining

| Item | Notes |
|------|-------|
| Web search in chat | Settings proxy URL exists; wire `ChatService` like web `/api/search` |
| PDF / Markdown export UI | Share JSON today; add Markdown/PDF parity |
| Always-listening / wake phrase | Deferred — battery-sensitive |
| Tier-1 scene extraction | Port web `/api/vision/scene` client or call Pages Function |
| Remove dead `ChatScreen` / `ChatViewModel` | Leftover pre-Agent path |
| androidTest package rename | Still under `cameraaccess` sample package |
| DAT SDK → 0.9.0 | Breaking: `addStream` → `addCamera`; see PRODUCT_ROADMAP |

### Out of scope

- PWA / service worker (web-only)
- NVIDIA CORS proxy (Android calls `integrate.api.nvidia.com` directly)
- CSP headers (replaced by native network security)

---

## Security (shipped)

```
┌─────────────────────────────────────────────────────┐
│  Settings UI (password fields, clear-data actions)   │
├─────────────────────────────────────────────────────┤
│  EncryptedSharedPreferences (API keys only)          │
│  SharedPreferences (non-sensitive toggles)           │
├─────────────────────────────────────────────────────┤
│  OkHttp + network_security_config (HTTPS only)       │
├─────────────────────────────────────────────────────┤
│  Room DB (conversations — on-device, no cloud)       │
└─────────────────────────────────────────────────────┘
```

| Control | Status |
|---------|--------|
| `allowBackup="false"` | Done |
| Encrypted API keys | Done (`security-crypto` 1.1.0) |
| OkHttp with timeouts | Done |
| Cleartext traffic blocked | Done |
| ProGuard keep rules | Done |
| Release signing (non-sample) | Documented; CI later |

---

## Navigation (implemented)

```
Launch → MainAppScaffold
  ├── Agent tab (default) → AgentChatScreen + shared VisionFrameState
  ├── Vision tab → PhoneVisionScreen | StreamScreen (glasses)
  └── Settings → SettingsScreen + GlassesConnectSection
```

DAT registration is optional via Settings → Connect glasses.

---

## Success criteria

- [x] API keys encrypted at rest (EncryptedSharedPreferences)
- [x] 7 providers work for vision and chat
- [x] Conversations survive app restart (Room DB)
- [x] New / switch / delete conversations
- [x] Agent / Vision / Settings tabs when registered
- [x] Glasses streaming, photo capture, SCO TTS preserved
- [x] HTTPS only; OkHttp timeouts configured
- [x] Agent as default landing tab
- [x] Phone camera vision without glasses (CameraX)
- [x] Glasses connect demoted to Settings
- [x] Shared vision frame for Agent attach
- [x] Onboarding dialog on first launch
- [ ] PDF export
- [ ] Web search client wired to chat
- [ ] Always-listening / wake phrase
- [ ] Tier-1 scene JSON parity with web

---

## Related docs

- [Web roadmap](./WEB_ROADMAP.md)
- [Product roadmap (Phase 3–5)](./PRODUCT_ROADMAP.md)
- [Android README](../android/Sightread/README.md)
- [Setup](./SETUP.md)
