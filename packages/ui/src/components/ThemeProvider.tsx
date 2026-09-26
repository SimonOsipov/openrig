// ThemeProvider + useTheme: applies the OS palette to <html> and re-resolves live
// when the OS flips. index.html's pre-paint script sets the class before first
// paint; this provider re-asserts it on mount and keeps it in sync.

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  applyTheme,
  COLOR_SCHEME_QUERY,
  DEFAULT_THEME,
  resolveTheme,
  type ResolvedTheme,
  type ThemeId,
} from "../lib/theme.js";

interface ThemeContextValue {
  theme: ThemeId;
  /** The concrete palette currently applied (light or dark). */
  resolved: ResolvedTheme;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: DEFAULT_THEME, resolved: "light" });

export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: ReactNode;
  /** Forces a palette for screenshot drivers (e.g. the twin); omitted = follow the OS. */
  initialTheme?: ThemeId;
}) {
  const theme = initialTheme ?? DEFAULT_THEME;
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(theme));

  useEffect(() => {
    applyTheme(theme);
    setResolved(resolveTheme(theme));
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia(COLOR_SCHEME_QUERY);
    const onChange = () => {
      applyTheme("system");
      setResolved(resolveTheme("system"));
    };
    mediaQuery.addEventListener?.("change", onChange);
    return () => mediaQuery.removeEventListener?.("change", onChange);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(() => ({ theme, resolved }), [theme, resolved]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
