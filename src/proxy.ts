import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/cookies";

// Halaman yang butuh akun. Yang belum masuk diarahkan ke /masuk lebih dulu.
// Ini hanya untuk kenyamanan: halaman dan API tetap memeriksa sesi di database sendiri.
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const login = new URL("/masuk", request.url);
  login.searchParams.set("lanjut", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/acara/baru", "/acara/:id/ubah", "/saya"],
};
