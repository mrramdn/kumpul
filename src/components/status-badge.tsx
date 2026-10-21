import type { Dictionary } from "@/i18n/id";
import { format } from "@/i18n/format";
import type { EventStatus } from "@/lib/event-status";

const DOT: Record<EventStatus["kind"], string> = {
  ended: "bg-muted-foreground",
  ongoing: "bg-success",
  full: "bg-destructive",
  "few-left": "bg-warning",
  open: "bg-success",
};

export function statusLabel(status: EventStatus, t: Dictionary) {
  switch (status.kind) {
    case "ended":
      return t.status.ended;
    case "ongoing":
      return t.status.ongoing;
    case "full":
      return t.status.full;
    case "few-left":
      return format(t.status.fewLeft, { count: status.spotsLeft ?? 0 });
    case "open":
      return t.status.open;
  }
}

/** Status selalu titik berwarna + kata, tidak pernah warna saja. */
export function StatusBadge({ status, t }: { status: EventStatus; t: Dictionary }) {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-secondary px-3 type-caption">
      <span aria-hidden className={`size-1.5 rounded-full ${DOT[status.kind]}`} />
      {statusLabel(status, t)}
    </span>
  );
}
