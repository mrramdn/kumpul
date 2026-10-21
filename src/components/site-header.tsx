import { LogIn, Plus } from "lucide-react";
import Link from "next/link";
import type { Dictionary, Lang } from "@/i18n";
import { isOrganizer } from "@/lib/auth";
import { authEnabled } from "@/lib/session";
import { LangSwitch } from "./lang-switch";
import { LogoutButton } from "./logout-button";
import { buttonClass, gutterClass } from "./ui";

export async function SiteHeader({ t, lang }: { t: Dictionary; lang: Lang }) {
  const organizer = await isOrganizer();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card">
      <div className={`flex h-16 items-center gap-2 ${gutterClass}`}>
        <Link href="/" className="mr-auto rounded-full type-title">
          Kumpul
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          <Link href="/" className={buttonClass("ghost", "small")}>
            {t.nav.events}
          </Link>
          <Link href="/tentang" className={buttonClass("ghost", "small")}>
            {t.nav.about}
          </Link>
          <Link href="/api/docs" className={buttonClass("ghost", "small")}>
            {t.nav.apiDocs}
          </Link>
        </nav>
        <LangSwitch lang={lang} />
        {authEnabled() &&
          (organizer ? (
            <LogoutButton />
          ) : (
            <Link href="/masuk" className={buttonClass("ghost", "small")}>
              <LogIn aria-hidden className="size-4" />
              <span className="hidden sm:inline">{t.nav.login}</span>
            </Link>
          ))}
        <Link href="/acara/baru" className={buttonClass("secondary", "small")} aria-label={t.nav.create}>
          <Plus aria-hidden className="size-4" />
          <span className="hidden sm:inline">{t.nav.create}</span>
        </Link>
      </div>
    </header>
  );
}
