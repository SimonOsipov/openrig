// OPR.0.4.3.29 — dashboard theming (light + dark, extensible).
//
// A theme is a set of CSS-variable token values applied by a class on <html>.
// Light is the current `:root` token set (globals.css); dark is a `.dark {}`
// block re-declaring the same names (Vellum Dark). Because every component
// styles via `hsl(var(--token))`, toggling the `.dark` class flips the whole
// dashboard through the cascade — no per-component work.
//
// The UI always follows the OS (`system`); there is no selector and no stored
// choice. The pre-paint script in index.html mirrors resolveTheme("system").

/** The dashboard-scoped OS color-scheme query used by `system`. */
export const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)";

/** `system` follows the OS; `light`/`dark` force a palette (screenshot drivers only). */
export type ThemeId = "light" | "dark" | "system";

/** The two concrete palettes a theme resolves to (the class applied to <html>). */
export type ResolvedTheme = "light" | "dark";

/** Always follow the OS; `light`/`dark` remain only for screenshot drivers (initialTheme). */
export const DEFAULT_THEME: ThemeId = "system";

/** Whether the OS currently prefers dark. */
export function prefersDark(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(COLOR_SCHEME_QUERY).matches;
}

/** Resolve a theme choice to the concrete palette. `system` follows the OS. */
export function resolveTheme(theme: ThemeId): ResolvedTheme {
  if (theme === "system") return prefersDark() ? "dark" : "light";
  return theme;
}

/** Apply the resolved palette by toggling the `.dark` class on <html>. */
export function applyTheme(theme: ThemeId): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolveTheme(theme) === "dark");
}
