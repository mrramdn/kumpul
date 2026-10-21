"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { format } from "@/i18n/format";
import { sendJson } from "@/lib/client-api";
import { useDictionary } from "./dictionary-provider";
import { buttonClass, iconButtonClass } from "./ui";

/** Tombol X di samping peserta. Klik pertama minta konfirmasi, klik kedua menghapus. */
export function RemoveAttendeeButton({
  eventId,
  registrationId,
  name,
}: {
  eventId: string;
  registrationId: string;
  name: string;
}) {
  const t = useDictionary();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setPending(true);
    const result = await sendJson(
      `/api/events/${eventId}/registrations/${registrationId}`,
      "DELETE",
      undefined,
      t.error.network,
    );
    setPending(false);
    if (result.ok) {
      router.refresh();
      return;
    }
    setError(result.message);
    setConfirming(false);
  }

  if (confirming) {
    return (
      <span className="flex shrink-0 items-center gap-1">
        <span className="type-small text-muted-foreground">{t.event.removeConfirm}</span>
        <button type="button" disabled={pending} onClick={remove} className={buttonClass("destructive", "compact")}>
          {t.event.remove}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className={buttonClass("ghost", "compact")}>
          {t.event.cancel}
        </button>
      </span>
    );
  }

  return (
    <span className="flex shrink-0 items-center gap-2">
      {error && <span className="type-caption text-destructive">{error}</span>}
      <button
        type="button"
        aria-label={format(t.event.removeAttendee, { name })}
        onClick={() => {
          setError(null);
          setConfirming(true);
        }}
        className={iconButtonClass}
      >
        <X aria-hidden className="size-4" />
      </button>
    </span>
  );
}
