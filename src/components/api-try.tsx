"use client";

import { Fragment, useState, type FormEvent } from "react";
import { useDictionary } from "./dictionary-provider";
import { buttonClass, inputClass, textareaClass } from "./ui";

export type TryParam = {
  name: string;
  in: "path" | "query";
  options?: string[];
  value: string;
};

type Result = { status: number; ms: number; body: string } | { error: string };

/**
 * Mengirim request sungguhan ke API dari halaman dokumentasi. Cookie sesi ikut terkirim (same-origin),
 * jadi endpoint yang butuh login bisa dicoba setelah masuk.
 */
export function ApiTry({
  method,
  path,
  params,
  body,
}: {
  method: string;
  path: string;
  params: TryParam[];
  body?: string;
}) {
  const t = useDictionary();
  const [values, setValues] = useState(() => Object.fromEntries(params.map((param) => [param.name, param.value])));
  const [text, setText] = useState(body ?? "");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let url = path.replace(/\{(\w+)\}/g, (_match, name: string) => encodeURIComponent(values[name] ?? ""));
    const query = new URLSearchParams();
    for (const param of params) {
      if (param.in === "query" && values[param.name]) query.set(param.name, values[param.name]);
    }
    if (query.size) url += `?${query}`;
    if (body !== undefined && text.trim()) {
      try {
        JSON.parse(text);
      } catch {
        setResult({ error: t.docs.invalidBody });
        return;
      }
    }

    setPending(true);
    const startedAt = performance.now();
    try {
      const response = await fetch(url, {
        method,
        headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
        body: body !== undefined ? text : undefined,
      });
      const raw = await response.text();
      let pretty = raw;
      try {
        pretty = JSON.stringify(JSON.parse(raw), null, 2);
      } catch {
        // Bukan JSON (misalnya 204 tanpa isi): tampilkan apa adanya.
      }
      setResult({ status: response.status, ms: Math.round(performance.now() - startedAt), body: pretty });
    } catch {
      setResult({ error: t.docs.networkError });
    }
    setPending(false);
  }

  return (
    <form onSubmit={send} className="space-y-4">
      {params.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {params.map((param) => (
            <label key={param.name} className="block">
              <span className="type-ui font-mono">{param.name}</span>
              {param.options ? (
                <select
                  value={values[param.name]}
                  onChange={(event) => setValues({ ...values, [param.name]: event.target.value })}
                  className={`${inputClass} border-input`}
                >
                  {param.options.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={values[param.name]}
                  onChange={(event) => setValues({ ...values, [param.name]: event.target.value })}
                  className={`${inputClass} border-input font-mono text-sm`}
                  spellCheck={false}
                />
              )}
            </label>
          ))}
        </div>
      )}
      {body !== undefined && (
        <label className="block">
          <span className="type-ui">{t.docs.requestBody}</span>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={Math.min(14, text.split("\n").length + 1)}
            spellCheck={false}
            className={`${textareaClass} border-input font-mono text-sm`}
          />
        </label>
      )}
      <button type="submit" disabled={pending} className={buttonClass("primary", "small")}>
        {pending ? t.docs.sending : t.docs.send}
      </button>
      {result && (
        <div aria-live="polite" className="space-y-2">
          <p className="type-ui">
            {"error" in result ? (
              result.error
            ) : (
              <Fragment>
                {t.docs.result}: {result.status} · {result.ms} ms
              </Fragment>
            )}
          </p>
          {"body" in result && (
            <pre className="max-h-96 overflow-auto rounded-lg bg-muted px-4 py-3 font-mono text-[13px] leading-5">
              {result.body || t.docs.noContent}
            </pre>
          )}
        </div>
      )}
    </form>
  );
}
