import type { Event } from "./events";

export type EventStatus = {
  kind: "ended" | "ongoing" | "full" | "few-left" | "open";
  /** Sisa kursi, atau null kalau tanpa batas kuota. */
  spotsLeft: number | null;
};

export function eventStatus(
  event: Pick<Event, "startsAt" | "endsAt" | "capacity" | "registeredCount">,
  now: Date,
): EventStatus {
  const spotsLeft = event.capacity === null ? null : Math.max(event.capacity - event.registeredCount, 0);
  if (event.endsAt <= now) return { kind: "ended", spotsLeft };
  if (spotsLeft === 0) return { kind: "full", spotsLeft };
  if (event.startsAt <= now) return { kind: "ongoing", spotsLeft };
  // "Hampir penuh": sisa 3 kursi atau kurang, atau sisa 20% kapasitas.
  if (spotsLeft !== null && event.capacity !== null && spotsLeft <= Math.max(3, Math.ceil(event.capacity * 0.2))) {
    return { kind: "few-left", spotsLeft };
  }
  return { kind: "open", spotsLeft };
}

export function registrationClosed(status: EventStatus) {
  return status.kind === "ended" || status.kind === "full";
}
