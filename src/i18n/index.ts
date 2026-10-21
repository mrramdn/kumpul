import { cookies, headers } from "next/headers";
import { LANG_COOKIE, THEME_COOKIE } from "@/lib/cookies";
import { en } from "./en";
import { id, type Dictionary } from "./id";

export type { Dictionary, ErrorCode } from "./id";

export const dictionaries = { id, en } satisfies Record<string, Dictionary>;
export type Lang = keyof typeof dictionaries;
export type Theme = "light" | "dark";

/** Bahasa dipilih lewat tombol ID/EN (cookie). Kalau belum pernah memilih, ikut bahasa browser; selain Inggris, Indonesia. */
export async function getLang(): Promise<Lang> {
  const chosen = (await cookies()).get(LANG_COOKIE)?.value;
  if (chosen === "id" || chosen === "en") return chosen;
  const accepted = (await headers()).get("accept-language") ?? "";
  return /^en\b/i.test(accepted) ? "en" : "id";
}

export async function getDictionary() {
  return dictionaries[await getLang()];
}

/** Tema dipilih lewat tombol di header (cookie). Bawaannya terang. */
export async function getTheme(): Promise<Theme> {
  return (await cookies()).get(THEME_COOKIE)?.value === "dark" ? "dark" : "light";
}
