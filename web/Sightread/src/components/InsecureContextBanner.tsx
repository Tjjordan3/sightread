import { isSecureContext } from "../lib/uuid";

export function InsecureContextBanner() {
  if (isSecureContext()) return null;

  return (
    <div className="storage-banner insecure-banner" role="alert">
      This page is not using HTTPS. Camera, microphone, and some chat features
      require a secure URL. Use your Tailscale{" "}
      <strong>https://…ts.net</strong> link, not{" "}
      <strong>http://100.x.x.x</strong>.
    </div>
  );
}
