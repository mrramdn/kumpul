import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getDictionary } from "@/i18n";
import { DeleteEvent } from "@/components/delete-event";
import { EventForm } from "@/components/event-form";
import { pageClass } from "@/components/ui";
import { getEvent } from "@/lib/events";
import { getCurrentUser } from "@/lib/auth";
import { isUuid } from "@/lib/http";
import { toLocalInput } from "@/lib/time";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.form.editTitle };
}

// Hanya pemilik acara atau admin. Yang belum masuk sudah diarahkan ke /masuk oleh src/proxy.ts;
// akun lain mendapat 404, sama seperti acara yang tidak ada.
export default async function EditEventPage({ params }: PageProps<"/acara/[id]/ubah">) {
  const { id } = await params;
  const [event, user] = await Promise.all([isUuid(id) ? getEvent(id.toLowerCase()) : null, getCurrentUser()]);
  if (!event || !user) redirect(`/masuk?lanjut=/acara/${id}/ubah`);
  if (event.ownerId !== user.id && !user.isAdmin) notFound();
  const t = await getDictionary();

  return (
    <div className={pageClass}>
      <h1 className="type-h1">{t.form.editTitle}</h1>
      <p className="mt-1 mb-6 type-small text-muted-foreground">{t.form.editSubtitle}</p>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
        <EventForm
          eventId={event.id}
          initial={{
            title: event.title,
            host: event.host,
            description: event.description,
            location: event.location,
            startsAt: toLocalInput(event.startsAt),
            endsAt: toLocalInput(event.endsAt),
            capacity: event.capacity === null ? "" : String(event.capacity),
          }}
        />
        <DeleteEvent eventId={event.id} registeredCount={event.registeredCount} />
      </div>
    </div>
  );
}
