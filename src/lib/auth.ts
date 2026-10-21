import { cookies, headers } from "next/headers";
import { ApiError } from "./http";
import { authEnabled, checkPassword, SESSION_COOKIE, verifySession } from "./session";

/**
 * Penyelenggara = punya cookie sesi yang sah, atau mengirim header "Authorization: Bearer <password>"
 * (untuk curl dan tombol Authorize di /api/docs).
 */
export async function isOrganizer() {
  if (!authEnabled()) return true;
  const bearer = (await headers()).get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (bearer && checkPassword(bearer)) return true;
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function requireOrganizer() {
  if (!(await isOrganizer())) {
    throw new ApiError(401, "UNAUTHORIZED");
  }
}
