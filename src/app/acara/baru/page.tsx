import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDictionary } from "@/i18n";
import { EventForm } from "@/components/event-form";
import { pageClass } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.form.createTitle };
}

export default async function NewEventPage() {
  const [t, user] = await Promise.all([getDictionary(), getCurrentUser()]);
  if (!user) redirect("/masuk?lanjut=/acara/baru");
  return (
    <div className={pageClass}>
      <h1 className="type-h1">{t.form.createTitle}</h1>
      <p className="mt-1 mb-6 type-small text-muted-foreground">{t.form.createSubtitle}</p>
      <EventForm defaults={{ host: user.name }} />
    </div>
  );
}
