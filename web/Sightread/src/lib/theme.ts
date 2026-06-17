export type ThemeSetting = "light" | "dark" | "auto";

export function resolveTheme(setting: ThemeSetting): "light" | "dark" {
  if (setting === "light") return "light";
  if (setting === "dark") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyTheme(setting: ThemeSetting): (() => void) | void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  const update = () => {
    const resolved = resolveTheme(setting);
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute(
      "content",
      resolved === "dark" ? "#0f0f10" : "#0064e0",
    );
  };

  update();

  if (setting !== "auto") return;

  media.addEventListener("change", update);
  return () => media.removeEventListener("change", update);
}
