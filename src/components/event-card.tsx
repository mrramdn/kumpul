import { MapPin } from "lucide-react";
import Link from "next/link";
import type { Dictionary } from "@/i18n/id";
import { format } from "@/i18n/format";
import { eventStatus } from "@/lib/event-status";
import type { Event } from "@/lib/events";
import { formatTimeRange } from "@/lib/time";
import { AttendeeAvatars } from "./attendee-avatars";
import { StatusBadge } from "./status-badge";
import { cardClass } from "./ui";

export function goingLabel(event: Pick<Event, "registeredCount" | "capacity">, t: Dictionary) {
  return event.capacity === null
    ? format(t.event.going, { count: event.registeredCount })
    : format(t.event.goingOf, { count: event.registeredCount, capacity: event.capacity });
}

export function EventCard({ event, t, now, day }: { event: Event; t: Dictionary; now: Date; day: string }) {
  return (
    <Link
      href={`/acara/${event.id}`}
      className={`${cardClass} flex h-full flex-col p-6 transition-colors hover:border-input focus-visible:border-input`}
    >
      <p className="type-ui">{day}</p>
      <p className="type-small text-muted-foreground">{formatTimeRange(event.startsAt, event.endsAt, t.locale)}</p>
      <h3 className="mt-4 type-title break-words">{event.title}</h3>
      <p className="mt-1 type-small text-muted-foreground">{format(t.event.by, { host: event.host })}</p>
      <p className="mt-3 flex items-center gap-1.5 type-small text-muted-foreground">
        <MapPin aria-hidden className="size-4 shrink-0" />
        <span className="truncate">{event.location}</span>
      </p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
        <StatusBadge status={eventStatus(event, now)} t={t} />
        <span className="flex items-center gap-2.5">
          <AttendeeAvatars names={event.firstAttendees} total={event.registeredCount} />
          <span className="type-caption text-muted-foreground">{goingLabel(event, t)}</span>
        </span>
      </div>
    </Link>
  );
}
