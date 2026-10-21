import { endSession, requireUser } from "@/lib/auth";
import { handle, noContent } from "@/lib/http";
import { deleteUser } from "@/lib/users";

/** Menghapus akun yang sedang masuk, beserta acara, pendaftaran, dan sesinya. */
export const DELETE = handle(async () => {
  const user = await requireUser();
  await deleteUser(user.id);
  await endSession();
  return noContent();
});
