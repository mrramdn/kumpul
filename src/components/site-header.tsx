import { LogIn, Plus } from "lucide-react";
import Link from "next/link";
import type { Dictionary, Lang, Theme } from "@/i18n";
import { getCurrentUser } from "@/lib/auth";
import { initials } from "@/lib/format";
import { LangSwitch } from "./lang-switch";
import { LogoutButton } from "./logout-button";
import { ThemeSwitch } from "./theme-switch";
import { buttonClass, gutterClass } from "./ui";

export async function SiteHeader({ t, lang, theme }: { t: Dictionary; lang: Lang; theme: Theme }) {
  // Kalau database mati, header tetap tampil (sebagai belum masuk) supaya halaman error bisa muncul.
  const user = await getCurrentUser().catch(() => null);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card">
      <div className={`flex h-16 items-center gap-2 ${gutterClass}`}>
        <Link href="/" className="mr-auto rounded-full type-title">
          Kumpul
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          <Link href="/" className={buttonClass("ghost", "small")}>
            {t.nav.events}
          </Link>
          {user && (
            <Link href="/saya" className={buttonClass("ghost", "small")}>
              {t.nav.myEvents}
            </Link>
          )}
          <Link href="/tentang" className={buttonClass("ghost", "small")}>
            {t.nav.about}
          </Link>
          <Link href="/api/docs" className={buttonClass("ghost", "small")}>
            {t.nav.apiDocs}
          </Link>
        </nav>
        <LangSwitch lang={lang} />
        <ThemeSwitch theme={theme} />
        {user ? (
          <>
            <Link href="/acara/baru" className={buttonClass("secondary", "small")} aria-label={t.nav.create}>
              <Plus aria-hidden className="size-4" />
              <span className="hidden sm:inline">{t.nav.create}</span>
            </Link>
            <Link
              href="/saya"
              title={`${t.nav.myEvents}: ${user.name}`}
              aria-label={t.nav.myEvents}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary type-caption transition-colors hover:bg-input/60"
            >
              {initials(user.name)}
            </Link>
            <LogoutButton />
          </>
        ) : (
          <>
            <Link href="/masuk" className={buttonClass("ghost", "small")} aria-label={t.nav.login}>
              <LogIn aria-hidden className="size-4" />
              <span className="hidden sm:inline">{t.nav.login}</span>
            </Link>
            <Link href="/daftar" className={buttonClass("secondary", "small")}>
              {t.nav.register}
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
