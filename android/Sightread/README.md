# Sightread (Android)

Kotlin + Jetpack Compose companion for Ray-Ban Meta glasses, based on Meta's CameraAccess sample with Sightread AI vision integration.

See [docs/ANDROID_ROADMAP.md](../../docs/ANDROID_ROADMAP.md) for the web-parity plan and status.

## Setup

1. Create `local.properties` in this directory with your Android SDK path and:
   ```
   github_token=ghp_xxxxxxxx
   ```
   Token needs read access to [meta-wearables-dat-android](https://github.com/facebook/meta-wearables-dat-android).

2. Open in Android Studio, sync Gradle, run on a physical device with Meta AI installed.

3. Enable Developer Mode in Meta AI and pair glasses (see `/docs/DEVELOPER_MODE.md`).

4. In-app: **Settings** tab → add API keys for your chosen provider.

## Features

- DAT camera streaming (best-effort 720p/30; may auto-adjust)
- **7 AI providers:** Gemini, OpenAI, Groq, Anthropic, Mistral, OpenRouter, NVIDIA NIM
- Agent tab with persistent conversation history (Room DB)
- Vision tab with live AI analysis + "Discuss in Agent" handoff
- Encrypted API key storage (`EncryptedSharedPreferences`)
- HTTPS-only networking (OkHttp + network security config)
- Voice input (push-to-talk) in Agent chat
- Export conversations as JSON
- Light / dark / system theme
- Optional TTS for vision and chat replies (Bluetooth SCO to glasses)
- Mock Device Kit (debug builds, ladybug FAB)

## Security

- API keys stored in Android Keystore-backed encrypted prefs
- `allowBackup="false"` — keys not included in device backups
- Cleartext HTTP blocked via `network_security_config.xml`
- Settings UI masks API keys by default
