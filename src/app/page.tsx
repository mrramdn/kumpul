import { CalendarPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary, type Dictionary } from "@/i18n";
import { EventCard } from "@/components/event-card";
import { buttonClass, cardClass, pageClass } from "@/components/ui";
import { listEvents } from "@/lib/events";
import { dayKey, formatDayMonth, formatWeekday } from "@/lib/time";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.home.title };
}

/** "Hari ini", "Besok", atau "Sabtu, 24 Okt". */
function dayLabel(date: Date, now: Date, t: Dictionary) {
  const day = dayKey(date);
  if (day === dayKey(now)) return t.time.today;
  if (day === dayKey(new Date(now.getTime() + 24 * 60 * 60 * 1000))) return t.time.tomorrow;
  return `${formatWeekday(date, t.locale)}, ${formatDayMonth(date, t.locale)}`;
}

const segmentClass =
  "inline-flex h-9 items-center rounded-full px-4 type-ui text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:bg-card aria-[current=page]:text-foreground aria-[current=page]:shadow-sm";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const t = await getDictionary();
  const past = (await searchParams).when === "past";
  const events = await listEvents(past ? "past" : "upcoming");
  const now = new Date();

  return (
    <div className={pageClass}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="type-h1">{t.home.title}</h1>
          <p className="mt-1 type-small text-muted-foreground">{t.home.subtitle}</p>
        </div>
        <nav aria-label={t.home.title} className="inline-flex rounded-full bg-secondary p-1">
          <Link href="/" aria-current={past ? undefined : "page"} className={segmentClass}>
            {t.home.upcoming}
          </Link>
          <Link href="/?when=past" aria-current={past ? "page" : undefined} className={segmentClass}>
            {t.home.past}
          </Link>
        </nav>
      </div>

      {events.length === 0 ? (
        <div className={`${cardClass} mt-8 flex flex-col items-center gap-4 px-6 py-14 text-center`}>
          <CalendarPlus aria-hidden className="size-6 text-muted-foreground" />
          <p className="type-body text-muted-foreground">{past ? t.home.emptyPast : t.home.emptyUpcoming}</p>
          {!past && (
            <Link href="/acara/baru" className={buttonClass("primary", "small")}>
              {t.home.createFirst}
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} t={t} now={now} day={dayLabel(event.startsAt, now, t)} />
          ))}
        </div>
      )}
    </div>
  );
}
