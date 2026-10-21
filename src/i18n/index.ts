import { cookies, headers } from "next/headers";
import { en } from "./en";
import { id, type Dictionary } from "./id";

export type { Dictionary, ErrorCode } from "./id";

export const LANG_COOKIE = "kumpul_lang";
export const dictionaries = { id, en } satisfies Record<string, Dictionary>;
export type Lang = keyof typeof dictionaries;

function isLang(value: string | undefined): value is Lang {
  return value === "id" || value === "en";
}

/** Bahasa dipilih lewat tombol ID/EN (cookie). Kalau belum pernah memilih, ikut bahasa browser; selain Inggris, Indonesia. */
export async function getLang(): Promise<Lang> {
  const chosen = (await cookies()).get(LANG_COOKIE)?.value;
  if (isLang(chosen)) return chosen;
  const accepted = (await headers()).get("accept-language") ?? "";
  return /^en\b/i.test(accepted) ? "en" : "id";
}

export async function getDictionary() {
  return dictionaries[await getLang()];
}
