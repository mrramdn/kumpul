"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { format } from "@/i18n/format";
import { sendJson } from "@/lib/client-api";
import { useDictionary } from "./dictionary-provider";
import { FormMessage } from "./field";
import { buttonClass, cardClass } from "./ui";

export function DeleteEvent({ eventId, registeredCount }: { eventId: string; registeredCount: number }) {
  const t = useDictionary();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function remove() {
    setPending(true);
    setMessage(null);
    const result = await sendJson(`/api/events/${eventId}`, "DELETE", undefined, t.error.network);
    if (result.ok) {
      router.push("/");
      router.refresh();
      return;
    }
    setPending(false);
    setMessage(result.message);
  }

  return (
    <section className={`${cardClass} p-6 sm:p-7`}>
      <h2 className="type-title">{t.form.deleteTitle}</h2>
      <p className="mt-1 type-small text-muted-foreground">{format(t.form.deleteText, { count: registeredCount })}</p>
      <div className="mt-5 space-y-4">
        <FormMessage message={message} />
        {confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="type-small">{t.form.deleteConfirm}</span>
            <button type="button" disabled={pending} onClick={remove} className={buttonClass("destructive", "small")}>
              {pending ? t.form.deleting : t.form.deleteYes}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className={buttonClass("ghost", "small")}>
              {t.form.cancel}
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className={buttonClass("secondary", "small")}>
            <Trash2 aria-hidden className="size-4" />
            {t.form.delete}
          </button>
        )}
      </div>
    </section>
  );
}
