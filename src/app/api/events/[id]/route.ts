import { requireUser } from "@/lib/auth";
import { deleteEvent, getEvent, updateEvent } from "@/lib/events";
import { ApiError, handle, json, noContent, parseId, readJson } from "@/lib/http";
import { eventSchema } from "@/lib/validation";

type Context = RouteContext<"/api/events/[id]">;

export const GET = handle(async (_request, context: Context, t) => {
  const event = await getEvent(parseId((await context.params).id, t.fields.eventId));
  if (!event) throw new ApiError(404, "EVENT_NOT_FOUND");
  return json(event);
});

/** Hanya pemilik acara atau admin (403 untuk akun lain). */
export const PUT = handle(async (request, context: Context, t) => {
  const user = await requireUser();
  const id = parseId((await context.params).id, t.fields.eventId);
  const input = eventSchema(t).parse(await readJson(request));
  return json(await updateEvent(id, user, input));
});

/** Hanya pemilik acara atau admin (403 untuk akun lain). */
export const DELETE = handle(async (_request, context: Context, t) => {
  const user = await requireUser();
  await deleteEvent(parseId((await context.params).id, t.fields.eventId), user);
  return noContent();
});
