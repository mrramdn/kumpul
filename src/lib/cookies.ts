// Nama cookie di satu tempat. File ini tidak memakai API Next.js atau database,
// jadi aman dipakai juga di src/proxy.ts dan di komponen browser.

/** Token sesi akun (HttpOnly). */
export const SESSION_COOKIE = "kumpul_session";
/** Bahasa pilihan: "id" atau "en". */
export const LANG_COOKIE = "kumpul_lang";
/** Tema pilihan: "light" atau "dark". */
export const THEME_COOKIE = "kumpul_theme";

/** Satu tahun, untuk cookie preferensi (bahasa dan tema). */
export const PREFERENCE_MAX_AGE = 60 * 60 * 24 * 365;
