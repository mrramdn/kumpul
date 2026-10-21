"use client";

import { useRouter } from "next/navigation";
import { LANG_COOKIE, PREFERENCE_MAX_AGE } from "@/lib/cookies";
import { useDictionary } from "./dictionary-provider";

const LANGS = [
  { code: "id", label: "ID" },
  { code: "en", label: "EN" },
] as const;

// Disimpan setahun. Server membaca cookie ini untuk memilih kamus bahasa.
function saveLang(code: string) {
  document.cookie = `${LANG_COOKIE}=${code}; path=/; max-age=${PREFERENCE_MAX_AGE}; samesite=lax`;
}

export function LangSwitch({ lang }: { lang: string }) {
  const t = useDictionary();
  const router = useRouter();

  function choose(code: string) {
    saveLang(code);
    router.refresh();
  }

  return (
    <div role="group" aria-label={t.nav.language} className="inline-flex shrink-0 rounded-full bg-secondary p-1">
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-pressed={lang === code}
          onClick={() => choose(code)}
          className="h-7 rounded-full px-2.5 type-caption text-muted-foreground transition-colors hover:text-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-sm"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
