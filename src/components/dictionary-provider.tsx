"use client";

import { createContext, useContext } from "react";
import type { Dictionary } from "@/i18n/id";

// Kamus bahasa untuk komponen di browser. Server memilih bahasanya (cookie kumpul_lang),
// layout mengirim kamus itu ke sini satu kali.
const DictionaryContext = createContext<Dictionary | null>(null);

export function DictionaryProvider({ dictionary, children }: { dictionary: Dictionary; children: React.ReactNode }) {
  return <DictionaryContext value={dictionary}>{children}</DictionaryContext>;
}

export function useDictionary() {
  const dictionary = useContext(DictionaryContext);
  if (!dictionary) throw new Error("DictionaryProvider belum dipasang di layout.");
  return dictionary;
}
