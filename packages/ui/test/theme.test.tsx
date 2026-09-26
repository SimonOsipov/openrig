// Theming: the UI always follows the OS; no selector, no stored choice.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { DEFAULT_THEME, resolveTheme, applyTheme } from "../src/lib/theme.js";
import { ThemeProvider, useTheme } from "../src/components/ThemeProvider.js";

type Listener = () => void;
let listeners: Listener[] = [];

/** Override window.matchMedia so `(prefers-color-scheme: dark)` reports `osDark`. */
function mockOsDark(osDark: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: query.includes("dark") ? osDark : false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: (_: string, fn: Listener) => listeners.push(fn),
      removeEventListener: (_: string, fn: Listener) => {
        listeners = listeners.filter((l) => l !== fn);
      },
      dispatchEvent: () => false,
    }),
  });
}

function Probe() {
  const { theme, resolved } = useTheme();
  return (
    <span data-testid="probe">
      {theme}:{resolved}
    </span>
  );
}

beforeEach(() => {
  localStorage.clear();
  listeners = [];
  document.documentElement.classList.remove("dark");
  mockOsDark(false);
});
afterEach(cleanup);

describe("theme lib", () => {
  it("default is `system`", () => {
    expect(DEFAULT_THEME).toBe("system");
  });

  it("`system` follows the OS; forced light/dark ignore it", () => {
    mockOsDark(true);
    expect(resolveTheme("system")).toBe("dark");
    expect(resolveTheme("light")).toBe("light");
    mockOsDark(false);
    expect(resolveTheme("system")).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
  });

  it("applyTheme toggles the .dark class on <html>", () => {
    applyTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    applyTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});

describe("ThemeProvider", () => {
  it("follows OS dark and ignores a stale stored choice", () => {
    localStorage.setItem("openrig.theme", "light");
    mockOsDark(true);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("probe").textContent).toBe("system:dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("re-resolves live when the OS flips", () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("probe").textContent).toBe("system:light");
    mockOsDark(true);
    act(() => listeners.forEach((l) => l()));
    expect(screen.getByTestId("probe").textContent).toBe("system:dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("initialTheme forces a palette for screenshot drivers", () => {
    mockOsDark(true);
    render(
      <ThemeProvider initialTheme="light">
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("probe").textContent).toBe("light:light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
