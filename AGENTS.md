# AGENTS.md

## Cursor Cloud specific instructions

This repo ships one product, **Sightread**, as two native mobile clients:

- `ios/Sightread/` — SwiftUI app, built with **Xcode on macOS only**. It cannot be
  built, linted, or run on this Linux cloud VM.
- `android/Sightread/` — Kotlin/Jetpack Compose app, built with **Gradle**. This is
  the only buildable target in the cloud environment.

There is no in-repo backend, server, or database. The apps talk directly to external
services (Meta Wearables DAT SDK, Gemini/OpenAI) at runtime, and AI keys are entered
in-app — they are not needed to build/lint/test.

### Android: required credential (build-blocking)

The Meta Wearables DAT SDK (`com.meta.wearable:mwdat-*:0.7.0`) is hosted on **GitHub
Packages** at `https://maven.pkg.github.com/facebook/meta-wearables-dat-android`, which
returns **401 Unauthorized** without a token. Every Gradle task that touches the `:app`
module (build, lint, test) fails at dependency resolution without it.

- `android/Sightread/settings.gradle.kts` reads the credential from the `GITHUB_TOKEN`
  environment variable first, then falls back to `github_token` in `local.properties`.
- Provide a GitHub PAT with `read:packages` scope as the `GITHUB_TOKEN` secret; it is
  injected as an env var and picked up automatically. The repo's default `gh` CLI token
  does **not** have access to this package.

### Android: environment already provisioned (persists in the VM snapshot)

- JDK 21 is installed; Gradle 8.14.1 comes via the wrapper (`./gradlew`).
- Android SDK lives at `~/android-sdk` (platform 35, build-tools 35.0.0, platform-tools).
  `ANDROID_HOME`/`ANDROID_SDK_ROOT`/`PATH` are exported in `~/.bashrc`.
- `android/Sightread/local.properties` (gitignored) contains `sdk.dir=~/android-sdk`.
  The startup update script recreates it if missing.
- AGP auto-installs `build-tools;34.0.0` on the first build; that is expected.

### Android: common commands (run from `android/Sightread/`)

- Build debug APK: `./gradlew :app:assembleDebug`
- Lint: `./gradlew :app:lintDebug`
- Unit tests: `./gradlew :app:testDebugUnitTest`

### Running the app

Hardware-accelerated Android emulators **do not work here** — there is no `/dev/kvm` and
no CPU virtualization. Verify changes via the build, lint, and unit-test tasks above and
on a physical device outside the cloud VM. End-to-end glasses streaming additionally
requires the Meta AI phone app + Ray-Ban Meta glasses (or the in-app Mock Device Kit).
