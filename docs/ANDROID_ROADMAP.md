# Android companion roadmap

Plan for bringing `android/Sightread` to feature and security parity with `web/Sightread`.

**Status:** Agent-first pivot implemented — app opens to Agent tab; phone camera vision default; glasses optional in Settings. Remaining: web search client, PDF export, wake phrase.

---

## Product focus (web parity pivot)

Android now matches the web app's **Agent-first** model:

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

## Current baseline

| Area | Android today | Web target |
|------|---------------|------------|
| AI providers | Gemini, OpenAI, Groq | + Anthropic, Mistral, OpenRouter, NVIDIA |
| Chat | Ephemeral bottom sheet | Persistent Agent tab with conversation history |
| Navigation | DAT state machine only | Agent / Vision / Settings tabs when registered |
| API key storage | Plain `SharedPreferences` | Masked UI; encrypted at rest on native |
| Voice input | None | STT + optional wake phrase |
| Export | None | JSON / Markdown / PDF |
| Web search | None | Server proxy (`/api/search`) |
| Theme | Fixed Material | Light / dark / system |

---

## Feature gap matrix

### P0 — Core parity

| Item | Web reference | Android work |
|------|---------------|--------------|
| Encrypted API keys | iOS `KeychainStore.swift` | `SecureSettingsStore` + `EncryptedSharedPreferences` |
| Password-masked key fields | `SettingsScreen.tsx` | `PasswordVisualTransformation` |
| Conversation persistence | `lib/storage/conversationStore.ts` | Room DB + `ConversationRepository` |
| Multi-conversation UI | `ConversationList.tsx` | `ConversationListSheet` |
| Agent / Vision / Settings tabs | `AppShell.tsx` | `AppShell.kt` + `RegisteredAppScaffold` |
| HTTPS-only networking | `public/_headers` (CSP) | `network_security_config.xml` + OkHttp timeouts |

### P1 — Provider & settings parity

| Item | Web reference | Android work |
|------|---------------|--------------|
| Anthropic, Mistral, OpenRouter, NVIDIA | `lib/providers.ts` | New vision + chat service classes |
| OpenRouter / NVIDIA model pickers | `settings.ts` | `SettingsRepository` fields + UI |
| `visionManualOnly` | Settings toggle | Gate auto-analysis in `AIAnalysisController` |
| `speakChatReplies` | Separate from vision TTS | Split toggles in Settings |
| Clear chat history | `clearChatHistory()` | Settings action |
| Vision → Agent handoff | `visionDiscuss.ts` | "Discuss in Agent" on stream screen |

### P2 — Voice & search

| Item | Web reference | Android work |
|------|---------------|--------------|
| Speech input (push-to-talk) | `useSpeechRecognition.ts` | `SpeechRecognizer` + `RECORD_AUDIO` |
| Always listening / wake phrase | `wakeWord.ts` | Deferred — battery-sensitive |
| Web search | `/api/search` proxy | Configurable proxy URL in Settings |

### P3 — Polish

| Item | Web reference | Android work |
|------|---------------|--------------|
| Export conversations | `lib/storage/export.ts` | Share intent (JSON / Markdown) |
| Onboarding overlay | `ChatOnboardingOverlay.tsx` | First-run sheet |
| Theme (light/dark/auto) | `useTheme.ts` | `ThemeSetting` + Compose theme |

### Out of scope

- PWA / service worker (web-only)
- NVIDIA CORS proxy (Android calls `integrate.api.nvidia.com` directly)
- CSP headers (replaced by native network security)

---

## Security targets

```
┌─────────────────────────────────────────────────────┐
│  Settings UI (password fields, clear-data actions)   │
├─────────────────────────────────────────────────────┤
│  EncryptedSharedPreferences (API keys only)          │
│  SharedPreferences (non-sensitive toggles)           │
├─────────────────────────────────────────────────────┤
│  OkHttp + network_security_config (HTTPS only)       │
├─────────────────────────────────────────────────────┤
│  Room DB (conversations — on-device, no cloud)     │
└─────────────────────────────────────────────────────┘
```

| Control | Status |
|---------|--------|
| `allowBackup="false"` | Already set |
| Encrypted API keys | Phase 1 |
| OkHttp with timeouts | Phase 1 |
| Cleartext traffic blocked | Phase 1 |
| ProGuard keep rules | Phase 1 |
| Release signing (non-sample) | Documented; CI later |

---

## Proposed package layout

```
sightread/
├── ai/           # Vision services, settings, prompts
├── chat/         # Agent chat ViewModel + ChatService
├── network/      # OkHttp ApiClient
├── storage/      # Room entities, DAO, repository, export
├── speech/       # TTS + STT
└── ui/           # Compose screens, AppShell, theme
```

---

## Phased implementation

### Phase 1 — Security foundation

1. `androidx.security:security-crypto` — `SecureSettingsStore`
2. Migrate API keys from plain prefs (one-time migration)
3. Mask API key fields in Settings
4. `network_security_config.xml` — block cleartext
5. OkHttp replaces `HttpURLConnection` in all AI clients
6. ProGuard rules for Room, JSON, DAT SDK

### Phase 2 — Agent experience & persistence

1. Room entities mirroring web `StoredConversation` / `StoredMessage`
2. `ConversationRepository` with limits: 50 convos, 200 msgs, 100 MB images
3. `AppShell` bottom nav: Agent | Vision | Settings
4. `AgentChatScreen` with conversation list sheet
5. Vision → Agent handoff
6. Clear all conversations in Settings

### Phase 3 — Provider expansion

1. Extend `AIProvider` to 7 providers
2. Port Anthropic, Mistral, OpenRouter, NVIDIA vision + chat clients
3. Model pickers for OpenRouter and NVIDIA
4. `visionManualOnly`, `speakChatReplies` toggles

### Phase 4 — Voice input

1. `RECORD_AUDIO` permission
2. Push-to-talk mic button in Agent chat
3. (Later) always-listening + "Hey Sightread"

### Phase 5 — Export, search, polish

1. Export JSON / Markdown via share intent
2. Configurable web search proxy URL
3. Onboarding overlay
4. Light / dark / system theme

---

## Data model (aligned with web)

| Web (`types.ts`) | Android (Room) |
|------------------|----------------|
| `StoredConversation` | `ConversationEntity` |
| `StoredMessage` | `MessageEntity` |
| `StoredImage` | `ImageEntity` |
| `STORAGE_LIMITS` | `StorageLimits` object |

Settings remain in `SharedPreferences` / encrypted store — not per-conversation.

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
- [ ] Always-listening / wake phrase

---

## Related docs

- [Web roadmap](./WEB_ROADMAP.md)
- [Android README](../android/Sightread/README.md)
- [Setup](./SETUP.md)
