"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { sendJson } from "@/lib/client-api";
import { useDictionary } from "./dictionary-provider";
import { buttonClass } from "./ui";

export function LogoutButton() {
  const t = useDictionary();
  const router = useRouter();

  async function logout() {
    await sendJson("/api/session", "DELETE", undefined, t.error.network);
    router.push("/");
    router.refresh();
  }

  return (
    <button type="button" onClick={logout} className={buttonClass("ghost", "small")}>
      <LogOut aria-hidden className="size-4" />
      <span className="hidden sm:inline">{t.nav.logout}</span>
    </button>
  );
}
