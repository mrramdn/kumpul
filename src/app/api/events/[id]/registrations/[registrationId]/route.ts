import { requireUser } from "@/lib/auth";
import { deleteRegistration } from "@/lib/events";
import { handle, noContent, parseId } from "@/lib/http";

type Context = RouteContext<"/api/events/[id]/registrations/[registrationId]">;

/** Peserta membatalkan pendaftarannya sendiri, atau pemilik acara (atau admin) menghapus peserta. */
export const DELETE = handle(async (_request, context: Context, t) => {
  const user = await requireUser();
  const params = await context.params;
  await deleteRegistration(
    parseId(params.id, t.fields.eventId),
    parseId(params.registrationId, t.fields.registrationId),
    user,
  );
  return noContent();
});
