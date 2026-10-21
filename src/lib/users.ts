import { createHash, randomBytes } from "node:crypto";
import { query } from "./db";
import { ApiError } from "./http";
import { hashPassword, verifyPassword } from "./password";
import type { RegisterInput } from "./validation";

export type User = {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  createdAt: Date;
};

type UserRow = { id: string; name: string; email: string; is_admin: boolean; created_at: Date };

function toUser(row: UserRow): User {
  return { id: row.id, name: row.name, email: row.email, isAdmin: row.is_admin, createdAt: row.created_at };
}

const SESSION_DAYS = 30;
/** Umur cookie sesi dalam detik. */
export const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createUser(input: RegisterInput) {
  const passwordHash = await hashPassword(input.password);
  try {
    const [row] = await query<UserRow>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, is_admin, created_at`,
      [input.name, input.email, passwordHash],
    );
    return toUser(row);
  } catch (error) {
    // 23505 = unique_violation: email sudah dipakai akun lain.
    if ((error as { code?: unknown }).code === "23505") throw new ApiError(409, "EMAIL_TAKEN", { field: "email" });
    throw error;
  }
}

// Hash yang tidak cocok dengan password apa pun. Dipakai saat email tidak ditemukan, supaya scrypt tetap
// berjalan dan lama respons tidak membocorkan email mana yang terdaftar.
let unusedHash: Promise<string> | undefined;

export async function authenticate(email: string, password: string) {
  const [row] = await query<UserRow & { password_hash: string | null }>(
    "SELECT id, name, email, is_admin, created_at, password_hash FROM users WHERE email = $1",
    [email],
  );
  unusedHash ??= hashPassword(randomBytes(16).toString("hex"));
  const valid = await verifyPassword(password, row?.password_hash ?? (await unusedHash));
  if (!row || !row.password_hash || !valid) throw new ApiError(401, "INVALID_CREDENTIALS", { field: "password" });
  return toUser(row);
}

export async function deleteUser(userId: string) {
  // Acara, pendaftaran, dan sesi milik akun ini ikut terhapus (ON DELETE CASCADE).
  await query("DELETE FROM users WHERE id = $1", [userId]);
}

/** Membuat sesi baru dan mengembalikan token untuk cookie. Database hanya menyimpan hash token. */
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  await query("DELETE FROM sessions WHERE expires_at < now()");
  await query(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + make_interval(days => $3))",
    [tokenHash(token), userId, SESSION_DAYS],
  );
  return token;
}

export async function findSessionUser(token: string) {
  const [row] = await query<UserRow>(
    `SELECT u.id, u.name, u.email, u.is_admin, u.created_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [tokenHash(token)],
  );
  return row ? toUser(row) : null;
}

export async function deleteSession(token: string) {
  await query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash(token)]);
}
