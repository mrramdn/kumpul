"use client";

import { useEffect, useState } from "react";
import { useDictionary } from "./dictionary-provider";

type State = "checking" | "ok" | "databaseDown" | "serverDown";

const DOT: Record<State, string> = {
  checking: "bg-muted-foreground",
  ok: "bg-success",
  databaseDown: "bg-destructive",
  serverDown: "bg-destructive",
};

/** Memanggil /api/health setiap 10 detik. Saat container db dimatikan, indikator ini berubah merah. */
export function HealthStatus() {
  const t = useDictionary();
  const [state, setState] = useState<State>("checking");

  useEffect(() => {
    let active = true;
    async function check() {
      let next: State;
      try {
        const response = await fetch("/api/health", { cache: "no-store" });
        const body = await response.json().catch(() => null);
        next = response.ok ? "ok" : body?.database === "down" ? "databaseDown" : "serverDown";
      } catch {
        next = "serverDown";
      }
      if (active) setState(next);
    }
    check();
    const timer = setInterval(check, 10_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <a
      href="/api/health"
      role="status"
      className="inline-flex h-7 items-center gap-1.5 rounded-full bg-secondary px-3 type-caption transition-colors hover:bg-input/60"
    >
      <span aria-hidden className={`size-1.5 rounded-full ${DOT[state]}`} />
      {t.health[state]}
    </a>
  );
}
