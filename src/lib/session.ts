import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Sesi penyelenggara: satu password bersama (ORGANIZER_PASSWORD) untuk membuat, mengubah, dan menghapus acara.
// Setelah password benar, browser menyimpan cookie "<waktu kedaluwarsa>.<tanda tangan HMAC>".
// Tanda tangannya dibuat dengan password itu sendiri, jadi mengganti password langsung membatalkan semua sesi.
// File ini tidak memakai API Next.js, supaya bisa dipakai juga di src/proxy.ts.

export const SESSION_COOKIE = "kumpul_penyelenggara";
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

function organizerPassword() {
  return process.env.ORGANIZER_PASSWORD ?? "";
}

/** Kalau ORGANIZER_PASSWORD kosong, siapa pun boleh mengelola acara (mode terbuka, misalnya untuk latihan). */
export function authEnabled() {
  return organizerPassword().length > 0;
}

function sign(expiresAt: number) {
  return createHmac("sha256", organizerPassword()).update(`penyelenggara:${expiresAt}`).digest("base64url");
}

// Perbandingan dengan waktu yang sama panjang, supaya isi rahasia tidak bisa ditebak dari lama respons.
function sameText(a: string, b: string) {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}

export function checkPassword(candidate: string) {
  return authEnabled() && sameText(candidate, organizerPassword());
}

export function createSession() {
  const expiresAt = Date.now() + SESSION_MS;
  return { value: `${expiresAt}.${sign(expiresAt)}`, expires: new Date(expiresAt) };
}

export function verifySession(value: string | undefined) {
  if (!authEnabled() || !value) return false;
  const [expiresText, signature] = value.split(".");
  const expiresAt = Number(expiresText);
  if (!signature || !Number.isSafeInteger(expiresAt) || expiresAt < Date.now()) return false;
  return sameText(signature, sign(expiresAt));
}
