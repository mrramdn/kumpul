import { ArrowLeft, CalendarDays, MapPin, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getDictionary } from "@/i18n";
import { format } from "@/i18n/format";
import { goingLabel } from "@/components/event-card";
import { RegistrationForm } from "@/components/registration-form";
import { RemoveAttendeeButton } from "@/components/remove-attendee-button";
import { StatusBadge } from "@/components/status-badge";
import { buttonClass, cardClass, pageClass } from "@/components/ui";
import { isOrganizer } from "@/lib/auth";
import { eventStatus, registrationClosed } from "@/lib/event-status";
import { getEvent, listRegistrations } from "@/lib/events";
import { initials, maskEmail } from "@/lib/format";
import { isUuid } from "@/lib/http";
import { authEnabled } from "@/lib/session";
import { formatFullDate, formatTimeRange } from "@/lib/time";

// generateMetadata dan halaman sama-sama butuh acaranya; cache() membuatnya cukup satu query per request.
const loadEvent = cache(async (id: string) => (isUuid(id) ? getEvent(id.toLowerCase()) : null));

export async function generateMetadata({ params }: PageProps<"/acara/[id]">): Promise<Metadata> {
  const event = await loadEvent((await params).id).catch(() => null);
  return event ? { title: event.title, description: event.description.slice(0, 160) } : {};
}

export default async function EventPage({ params }: PageProps<"/acara/[id]">) {
  const event = await loadEvent((await params).id);
  if (!event) notFound();

  const [t, registrations, organizer] = await Promise.all([
    getDictionary(),
    listRegistrations(event.id),
    isOrganizer(),
  ]);
  const status = eventStatus(event, new Date());
  const closed = registrationClosed(status);

  return (
    <div className={pageClass}>
      <Link href="/" className={buttonClass("ghost", "small", "-ml-3")}>
        <ArrowLeft aria-hidden className="size-4" />
        {t.event.back}
      </Link>

      {/* lg: dua kolom (isi | pendaftaran). xl: tiga kolom (isi | peserta | pendaftaran). */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_24rem]">
        <div className="space-y-4 lg:col-start-1 lg:row-start-1">
          <section className={`${cardClass} p-6 sm:p-7`}>
            <StatusBadge status={status} t={t} />
            <h1 className="mt-4 type-h1 break-words">{event.title}</h1>
            <p className="mt-2 type-small text-muted-foreground">
              {t.event.hostedBy} <span className="font-medium text-foreground">{event.host}</span>
            </p>
            <dl className="mt-6 space-y-4">
              <div className="flex gap-3">
                <dt className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary">
                  <CalendarDays aria-hidden className="size-4" />
                  <span className="sr-only">{t.fields.startsAt}</span>
                </dt>
                <dd>
                  <p className="type-ui">{formatFullDate(event.startsAt, t.locale)}</p>
                  <p className="type-small text-muted-foreground">
                    {formatTimeRange(event.startsAt, event.endsAt, t.locale)}
                  </p>
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary">
                  <MapPin aria-hidden className="size-4" />
                  <span className="sr-only">{t.fields.location}</span>
                </dt>
                <dd className="flex items-center type-ui break-words">{event.location}</dd>
              </div>
            </dl>
          </section>

          <section className={`${cardClass} p-6 sm:p-7`}>
            <h2 className="type-title">{t.event.about}</h2>
            <p
              className={`mt-3 type-body whitespace-pre-line break-words ${event.description ? "" : "text-muted-foreground"}`}
            >
              {event.description || t.event.noDescription}
            </p>
          </section>
        </div>

        <section className={`${cardClass} p-6 sm:p-7 lg:col-start-1 lg:row-start-2 xl:col-start-2 xl:row-start-1`}>
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="type-title">{t.event.attendees}</h2>
            <span className="type-small text-muted-foreground">{goingLabel(event, t)}</span>
          </div>
          {registrations.length === 0 ? (
            <p className="mt-3 type-small text-muted-foreground">{t.event.noAttendees}</p>
          ) : (
            <ul className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border">
              {registrations.map((registration) => (
                <li key={registration.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
                  <span
                    aria-hidden
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary type-caption"
                  >
                    {initials(registration.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate type-ui">{registration.name}</span>
                    <span className="block truncate type-caption text-muted-foreground">
                      {organizer ? registration.email : maskEmail(registration.email)}
                    </span>
                  </span>
                  {organizer && (
                    <RemoveAttendeeButton
                      eventId={event.id}
                      registrationId={registration.id}
                      name={registration.name}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 xl:col-start-3 xl:row-span-1">
          <section className={`${cardClass} p-6`}>
            <h2 className="type-title">{t.registration.title}</h2>
            {event.capacity === null ? (
              <p className="mt-1 type-small text-muted-foreground">{t.registration.unlimited}</p>
            ) : (
              <div className="mt-3">
                <p className="mb-2 flex justify-between gap-2 type-small">
                  <span>
                    {format(t.registration.spotsLeft, { left: status.spotsLeft ?? 0, capacity: event.capacity })}
                  </span>
                  <span className="text-muted-foreground">
                    {event.registeredCount}/{event.capacity}
                  </span>
                </p>
                <div
                  role="progressbar"
                  aria-label={t.registration.title}
                  aria-valuenow={event.registeredCount}
                  aria-valuemin={0}
                  aria-valuemax={event.capacity}
                  className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
                >
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, (event.registeredCount / event.capacity) * 100)}%` }}
                  />
                </div>
              </div>
            )}
            {closed ? (
              <p className="mt-5 rounded-lg bg-secondary px-4 py-3 type-small">
                {status.kind === "ended" ? t.registration.closedEnded : t.registration.closedFull}
              </p>
            ) : (
              <RegistrationForm eventId={event.id} />
            )}
          </section>

          {organizer ? (
            <section className={`${cardClass} p-6`}>
              <h2 className="type-title">{t.event.manage}</h2>
              <p className="mt-1 type-small text-muted-foreground">{t.event.manageHint}</p>
              <Link href={`/acara/${event.id}/ubah`} className={buttonClass("secondary", "small", "mt-5")}>
                <Pencil aria-hidden className="size-4" />
                {t.event.edit}
              </Link>
            </section>
          ) : (
            authEnabled() && (
              <Link
                href={`/masuk?lanjut=/acara/${event.id}`}
                className="block rounded-full px-2 type-small text-muted-foreground hover:text-foreground"
              >
                {t.event.organizerLogin}
              </Link>
            )
          )}
        </aside>
      </div>
    </div>
  );
}
