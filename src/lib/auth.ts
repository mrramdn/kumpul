import { cookies } from "next/headers";
import { cache } from "react";
import { SESSION_COOKIE } from "./cookies";
import { ApiError } from "./http";
import { createSession, deleteSession, findSessionUser, SESSION_MAX_AGE } from "./users";

/** Akun yang sedang masuk (dari cookie sesi), atau null. Cukup satu query per request. */
export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? findSessionUser(token) : null;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "UNAUTHORIZED");
  return user;
}

export async function startSession(userId: string, request: Request) {
  const token = await createSession(userId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Di server, nginx meneruskan X-Forwarded-Proto: https. Di laptop (http://localhost) cookie tetap jalan.
    secure: request.headers.get("x-forwarded-proto") === "https",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  store.delete(SESSION_COOKIE);
}
