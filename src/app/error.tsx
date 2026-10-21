"use client";

import { CircleAlert } from "lucide-react";
import { format } from "@/i18n/format";
import { useDictionary } from "@/components/dictionary-provider";
import { buttonClass, cardClass, narrowPageClass } from "@/components/ui";

// Tampil kalau halaman gagal dirender, misalnya database mati saat halaman mengambil data.
// Detail errornya ada di log server: docker compose logs web
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useDictionary();
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  return (
    <div className={narrowPageClass}>
      <div className={`${cardClass} flex flex-col items-center px-6 py-14 text-center`}>
        <CircleAlert aria-hidden className="size-6 text-destructive" />
        <h1 className="mt-4 type-h2">{t.error.title}</h1>
        <p className="mt-2 type-small text-muted-foreground">{t.error.text}</p>
        {digest && <p className="mt-2 type-caption text-muted-foreground">{format(t.error.code, { digest })}</p>}
        <button type="button" onClick={() => retry()} className={buttonClass("primary", "small", "mt-6")}>
          {t.error.retry}
        </button>
      </div>
    </div>
  );
}
