# Sightread (iOS · DAT)

SwiftUI app for **Ray-Ban Meta glasses** via Meta Wearables Device Access Toolkit (DAT SDK **0.7.0**). This is the glasses streaming path — separate from the Capacitor phone shell in `web/Sightread`.

## Features

- Connect to Meta AI glasses (registration + permissions)
- Stream camera feed (~720p / 30 FPS best-effort)
- Capture and share photos from glasses
- Throttled vision AI (Gemini 3.5 Flash default; OpenAI GPT-4o-mini / Groq Llama 4 Scout)
- In-app chat with optional attach-current-frame
- Prompt presets (scene, navigation, accessibility, safety, shopping, social)
- Mock Device Kit for development without wearing glasses
- API keys in iOS Keychain
- Firmware / glasses-app update flows when required

## Prerequisites

- **iOS 17.0+**
- **Xcode 15+**
- Swift 5+
- Meta Wearables DAT SDK 0.7.0 (SPM)
- Meta AI app with Developer Mode; Ray-Ban Meta glasses for device testing (optional with Mock Device Kit)

## Building

1. Clone this repository and open `Sightread.xcodeproj` in Xcode.
2. Set your **Development Team** under Signing & Capabilities.
3. Follow [docs/SETUP.md](../../docs/SETUP.md) for Developer Mode and API keys.
4. Build and run on a **physical iPhone** (`Cmd+R`).

## Running

1. Turn **Developer Mode** on in the Meta AI app.
2. Launch Sightread and complete **Connect** / registration.
3. Once connected, the glasses camera stream appears.
4. Use on-screen controls to capture photos, open chat, or disconnect.
5. If prompted, tap **Update firmware** or **Update app on glasses**.

## Track ownership

| Surface | Role |
|---------|------|
| This app (`ios/Sightread`) | Glasses streaming + vision/chat on DAT |
| `android/Sightread` | Glasses + Agent-first phone camera parity |
| `web/Sightread` (Capacitor) | Phone/browser Agent, Tier-1 scene JSON, PWA |

See [docs/ARCHITECTURE_VISION.md](../../docs/ARCHITECTURE_VISION.md). DAT **0.8+ / 0.9** require a Camera API migration (`addStream` → `addCamera`); tracked in [docs/PRODUCT_ROADMAP.md](../../docs/PRODUCT_ROADMAP.md).

## Troubleshooting

For DAT SDK issues, see the [Meta Wearables docs](https://wearables.developer.meta.com/docs/develop/) or [iOS discussions](https://github.com/facebook/meta-wearables-dat-ios/discussions).

## License

Licensed under the [MIT License](../../LICENSE) in the repository root. Portions are derived from Meta's CameraAccess sample; see [NOTICE](../../NOTICE).
