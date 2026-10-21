import { ArrowUpRight, Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@/i18n";
import { cardClass, pageClass } from "@/components/ui";

const REPOSITORY = "https://github.com/mrramdn/kumpul";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.nav.about };
}

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 type-small">
          <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          {item}
        </li>
      ))}
    </ul>
  );
}

export default async function AboutPage() {
  const t = await getDictionary();
  const linkClass = "flex h-12 items-center justify-between gap-4 px-4 type-ui hover:bg-accent";

  return (
    <div className={pageClass}>
      <h1 className="type-h1">{t.about.title}</h1>
      <p className="mt-2 max-w-3xl type-body text-muted-foreground">{t.about.intro}</p>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <section className={`${cardClass} p-6 sm:p-7`}>
          <h2 className="type-title">{t.about.organizersTitle}</h2>
          <FeatureList items={t.about.organizers} />
        </section>
        <section className={`${cardClass} p-6 sm:p-7`}>
          <h2 className="type-title">{t.about.attendeesTitle}</h2>
          <FeatureList items={t.about.attendees} />
        </section>
        <section className={`${cardClass} p-6 sm:p-7`}>
          <h2 className="type-title">{t.about.privacyTitle}</h2>
          <p className="mt-4 type-small">{t.about.privacy}</p>
        </section>
      </div>

      <section className={`${cardClass} mt-4 grid gap-6 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]`}>
        <div>
          <h2 className="type-title">{t.about.developersTitle}</h2>
          <p className="mt-2 type-small text-muted-foreground">{t.about.developers}</p>
        </div>
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          <li>
            <Link href="/api/docs" className={linkClass}>
              {t.about.apiDocs}
              <ArrowUpRight aria-hidden className="size-4 text-muted-foreground" />
            </Link>
          </li>
          <li>
            <a href="/api/health" className={linkClass}>
              {t.about.health}
              <ArrowUpRight aria-hidden className="size-4 text-muted-foreground" />
            </a>
          </li>
          <li>
            <a href={REPOSITORY} className={linkClass}>
              {t.about.repo}
              <ArrowUpRight aria-hidden className="size-4 text-muted-foreground" />
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
