import { CircleAlert } from "lucide-react";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { inputClass, textareaClass } from "./ui";

type FieldProps = {
  label: string;
  name: string;
  error?: string;
  hint?: string;
};

function describedBy(name: string, error?: string, hint?: string) {
  if (error) return `${name}-error`;
  if (hint) return `${name}-hint`;
  return undefined;
}

function Message({ name, error, hint }: { name: string; error?: string; hint?: string }) {
  if (error) {
    return (
      <span id={`${name}-error`} className="mt-2 flex items-start gap-1.5 type-small">
        <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
        {error}
      </span>
    );
  }
  if (hint) {
    return (
      <span id={`${name}-hint`} className="mt-2 block type-small text-muted-foreground">
        {hint}
      </span>
    );
  }
  return null;
}

export function TextField({ label, name, error, hint, ...props }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block w-full">
      <span className="type-ui">{label}</span>
      <input
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        className={`${inputClass} ${error ? "border-destructive" : "border-input"}`}
        {...props}
      />
      <Message name={name} error={error} hint={hint} />
    </label>
  );
}

export function TextArea({
  label,
  name,
  error,
  hint,
  ...props
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block w-full">
      <span className="type-ui">{label}</span>
      <textarea
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        className={`${textareaClass} ${error ? "border-destructive" : "border-input"}`}
        {...props}
      />
      <Message name={name} error={error} hint={hint} />
    </label>
  );
}

/** Pesan untuk seluruh form, misalnya "Database sedang tidak bisa dihubungi." */
export function FormMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-lg bg-secondary px-4 py-3 type-small">
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
      {message}
    </p>
  );
}
