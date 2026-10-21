import { cookies } from "next/headers";
import { z } from "zod";
import { format } from "@/i18n/format";
import { isOrganizer } from "@/lib/auth";
import { ApiError, handle, json, noContent, readJson } from "@/lib/http";
import { authEnabled, checkPassword, createSession, SESSION_COOKIE } from "@/lib/session";

export const GET = handle(async () => {
  return json({ authEnabled: authEnabled(), organizer: await isOrganizer() });
});

export const POST = handle(async (request, _context, t) => {
  const required = format(t.validation.required, { label: t.fields.password });
  const { password } = z
    .object({ password: z.string({ error: required }).min(1, required).max(200) })
    .parse(await readJson(request));
  if (!authEnabled()) return json({ authEnabled: false, organizer: true });
  if (!checkPassword(password)) throw new ApiError(401, "WRONG_PASSWORD", { field: "password" });

  const session = createSession();
  (await cookies()).set(SESSION_COOKIE, session.value, {
    httpOnly: true,
    sameSite: "lax",
    // Di server, nginx meneruskan X-Forwarded-Proto: https. Di laptop (http://localhost) cookie tetap jalan.
    secure: request.headers.get("x-forwarded-proto") === "https",
    path: "/",
    expires: session.expires,
  });
  return json({ authEnabled: true, organizer: true });
});

export const DELETE = handle(async () => {
  (await cookies()).delete(SESSION_COOKIE);
  return noContent();
});
