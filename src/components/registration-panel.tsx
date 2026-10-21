"use client";

import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { format } from "@/i18n/format";
import { sendJson } from "@/lib/client-api";
import { useDictionary } from "./dictionary-provider";
import { FormMessage } from "./field";
import { buttonClass } from "./ui";

type State =
  | { kind: "guest" }
  | { kind: "owner" }
  | { kind: "closed"; reason: "ended" | "full" }
  | { kind: "open"; name: string; email: string }
  | { kind: "registered"; registrationId: string; canCancel: boolean };

/** Bagian bawah kartu Pendaftaran di halaman acara. Isinya tergantung siapa yang melihat. */
export function RegistrationPanel({ eventId, state }: { eventId: string; state: State }) {
  const t = useDictionary();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run(method: "POST" | "DELETE", url: string) {
    setPending(true);
    setMessage(null);
    const result = await sendJson(url, method, undefined, t.error.network);
    setPending(false);
    setConfirming(false);
    if (result.ok) router.refresh();
    else setMessage(result.message);
  }

  const note = (text: string) => <p className="mt-5 rounded-lg bg-secondary px-4 py-3 type-small">{text}</p>;

  switch (state.kind) {
    case "owner":
      return note(t.registration.owner);
    case "closed":
      return note(state.reason === "ended" ? t.registration.closedEnded : t.registration.closedFull);
    case "guest":
      return (
        <div className="mt-5 space-y-4">
          <p className="type-small text-muted-foreground">{t.registration.loginHint}</p>
          <Link
            href={`/masuk?lanjut=${encodeURIComponent(`/acara/${eventId}`)}`}
            className={buttonClass("primary", "large", "w-full")}
          >
            {t.registration.loginToRegister}
          </Link>
        </div>
      );
    case "open":
      return (
        <div className="mt-5 space-y-4">
          <p className="type-small text-muted-foreground">
            {format(t.registration.registerAs, { name: state.name, email: state.email })}
          </p>
          <FormMessage message={message} />
          <button
            type="button"
            disabled={pending}
            onClick={() => run("POST", `/api/events/${eventId}/registrations`)}
            className={buttonClass("primary", "large", "w-full")}
          >
            {pending ? t.registration.submitting : t.registration.submit}
          </button>
        </div>
      );
    case "registered":
      return (
        <div className="mt-5 space-y-4">
          <p role="status" className="flex items-start gap-2 rounded-lg bg-secondary px-4 py-3 type-small">
            <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
            {t.registration.registered}
          </p>
          <FormMessage message={message} />
          {state.canCancel &&
            (confirming ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="type-small">{t.registration.cancelConfirm}</span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run("DELETE", `/api/events/${eventId}/registrations/${state.registrationId}`)}
                  className={buttonClass("destructive", "small")}
                >
                  {pending ? t.registration.cancelling : t.registration.cancelYes}
                </button>
                <button type="button" onClick={() => setConfirming(false)} className={buttonClass("ghost", "small")}>
                  {t.registration.keep}
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirming(true)} className={buttonClass("secondary", "small")}>
                {t.registration.cancel}
              </button>
            ))}
        </div>
      );
  }
}
