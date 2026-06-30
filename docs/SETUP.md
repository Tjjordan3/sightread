# Sightread setup

## 1. Meta glasses and Meta AI app

1. Pair Ray-Ban Meta glasses in the **Meta AI** app.
2. Update Meta AI to **v254+** and glasses firmware to **v20+**.
3. Enable **Developer Mode**: Meta AI → Settings → App Info → tap version **5 times** → enable Developer Mode.

See [DEVELOPER_MODE.md](DEVELOPER_MODE.md) for details.

## 2. Xcode project

1. Clone or copy this repo to your Mac.
2. Open `ios/Sightread/Sightread.xcodeproj`.
3. Select the **Sightread** target → **Signing & Capabilities** → choose your Team.
4. Bundle ID defaults to `com.meta.wearables.external.Sightread`; change if needed for your team.

### Developer Mode (local testing)

In `Sightread/Info.plist`, `MetaAppID` and `ClientToken` can use `$(META_APP_ID)` / `$(CLIENT_TOKEN)` set to `0` in build settings, or register an app at [Wearables Developer Center](https://wearables.developer.meta.com/).

URL scheme for Meta AI callbacks: `sightread://`

## 3. API keys (in app)

1. Run Sightread on your iPhone.
2. Tap **gear** → **AI Settings**.
3. Paste a **Gemini** key from [Google AI Studio](https://aistudio.google.com/) (free tier), an **OpenAI** key, and/or a **Groq** key from [console.groq.com](https://console.groq.com/).
4. Choose provider, prompt preset, and analysis interval (2–10 seconds).

Sightread runs without keys — AI features are enabled once you add them in Settings.

Keys are saved in the iOS Keychain on device only.

## 4. Connect and stream

1. Launch Sightread → **Connect my glasses** (redirects to Meta AI).
2. Grant **camera** permission when prompted.
3. Wear/power on glasses → **Start streaming**.
4. AI responses appear in the panel at the top while streaming.
5. Optional: enable **Read responses aloud** in Settings to hear answers on glasses speakers (Bluetooth HFP).

## 4.5 Chat (Meta AI-style)

1. While streaming, tap **Chat** (speech bubble / chat icon).
2. Type a message and tap **Send**.
3. Optional: toggle **Attach current frame** to include what the glasses are currently seeing.

Sightread only sends a frame when you explicitly attach it.

## 5. Mock Device Kit (no glasses)

1. Build **Debug** configuration.
2. Tap the **ladybug** debug icon → enable Mock Device Kit.
3. Pair Ray-Ban Meta mock → Power on → Unfold → Don.
4. Optionally attach a test video as the camera feed.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| No devices listed | Complete registration; request camera permission |
| Stream won''t start | Glasses on face, unfolded, charged >10% |
| AI errors | Check API key, network, Gemini/OpenAI/Groq quota |
| Meta AI callback fails | Verify `sightread://` URL scheme matches Info.plist |

Docs: https://wearables.developer.meta.com/docs/develop/

## Android

See [android/Sightread/README.md](../android/Sightread/README.md) and [docs/ANDROID_ROADMAP.md](./ANDROID_ROADMAP.md). Requires a GitHub token in `local.properties` for the DAT Maven package.