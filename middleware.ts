// middleware.ts — proteksi route berdasarkan role
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth.token?.role as string;

    // ── Proteksi route per role ───────────────────────────────
    if (pathname.startsWith("/admin")     && role !== "admin")     return NextResponse.redirect(new URL("/login", req.url));
    if (pathname.startsWith("/mekanik")   && role !== "mekanik")   return NextResponse.redirect(new URL("/login", req.url));
    if (pathname.startsWith("/pemilik")   && role !== "pemilik")   return NextResponse.redirect(new URL("/login", req.url));
    if (pathname.startsWith("/pelanggan") && role !== "pelanggan") return NextResponse.redirect(new URL("/login", req.url));

    return NextResponse.next();
  },
  {
    callbacks: {
      // Wajib login untuk semua route yang diproteksi
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  // Proteksi semua route role — sesuai struktur folder app/
  matcher: [
    "/admin/:path*",
    "/mekanik/:path*",
    "/pemilik/:path*",
    "/pelanggan/:path*",
  ],
};