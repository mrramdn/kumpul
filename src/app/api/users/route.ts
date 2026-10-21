import { startSession } from "@/lib/auth";
import { handle, json, readJson } from "@/lib/http";
import { createUser } from "@/lib/users";
import { registerSchema } from "@/lib/validation";

/** Membuat akun baru lalu langsung masuk. */
export const POST = handle(async (request, _context, t) => {
  const input = registerSchema(t).parse(await readJson(request));
  const user = await createUser(input);
  await startSession(user.id, request);
  return json({ user }, { status: 201 });
});
