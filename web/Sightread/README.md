# Sightread (Web)

Browser-based AI agent and vision companion for Sightread. Works as a Meta AI–style experience in the browser — no glasses required.

## Features

### Agent (Meta AI–style)
- **Full-page agent chat** with **persistent conversation history** (IndexedDB)
- **Chat history drawer** — new, switch, delete conversations
- **Export** conversations as JSON, Markdown, or PDF
- **Send photos** — attach from gallery or take a picture
- **Voice input**, **voice chat** loop, **always listening**, and **“Hey Sightread”** wake phrase
- **Spoken replies** (Settings)

### Vision (Sightread live mode)
- Webcam streaming with throttled vision analysis
- Live AI response panel, **Analyze now**, and photo upload
- Quick chat overlay with live camera frame attach

### AI providers (local, browser-direct)
- **Google Gemini**, **OpenAI**, **Groq**
- **Anthropic Claude**, **Mistral** (Pixtral)
- **OpenRouter** — one key, any vision-capable model ID

### PWA
- Installable on Android/desktop Chrome (`beforeinstallprompt`)
- iOS **Add to Home Screen** guidance
- Service worker precaches the app shell for faster loads
- Mobile safe areas and keyboard-aware composer

### Shared
- Same prompt presets as iOS/Android
- API keys in `localStorage` (on-device only); calls go directly to your chosen provider

## Quick start

```bash
cd web/Sightread
npm install
npm run dev
```

1. **Settings** → pick a provider and add its API key
2. **Agent** tab → chat, history, photos, or voice
3. **Vision** tab → live webcam analysis

### Production build

```bash
npm run build
npm run preview
```

Deploy `dist/` to any static HTTPS host.

## Storage

| Data | Location |
|------|----------|
| API keys & settings | `localStorage` |
| Conversations & images | IndexedDB (`sightread` database) |

Use **Settings → Clear all chat history** to wipe conversations. API keys are kept unless you clear them manually.

## Browser requirements

| Capability | Chrome / Edge | Safari | Firefox |
|------------|---------------|--------|---------|
| Agent chat + history | Yes | Yes | Yes |
| Webcam vision | Yes | Yes | Yes |
| Speech-to-text | Yes | Yes (webkit) | Limited |
| Wake phrase | Yes | Partial | Limited |
| PWA install | Yes | A2HS manual | Limited |

HTTPS required for camera/mic in production (localhost exempt).

## Roadmap

See [docs/WEB_ROADMAP.md](../../docs/WEB_ROADMAP.md) for architecture notes. Core roadmap items are implemented in this branch; future work may include JSON import and cloud sync.
