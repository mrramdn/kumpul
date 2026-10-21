"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { sendJson } from "@/lib/client-api";
import { useDictionary } from "./dictionary-provider";
import { FormMessage, TextField } from "./field";
import { buttonClass, cardClass } from "./ui";

/** Form masuk (POST /api/session) dan buat akun (POST /api/users). Setelah berhasil, kembali ke halaman asal. */
export function AuthForm({ mode, next }: { mode: "login" | "register"; next: string }) {
  const t = useDictionary();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const copy = mode === "login" ? t.login : t.register;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setPending(true);
    setErrors({});
    setMessage(null);
    const result = await sendJson(mode === "login" ? "/api/session" : "/api/users", "POST", data, t.error.network);
    if (result.ok) {
      router.push(next);
      router.refresh();
      return;
    }
    setPending(false);
    setErrors(result.fields);
    if (Object.keys(result.fields).length === 0) setMessage(result.message);
  }

  return (
    <form onSubmit={submit} noValidate className={`${cardClass} space-y-5 p-6 sm:p-7`}>
      {mode === "register" && (
        <TextField label={t.fields.name} name="name" autoComplete="name" required maxLength={80} error={errors.name} />
      )}
      <TextField
        label={t.fields.email}
        name="email"
        type="email"
        autoComplete="email"
        required
        maxLength={160}
        error={errors.email}
      />
      <TextField
        label={t.fields.password}
        name="password"
        type="password"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        required
        maxLength={200}
        hint={mode === "register" ? t.register.passwordHint : undefined}
        error={errors.password}
      />
      <FormMessage message={message} />
      <button type="submit" disabled={pending} className={buttonClass("primary", "large", "w-full")}>
        {pending ? copy.submitting : copy.submit}
      </button>
    </form>
  );
}
