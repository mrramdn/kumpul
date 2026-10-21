import { requireOrganizer } from "@/lib/auth";
import { createEvent, listEvents, type EventFilter } from "@/lib/events";
import { ApiError, handle, json, readJson } from "@/lib/http";
import { eventSchema } from "@/lib/validation";

const FILTERS: EventFilter[] = ["upcoming", "past", "all"];

export const GET = handle(async (request) => {
  const when = new URL(request.url).searchParams.get("when") ?? "all";
  if (!FILTERS.includes(when as EventFilter)) throw new ApiError(400, "INVALID_FILTER");
  return json(await listEvents(when as EventFilter));
});

export const POST = handle(async (request, _context, t) => {
  await requireOrganizer();
  const input = eventSchema(t).parse(await readJson(request));
  const event = await createEvent(input);
  return json(event, { status: 201, headers: { Location: `/api/events/${event.id}` } });
});
