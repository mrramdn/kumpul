import { requireUser } from "@/lib/auth";
import { listEventsAttendedBy, listEventsOwnedBy } from "@/lib/events";
import { handle, json } from "@/lib/http";

/** Acara yang diselenggarakan dan yang diikuti akun yang sedang masuk. */
export const GET = handle(async () => {
  const user = await requireUser();
  const [organizing, attending] = await Promise.all([listEventsOwnedBy(user.id), listEventsAttendedBy(user.id)]);
  return json({ organizing, attending });
});
