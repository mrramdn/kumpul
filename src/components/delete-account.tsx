"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { sendJson } from "@/lib/client-api";
import { useDictionary } from "./dictionary-provider";
import { FormMessage } from "./field";
import { buttonClass } from "./ui";

export function DeleteAccount() {
  const t = useDictionary();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function remove() {
    setPending(true);
    const result = await sendJson("/api/users/me", "DELETE", undefined, t.error.network);
    if (result.ok) {
      router.push("/");
      router.refresh();
      return;
    }
    setPending(false);
    setMessage(result.message);
  }

  return (
    <div className="space-y-4">
      <FormMessage message={message} />
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="type-small">{t.mine.deleteAccountConfirm}</span>
          <button type="button" disabled={pending} onClick={remove} className={buttonClass("destructive", "small")}>
            {pending ? t.mine.deleting : t.mine.deleteAccountYes}
          </button>
          <button type="button" onClick={() => setConfirming(false)} className={buttonClass("ghost", "small")}>
            {t.form.cancel}
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className={buttonClass("secondary", "small")}>
          <Trash2 aria-hidden className="size-4" />
          {t.mine.deleteAccount}
        </button>
      )}
    </div>
  );
}
