import { requireOrganizer } from "@/lib/auth";
import { deleteEvent, getEvent, updateEvent } from "@/lib/events";
import { ApiError, handle, json, noContent, parseId, readJson } from "@/lib/http";
import { eventSchema } from "@/lib/validation";

type Context = RouteContext<"/api/events/[id]">;

export const GET = handle(async (_request, context: Context, t) => {
  const event = await getEvent(parseId((await context.params).id, t.fields.eventId));
  if (!event) throw new ApiError(404, "EVENT_NOT_FOUND");
  return json(event);
});

export const PUT = handle(async (request, context: Context, t) => {
  await requireOrganizer();
  const id = parseId((await context.params).id, t.fields.eventId);
  const input = eventSchema(t).parse(await readJson(request));
  return json(await updateEvent(id, input));
});

export const DELETE = handle(async (_request, context: Context, t) => {
  await requireOrganizer();
  await deleteEvent(parseId((await context.params).id, t.fields.eventId));
  return noContent();
});
