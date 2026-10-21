import { getCurrentUser, requireUser } from "@/lib/auth";
import { createRegistration, getEvent, listRegistrations } from "@/lib/events";
import { maskEmail } from "@/lib/format";
import { ApiError, handle, json, parseId } from "@/lib/http";

type Context = RouteContext<"/api/events/[id]/registrations">;

/** Siapa saja boleh melihat daftar peserta; email lengkap hanya untuk pemilik acara dan admin. */
export const GET = handle(async (_request, context: Context, t) => {
  const event = await getEvent(parseId((await context.params).id, t.fields.eventId));
  if (!event) throw new ApiError(404, "EVENT_NOT_FOUND");
  const [registrations, user] = await Promise.all([listRegistrations(event.id), getCurrentUser()]);
  if (user && (user.id === event.ownerId || user.isAdmin)) return json(registrations);
  return json(registrations.map((registration) => ({ ...registration, email: maskEmail(registration.email) })));
});

/** Akun yang sedang masuk mendaftarkan dirinya sendiri. Tidak perlu body. */
export const POST = handle(async (_request, context: Context, t) => {
  const user = await requireUser();
  const id = parseId((await context.params).id, t.fields.eventId);
  return json(await createRegistration(id, user.id), { status: 201 });
});
