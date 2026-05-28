# Sightread (Android)

Kotlin + Jetpack Compose companion for Ray-Ban Meta glasses, based on Meta's CameraAccess sample with Sightread AI vision integration.

## Setup

1. Create `local.properties` in this directory with your Android SDK path and:
   ```
   github_token=ghp_xxxxxxxx
   ```
   Token needs read access to [meta-wearables-dat-android](https://github.com/facebook/meta-wearables-dat-android).

2. Open in Android Studio, sync Gradle, run on a physical device with Meta AI installed.

3. Enable Developer Mode in Meta AI and pair glasses (see `/docs/DEVELOPER_MODE.md`).

4. In-app: menu → **AI Settings** → add Gemini and/or OpenAI API keys.

## Features

- DAT camera streaming (best-effort 720p/30; may auto-adjust)
- Gemini 2.0 Flash / OpenAI GPT-4o-mini vision analysis
- Live AI response panel + Analyze now
- In-app Chat + optional attach current frame
- Optional TTS to glasses speakers (Bluetooth SCO)
- Mock Device Kit (debug builds, ladybug FAB)
