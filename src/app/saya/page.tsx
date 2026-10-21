import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDictionary } from "@/i18n";
import { format } from "@/i18n/format";
import { DeleteAccount } from "@/components/delete-account";
import { dayLabel, EventCard } from "@/components/event-card";
import { cardClass, pageClass } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { listEventsAttendedBy, listEventsOwnedBy, type Event } from "@/lib/events";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.mine.title };
}

export default async function MyEventsPage() {
  const [t, user] = await Promise.all([getDictionary(), getCurrentUser()]);
  if (!user) redirect("/masuk?lanjut=/saya");
  const [organizing, attending] = await Promise.all([listEventsOwnedBy(user.id), listEventsAttendedBy(user.id)]);
  const now = new Date();

  const section = (title: string, events: Event[], empty: string) => (
    <section>
      <h2 className="pt-8 pb-4 type-title">
        {title} <span className="type-small text-muted-foreground">({events.length})</span>
      </h2>
      {events.length === 0 ? (
        <p className={`${cardClass} px-6 py-8 type-small text-muted-foreground`}>{empty}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} t={t} now={now} day={dayLabel(event.startsAt, now, t)} />
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className={pageClass}>
      <h1 className="type-h1">{t.mine.title}</h1>
      <p className="mt-1 type-small text-muted-foreground">{t.mine.subtitle}</p>
      {section(t.mine.organizing, organizing, t.mine.emptyOrganizing)}
      {section(t.mine.attending, attending, t.mine.emptyAttending)}

      <h2 className="pt-8 pb-4 type-title">{t.mine.account}</h2>
      <section className={`${cardClass} p-6 sm:p-7`}>
        <p className="type-small">{format(t.mine.signedInAs, { name: user.name, email: user.email })}</p>
        <p className="mt-1 mb-5 type-small text-muted-foreground">{t.mine.deleteAccountText}</p>
        <DeleteAccount />
      </section>
    </div>
  );
}
