// middleware.ts
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path  = req.nextUrl.pathname

    if (!token) return NextResponse.redirect(new URL('/login', req.url))

    const role = token.role as string

    // Kalau akses root, redirect ke dashboard sesuai role
    if (path === '/') {
      if (role === 'admin')     return NextResponse.redirect(new URL('/admin', req.url))
      if (role === 'mekanik')   return NextResponse.redirect(new URL('/mekanik', req.url))
      if (role === 'pelanggan') return NextResponse.redirect(new URL('/pelanggan', req.url))
      if (role === 'pemilik')   return NextResponse.redirect(new URL('/pemilik', req.url))
    }

    // Guard akses halaman berdasarkan role
    if (path.startsWith('/admin')    && role !== 'admin')     return NextResponse.redirect(new URL('/login', req.url))
    if (path.startsWith('/mekanik')  && role !== 'mekanik')   return NextResponse.redirect(new URL('/login', req.url))
    if (path.startsWith('/pelanggan') && role !== 'pelanggan') return NextResponse.redirect(new URL('/login', req.url))
    if (path.startsWith('/pemilik')  && role !== 'pemilik')   return NextResponse.redirect(new URL('/login', req.url))

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    '/',
    '/admin/:path*',
    '/mekanik/:path*',
    '/pelanggan/:path*',
    '/pemilik/:path*',
  ],
}