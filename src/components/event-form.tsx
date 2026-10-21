"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { sendJson } from "@/lib/client-api";
import { DateTimeField } from "./date-time-field";
import { useDictionary } from "./dictionary-provider";
import { FormMessage, TextArea, TextField } from "./field";
import { buttonClass, cardClass } from "./ui";

export type EventFormValues = {
  title: string;
  host: string;
  description: string;
  location: string;
  /** "2026-11-05T13:00" dalam WIB */
  startsAt: string;
  endsAt: string;
  capacity: string;
};

const EMPTY: EventFormValues = {
  title: "",
  host: "",
  description: "",
  location: "",
  startsAt: "",
  endsAt: "",
  capacity: "",
};

/**
 * Form buat acara (tanpa eventId) dan ubah acara (dengan eventId). Validasinya di server.
 * defaults boleh sebagian (misalnya hanya host); sisanya kosong.
 */
export function EventForm({ eventId, defaults = {} }: { eventId?: string; defaults?: Partial<EventFormValues> }) {
  const initial = { ...EMPTY, ...defaults };
  const t = useDictionary();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (name: string) => String(data.get(name) ?? "");
    const capacity = text("capacity").trim();
    // Kosong = tanpa batas (null). Selain angka dikirim apa adanya supaya server yang menolak dengan pesan jelas.
    const capacityValue = capacity === "" ? null : Number.isNaN(Number(capacity)) ? capacity : Number(capacity);

    setPending(true);
    setErrors({});
    setMessage(null);
    const result = await sendJson<{ id: string }>(
      eventId ? `/api/events/${eventId}` : "/api/events",
      eventId ? "PUT" : "POST",
      {
        title: text("title"),
        host: text("host"),
        description: text("description"),
        location: text("location"),
        startsAt: text("startsAt"),
        endsAt: text("endsAt"),
        capacity: capacityValue,
      },
      t.error.network,
    );
    if (result.ok) {
      router.push(`/acara/${result.data.id}`);
      router.refresh();
      return;
    }
    setPending(false);
    setErrors(result.fields);
    setMessage(result.message);
  }

  return (
    <form onSubmit={submit} noValidate className={`${cardClass} grid gap-5 p-6 sm:p-7 lg:grid-cols-2`}>
      <TextField
        label={t.fields.title}
        name="title"
        defaultValue={initial.title}
        placeholder={t.form.titlePlaceholder}
        required
        maxLength={120}
        error={errors.title}
      />
      <TextField
        label={t.fields.host}
        name="host"
        defaultValue={initial.host}
        placeholder={t.form.hostPlaceholder}
        hint={t.form.hostHint}
        required
        maxLength={80}
        error={errors.host}
      />
      <DateTimeField
        label={t.fields.startsAt}
        name="startsAt"
        defaultValue={initial.startsAt}
        error={errors.startsAt}
      />
      <DateTimeField label={t.fields.endsAt} name="endsAt" defaultValue={initial.endsAt} error={errors.endsAt} />
      <TextField
        label={t.fields.location}
        name="location"
        defaultValue={initial.location}
        placeholder={t.form.locationPlaceholder}
        required
        maxLength={160}
        error={errors.location}
      />
      <TextField
        label={t.fields.capacity}
        name="capacity"
        type="number"
        inputMode="numeric"
        min={1}
        max={10000}
        defaultValue={initial.capacity}
        hint={t.form.capacityHint}
        error={errors.capacity}
      />
      <div className="lg:col-span-2">
        <TextArea
          label={t.fields.description}
          name="description"
          defaultValue={initial.description}
          rows={5}
          maxLength={2000}
          hint={t.form.descriptionHint}
          error={errors.description}
        />
      </div>
      <div className="lg:col-span-2">
        <FormMessage message={message} />
      </div>
      <div className="flex flex-wrap gap-2 pt-1 lg:col-span-2">
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? t.form.saving : eventId ? t.form.save : t.form.create}
        </button>
        <Link href={eventId ? `/acara/${eventId}` : "/"} className={buttonClass("ghost")}>
          {t.form.cancel}
        </Link>
      </div>
    </form>
  );
}
