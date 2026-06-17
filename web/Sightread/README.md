# Sightread (Web)

Browser-based AI agent and vision companion for Sightread. Works as a Meta AI–style experience in the browser — no glasses required.

## Features

### Agent (Meta AI–style)
- **Full-page agent chat** — primary tab, conversation-first UI
- **Send photos** — attach from gallery, take a picture, or paste an image into the conversation
- **Voice input** — microphone button uses browser speech recognition
- **Voice chat mode** — hands-free loop: speak → agent replies → speaks back → listens again
- **Spoken replies** — optional TTS for assistant messages (Settings)

### Vision (Sightread live mode)
- Webcam streaming with throttled vision analysis (Gemini / OpenAI / Groq)
- Live AI response panel, **Analyze now**, and photo upload
- Quick chat overlay with live camera frame attach

### Shared
- Same prompt presets as iOS/Android
- Provider choice: Gemini 2.0 Flash, OpenAI GPT-4o-mini, or Groq Llama 4 Scout
- API keys stored in browser `localStorage` (on-device only)

## Quick start

```bash
cd web/Sightread
npm install
npm run dev
```

Open the URL shown (typically `http://localhost:5173`).

1. Go to **Settings** → add Gemini, OpenAI, and/or Groq API keys
2. Open the **Agent** tab → chat, send photos, or tap **Voice chat**
3. Open the **Vision** tab for live webcam scene understanding

### Production build

```bash
npm run build
npm run preview
```

Deploy the `dist/` folder to any static host (Vercel, Netlify, GitHub Pages, etc.).

## Browser requirements

| Capability | Chrome / Edge | Safari | Firefox |
|------------|---------------|--------|---------|
| Agent chat + images | Yes | Yes | Yes |
| Webcam vision | Yes | Yes | Yes |
| Speech-to-text | Yes | Yes (webkit) | Limited |
| Text-to-speech | Yes | Yes | Yes |

- **HTTPS** required for camera/mic in production (localhost is exempt)
- Keys from [Google AI Studio](https://aistudio.google.com/), [OpenAI](https://platform.openai.com/), and/or [Groq](https://console.groq.com/)

## Differences from mobile

| Feature | iOS / Android | Web |
|--------|----------------|-----|
| Video source | Ray-Ban Meta glasses (DAT SDK) | Webcam or image upload |
| Agent chat | Stream overlay + dedicated chat | Full-page Agent tab |
| Voice output | Glasses speakers (Bluetooth) | Browser speech synthesis |
| API key storage | Keychain / Encrypted prefs | `localStorage` |

## API keys

Add keys in **Settings** after launch. Requests go directly from your browser to the chosen provider — no Sightread backend.
