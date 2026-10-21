import { requireOrganizer } from "@/lib/auth";
import { deleteRegistration } from "@/lib/events";
import { handle, noContent, parseId } from "@/lib/http";

type Context = RouteContext<"/api/events/[id]/registrations/[registrationId]">;

export const DELETE = handle(async (_request, context: Context, t) => {
  await requireOrganizer();
  const params = await context.params;
  await deleteRegistration(
    parseId(params.id, t.fields.eventId),
    parseId(params.registrationId, t.fields.registrationId),
  );
  return noContent();
});
