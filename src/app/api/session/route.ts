import { endSession, getCurrentUser, startSession } from "@/lib/auth";
import { handle, json, noContent, readJson } from "@/lib/http";
import { authenticate } from "@/lib/users";
import { loginSchema } from "@/lib/validation";

/** Akun yang sedang masuk, atau null. */
export const GET = handle(async () => {
  return json({ user: await getCurrentUser() });
});

/** Masuk: email dan password. Server memasang cookie sesi HttpOnly. */
export const POST = handle(async (request, _context, t) => {
  const input = loginSchema(t).parse(await readJson(request));
  const user = await authenticate(input.email, input.password);
  await startSession(user.id, request);
  return json({ user });
});

/** Keluar: sesi dihapus dari database, cookie dihapus dari browser. */
export const DELETE = handle(async () => {
  await endSession();
  return noContent();
});
