# Developer Mode

## Meta AI app (phone)

1. Open **Meta AI**.
2. Go to **Settings** → **App Info**.
3. Tap the **App version** label **5 times**.
4. Toggle **Developer Mode** on and confirm.

## Glasses

1. Meta AI → **Devices** → your glasses → **Settings**.
2. Confirm firmware meets minimum (v20+ for Ray-Ban Meta).
3. Keep glasses connected over Bluetooth.

## Sightread registration flow

1. Sightread calls `Wearables.shared.startRegistration()`.
2. You are deeplinked to Meta AI to approve the connection.
3. Meta AI returns to Sightread via `sightread://`.
4. Request camera permission from Sightread before devices appear in the list.

## Release channels (optional)

For testers beyond local dev installs, register at [Wearables Developer Center](https://wearables.developer.meta.com/) and use release channels (up to 100 testers in preview).