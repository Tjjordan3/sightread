import { useEffect } from "react";
import { applyTheme } from "../lib/theme";
import type { ThemeSetting } from "../lib/theme";

export function useTheme(theme: ThemeSetting) {
  useEffect(() => applyTheme(theme), [theme]);
}
