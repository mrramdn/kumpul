import { z } from "zod";
import type { Dictionary } from "@/i18n";
import { format } from "@/i18n/format";
import { parseDateTime } from "./time";

// Aturan input dicek di server (di sini) dan di database (CHECK constraint di db/init/01_schema.sql).
// Form di browser hanya menampilkan pesan dari server, jadi aturannya cukup ditulis di satu tempat.
// Skema dibuat per bahasa supaya pesan errornya ikut bahasa pengguna.

function text(t: Dictionary, label: string, min: number, max: number) {
  const v = t.validation;
  return z
    .string({ error: format(v.required, { label }) })
    .trim()
    .min(1, format(v.required, { label }))
    .min(min, format(v.min, { label, min }))
    .max(max, format(v.max, { label, max }));
}

function dateTime(t: Dictionary, label: string) {
  const v = t.validation;
  return z.string({ error: format(v.required, { label }) }).transform((value, context) => {
    if (value.trim() === "") {
      context.addIssue({ code: "custom", message: format(v.required, { label }) });
      return z.NEVER;
    }
    const date = parseDateTime(value.trim());
    if (!date) {
      context.addIssue({ code: "custom", message: format(v.dateTime, { label }) });
      return z.NEVER;
    }
    return date;
  });
}

export function eventSchema(t: Dictionary) {
  const { fields: f, validation: v } = t;
  return z
    .object({
      title: text(t, f.title, 3, 120),
      host: text(t, f.host, 2, 80),
      description: z
        .string({ error: format(v.text, { label: f.description }) })
        .trim()
        .max(2000, format(v.max, { label: f.description, max: 2000 }))
        .default(""),
      location: text(t, f.location, 2, 160),
      startsAt: dateTime(t, f.startsAt),
      endsAt: dateTime(t, f.endsAt),
      capacity: z
        .number({ error: v.capacityNumber })
        .int(v.capacityInteger)
        .min(1, v.capacityRange)
        .max(10000, v.capacityRange)
        .nullable()
        .default(null),
    })
    .refine((event) => event.endsAt > event.startsAt, { path: ["endsAt"], message: v.endAfterStart });
}

export function registrationSchema(t: Dictionary) {
  const { fields: f, validation: v } = t;
  return z.object({
    name: text(t, f.name, 2, 80),
    email: z
      .string({ error: format(v.required, { label: f.email }) })
      .trim()
      .toLowerCase()
      .min(1, format(v.required, { label: f.email }))
      .max(160, format(v.max, { label: f.email, max: 160 }))
      .pipe(z.email(v.email)),
  });
}

export type EventInput = z.infer<ReturnType<typeof eventSchema>>;
export type RegistrationInput = z.infer<ReturnType<typeof registrationSchema>>;
