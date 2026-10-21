import { NextResponse, type NextRequest } from "next/server";
import { authEnabled, SESSION_COOKIE, verifySession } from "@/lib/session";

// Halaman buat dan ubah acara hanya untuk penyelenggara. Yang belum masuk diarahkan ke /masuk.
// API-nya dijaga terpisah di setiap route (requireOrganizer), jadi proxy ini hanya untuk kenyamanan halaman.
export function proxy(request: NextRequest) {
  if (!authEnabled() || verifySession(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.next();
  }
  const login = new URL("/masuk", request.url);
  login.searchParams.set("lanjut", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/acara/baru", "/acara/:id/ubah"],
};
