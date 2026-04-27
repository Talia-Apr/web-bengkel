import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname
    const role = token?.role as string

    if (path === '/' && token) {
      if (role === 'admin') return NextResponse.redirect(new URL('/admin', req.url))
      if (role === 'mekanik') return NextResponse.redirect(new URL('/mekanik', req.url))
      if (role === 'pelanggan') return NextResponse.redirect(new URL('/pelanggan', req.url))
      if (role === 'pemilik') return NextResponse.redirect(new URL('/pemilik', req.url))
    }

    // 1. Jika user sudah login dan mencoba akses /login, arahkan ke dashboard masing-masing
    if (path === '/login' && token) {
      if (role === 'admin') return NextResponse.redirect(new URL('/admin', req.url))
      if (role === 'mekanik') return NextResponse.redirect(new URL('/mekanik', req.url))
      if (role === 'pelanggan') return NextResponse.redirect(new URL('/pelanggan', req.url))
      if (role === 'pemilik') return NextResponse.redirect(new URL('/pemilik', req.url))
    }

    // 2. Redirect root '/' ke halaman sesuai role
    if (path === '/' && token) {
      if (role === 'admin') return NextResponse.redirect(new URL('/admin', req.url))
      if (role === 'mekanik') return NextResponse.redirect(new URL('/mekanik', req.url))
      if (role === 'pelanggan') return NextResponse.redirect(new URL('/pelanggan', req.url))
      if (role === 'pemilik') return NextResponse.redirect(new URL('/pemilik', req.url))
    }

    // 3. Guard akses halaman berdasarkan role (Proteksi Halaman)
    if (path.startsWith('/admin') && role !== 'admin') return NextResponse.rewrite(new URL('/login', req.url))
    if (path.startsWith('/mekanik') && role !== 'mekanik') return NextResponse.rewrite(new URL('/login', req.url))
    if (path.startsWith('/pelanggan') && role !== 'pelanggan') return NextResponse.rewrite(new URL('/login', req.url))
    if (path.startsWith('/pemilik') && role !== 'pemilik') return NextResponse.rewrite(new URL('/login', req.url))

    return NextResponse.next()
  },
  {
    callbacks: {
      // Izinkan akses jika token ada
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname
        // Halaman login harus diizinkan meskipun tidak ada token
        if (path === '/login') return true
        return !!token
      },
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
    '/login', 
  ],
}