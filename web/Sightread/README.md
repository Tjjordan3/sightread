# Sightread (Web)

Browser companion for Sightread — live webcam vision AI, chat, and prompt presets. No Meta glasses required.

## Features

- Webcam streaming with throttled vision analysis (Gemini 2.0 Flash / OpenAI GPT-4o-mini)
- Live AI response panel during streaming
- **Analyze now** for an immediate high-detail snapshot
- **Upload photo** for one-off analysis
- In-app **Chat** with optional “attach current frame”
- Same prompt presets as iOS/Android (scene, navigation, accessibility, safety, shopping, social)
- Optional TTS via Web Speech API
- API keys stored in browser `localStorage` (on-device only)

## Quick start

```bash
cd web/Sightread
npm install
npm run dev
```

Open the URL shown (typically `http://localhost:5173`). Use **Settings** to add Gemini and/or OpenAI API keys, then **Start with webcam**.

### Production build

```bash
npm run build
npm run preview
```

Deploy the `dist/` folder to any static host (Vercel, Netlify, GitHub Pages, etc.).

## Differences from mobile

| Feature | iOS / Android | Web |
|--------|----------------|-----|
| Video source | Ray-Ban Meta glasses (DAT SDK) | Webcam or image upload |
| API key storage | Keychain / Encrypted prefs | `localStorage` |
| TTS output | Glasses speakers (Bluetooth) | Browser speech synthesis |
| Mock Device Kit | Yes (debug) | N/A — use webcam instead |

## API keys

Same as mobile: add keys in **Settings** after launch. Keys are sent directly from your browser to Gemini or OpenAI — no Sightread backend.

## Requirements

- Modern browser with `getUserMedia` (Chrome, Firefox, Safari, Edge)
- Gemini key from [Google AI Studio](https://aistudio.google.com/) and/or OpenAI key
- HTTPS required for camera access in production (localhost is exempt)
