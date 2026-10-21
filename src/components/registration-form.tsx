"use client";

import { CircleCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { format } from "@/i18n/format";
import { sendJson } from "@/lib/client-api";
import { useDictionary } from "./dictionary-provider";
import { FormMessage, TextField } from "./field";
import { buttonClass } from "./ui";

export function RegistrationForm({ eventId }: { eventId: string }) {
  const t = useDictionary();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [registeredName, setRegisteredName] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setErrors({});
    setMessage(null);

    const result = await sendJson<{ name: string }>(
      `/api/events/${eventId}/registrations`,
      "POST",
      { name: data.get("name"), email: data.get("email") },
      t.error.network,
    );
    setPending(false);
    if (result.ok) {
      setRegisteredName(result.data.name);
      form.reset();
      router.refresh();
      return;
    }
    setErrors(result.fields);
    // Kalau errornya sudah ditempel di isian (misalnya email sudah terdaftar), pesan umum tidak perlu diulang.
    if (Object.keys(result.fields).length === 0) setMessage(result.message);
  }

  return (
    <form onSubmit={submit} noValidate className="mt-5 space-y-4">
      {registeredName && (
        <p role="status" className="flex items-start gap-2 rounded-lg bg-secondary px-4 py-3 type-small">
          <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
          {format(t.registration.success, { name: registeredName })}
        </p>
      )}
      <TextField label={t.fields.name} name="name" autoComplete="name" required maxLength={80} error={errors.name} />
      <TextField
        label={t.fields.email}
        name="email"
        type="email"
        autoComplete="email"
        required
        maxLength={160}
        error={errors.email}
      />
      <FormMessage message={message} />
      <button type="submit" disabled={pending} className={buttonClass("primary", "large", "w-full")}>
        {pending ? t.registration.submitting : t.registration.submit}
      </button>
    </form>
  );
}
