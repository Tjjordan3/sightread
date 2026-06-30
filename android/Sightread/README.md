# Sightread (Android)

Agent-first AI companion for Android — aligned with the web app. Chat, vision, and settings work immediately; Ray-Ban Meta glasses are an optional enhancement.

See [docs/ANDROID_ROADMAP.md](../../docs/ANDROID_ROADMAP.md) for architecture and status.

## Setup

1. Create `local.properties` in this directory with your Android SDK path and:
   ```
   github_token=ghp_xxxxxxxx
   ```
   Token needs read access to [meta-wearables-dat-android](https://github.com/facebook/meta-wearables-dat-android).

2. Open in Android Studio, sync Gradle, run on a physical device.

3. **Optional glasses:** Settings → Ray-Ban Meta glasses → Connect. Requires Meta AI Developer Mode (see `/docs/DEVELOPER_MODE.md`).

4. **Settings** tab → add API keys for your chosen provider.

## App focus (matches web)

| Tab | Purpose |
|-----|---------|
| **Agent** | Default home — persistent chat, voice input, attach current vision frame |
| **Vision** | Phone camera (default) or optional glasses stream |
| **Settings** | API keys, theme, glasses connect, export |

No registration gate — the app opens directly to Agent.

## Features

- Agent chat with Room persistence (50 convos / 200 msgs)
- **7 AI providers** with encrypted API keys
- Phone camera vision (CameraX) — works without glasses
- Optional Ray-Ban Meta DAT streaming when connected
- Discuss in Agent from vision (phone or glasses)
- Voice input (push-to-talk), TTS for vision and chat
- Light / dark / system theme
- Export conversations as JSON

## Security

- API keys in Android Keystore-backed encrypted prefs
- HTTPS-only networking, OkHttp timeouts
- `allowBackup="false"`
