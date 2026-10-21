import { isOrganizer } from "@/lib/auth";
import { createRegistration, eventExists, listRegistrations } from "@/lib/events";
import { maskEmail } from "@/lib/format";
import { ApiError, handle, json, parseId, readJson } from "@/lib/http";
import { registrationSchema } from "@/lib/validation";

type Context = RouteContext<"/api/events/[id]/registrations">;

export const GET = handle(async (_request, context: Context, t) => {
  const id = parseId((await context.params).id, t.fields.eventId);
  if (!(await eventExists(id))) throw new ApiError(404, "EVENT_NOT_FOUND");
  const registrations = await listRegistrations(id);
  // Siapa saja bisa membuka daftar ini, jadi email hanya ditampilkan utuh untuk penyelenggara.
  if (await isOrganizer()) return json(registrations);
  return json(registrations.map((registration) => ({ ...registration, email: maskEmail(registration.email) })));
});

// Mendaftar tidak perlu masuk: cukup nama dan email.
export const POST = handle(async (request, context: Context, t) => {
  const id = parseId((await context.params).id, t.fields.eventId);
  const input = registrationSchema(t).parse(await readJson(request));
  return json(await createRegistration(id, input), { status: 201 });
});
