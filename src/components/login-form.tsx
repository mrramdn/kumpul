"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { sendJson } from "@/lib/client-api";
import { useDictionary } from "./dictionary-provider";
import { FormMessage, TextField } from "./field";
import { buttonClass, cardClass } from "./ui";

export function LoginForm({ next }: { next: string }) {
  const t = useDictionary();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setErrors({});
    setMessage(null);
    const result = await sendJson("/api/session", "POST", { password: data.get("password") }, t.error.network);
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
      <TextField
        label={t.fields.password}
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={errors.password}
      />
      <FormMessage message={message} />
      <button type="submit" disabled={pending} className={buttonClass("primary", "large", "w-full")}>
        {pending ? t.login.submitting : t.login.submit}
      </button>
    </form>
  );
}
