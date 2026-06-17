# Sightread

**Read the world through your frames.** Sightread is an iOS companion app for Ray-Ban Meta glasses that streams first-person video via the [Meta Wearables Device Access Toolkit](https://wearables.developer.meta.com/) and sends sampled frames to Gemini, OpenAI, or Groq for real-time vision analysis.

## Features

- Camera streaming from Ray-Ban Meta (Gen 1/2) through DAT SDK
- Best-effort streaming target: **720p / 30 FPS** (may auto-adjust based on Bluetooth bandwidth)
- Throttled vision AI (Gemini 2.0 Flash default, OpenAI GPT-4o-mini or Groq Llama 4 Scout fallback)
- Live AI response panel during streaming
- In-app **Chat** with optional “attach current frame”
- Prompt presets (scene, navigation, accessibility, safety, shopping, social)
- Mock Device Kit for development without wearing glasses
- API keys stored in iOS Keychain

## Quick start

1. Open `ios/Sightread/Sightread.xcodeproj` in Xcode on a Mac.
2. Set your **Development Team** under Signing & Capabilities.
3. Follow [docs/SETUP.md](docs/SETUP.md) for Meta AI Developer Mode and API keys.
4. Build and run on a physical iPhone (glasses paired in Meta AI app).

## Project structure

```
sightread/
  docs/              Setup, developer mode, sample prompts, web roadmap
  ios/Sightread/     Xcode project (SwiftUI + DAT SDK 0.7)
  android/Sightread/ Gradle project (Compose + DAT SDK 0.7)
  web/Sightread/     Browser companion (Vite + React + webcam)
```

### Android

1. Add `github_token=YOUR_GITHUB_PAT` to `android/Sightread/local.properties` (read access to `meta-wearables-dat-android`).
2. Open `android/Sightread` in Android Studio.
3. Same Meta AI Developer Mode and API key setup as iOS (Settings in app).

### Web (browser companion)

1. `cd web/Sightread && npm install && npm run dev`
2. Add Gemini, OpenAI, and/or Groq keys in **Settings**.
3. Use the **Agent** tab for Meta AI–style chat (text, photos, voice) or **Vision** for live webcam analysis.

See [web/Sightread/README.md](web/Sightread/README.md) for build and deploy details.

Upcoming web work (persistence, voice, PWA): [docs/WEB_ROADMAP.md](docs/WEB_ROADMAP.md).

## Requirements

- iPhone, iOS 16+, Xcode 15+
- Meta AI app v254+, Ray-Ban Meta firmware v20+
- Google AI Studio (Gemini), OpenAI, and/or Groq API key

## API keys (no code changes)

Sightread does **not** require AI keys at build time. Add keys in-app:
- iOS: **Settings** → paste Gemini/OpenAI/Groq keys (stored in Keychain)
- Android: **AI Settings** → paste keys (stored on-device)
- Web: **Settings** → paste keys (stored in browser localStorage)

## License

Derived from Meta''s CameraAccess sample (see `ios/Sightread/`). AI integration and Sightread branding are project additions.