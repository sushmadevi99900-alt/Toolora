"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "toolora-theme";

const ThemeContext = createContext<{
  theme: ThemePreference;
  resolved: ResolvedTheme;
  mounted: boolean;
  setTheme: (t: ThemePreference) => void;
} | null>(null);

function resolveSystem(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readStored(): ThemePreference {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    /* storage unavailable — fall through */
  }
  return "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Hydration-safe: the initial render must be identical on the server and
  // the client ("system"), because localStorage/matchMedia are unavailable
  // on the server. The real persisted preference is read post-hydration.
  const [theme, setThemeState] = useState<ThemePreference>("system");
  const [mounted, setMounted] = useState(false);
  const [, force] = useState(0);

  // Read the persisted preference once, after hydration. State updates here
  // never run during render, so server HTML and the first client render match.
  // Browser-only APIs (localStorage) cannot be read during SSR.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- post-hydration sync of browser-only persisted theme; required to keep SSR and first client render identical.
    setThemeState(readStored());
    setMounted(true);
  }, []);

  // Resolved during render; until mounted this falls back to "light" on both
  // server and client so it can never cause a hydration mismatch. The
  // pre-hydration inline script has already set the correct <html> class.
  const resolved: ResolvedTheme =
    theme === "system" ? (mounted ? resolveSystem() : "light") : theme;

  // Sync to the DOM (external system) and subscribe to OS changes, but only
  // after hydration so we never fight the no-flash init script. State updates
  // happen only inside the subscription callback / mount effect above.
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    const next: ResolvedTheme = theme === "system" ? resolveSystem() : theme;
    root.classList.toggle("dark", next === "dark");
    root.style.colorScheme = next;
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => force((x) => x + 1);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, resolved, mounted]);

  const setTheme = useCallback((t: ThemePreference) => {
    setThemeState(t);
    try {
      window.localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ theme, resolved, mounted, setTheme }),
    [theme, resolved, mounted, setTheme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

/**
 * Inline script injected in <head> to set the initial theme class
 * before hydration — prevents a flash of the wrong theme.
 */
export const themeInitScript = `(function(){try{var k='toolora-theme';var s=localStorage.getItem(k)||'system';var d=s==='system'?window.matchMedia('(prefers-color-scheme: dark)').matches:s==='dark';document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`;
