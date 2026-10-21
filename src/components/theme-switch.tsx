"use client";

import { Moon, Sun } from "lucide-react";
import { useState } from "react";
import type { Theme } from "@/i18n";
import { PREFERENCE_MAX_AGE, THEME_COOKIE } from "@/lib/cookies";
import { useDictionary } from "./dictionary-provider";
import { iconButtonClass } from "./ui";

// Disimpan di cookie supaya server langsung merender tema yang benar (tanpa kedip terang ke gelap).
function saveTheme(theme: Theme) {
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${PREFERENCE_MAX_AGE}; samesite=lax`;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function ThemeSwitch({ theme: initial }: { theme: Theme }) {
  const t = useDictionary();
  const [theme, setTheme] = useState(initial);
  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      aria-label={next === "dark" ? t.nav.themeDark : t.nav.themeLight}
      title={next === "dark" ? t.nav.themeDark : t.nav.themeLight}
      onClick={() => {
        saveTheme(next);
        setTheme(next);
      }}
      className={`${iconButtonClass} size-9`}
    >
      {theme === "dark" ? <Sun aria-hidden className="size-4" /> : <Moon aria-hidden className="size-4" />}
    </button>
  );
}
