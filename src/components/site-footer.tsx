import Link from "next/link";
import type { Dictionary } from "@/i18n";
import { HealthStatus } from "./health-status";
import { gutterClass } from "./ui";

export function SiteFooter({ t }: { t: Dictionary }) {
  return (
    <footer className="border-t border-border">
      <div className={`flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between ${gutterClass}`}>
        <p className="type-small text-muted-foreground">Kumpul · {t.footer.tagline}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 type-small">
          <HealthStatus />
          <Link href="/tentang" className="text-muted-foreground hover:text-foreground">
            {t.nav.about}
          </Link>
          <Link href="/api/docs" className="text-muted-foreground hover:text-foreground">
            {t.nav.apiDocs}
          </Link>
        </div>
      </div>
    </footer>
  );
}
