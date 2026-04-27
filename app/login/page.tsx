'use client'

import { useState, useEffect } from 'react'
import Link from "next/link"
import Image from 'next/image'
import { Check, Eye, EyeOff } from 'lucide-react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
import { redirect } from 'next/navigation'

const REDIRECT_MAP: Record<string, string> = {
  admin:     "/admin",
  mekanik:   "/mekanik",
  pemilik:   "/pemilik",
  pelanggan: "/pelanggan",
}

useEffect(() => {
  // Replace history agar back button tidak kembali ke halaman protected
  window.history.replaceState(null, '', '/login')
  
  // Push state kosong agar back button tidak bisa keluar dari login
  window.history.pushState(null, '', '/login')
  
  const handlePopState = () => {
    window.history.pushState(null, '', '/login')
  }
  
  window.addEventListener('popstate', handlePopState)
  return () => window.removeEventListener('popstate', handlePopState)
}, [])

const session = await getServerSession(authOptions)
  
  if (session) {
    const role = session.user.role
    if (role === 'admin')     redirect('/admin')
    if (role === 'mekanik')   redirect('/mekanik')
    if (role === 'pelanggan') redirect('/pelanggan')
    if (role === 'pemilik')   redirect('/pemilik')
  }

function LoginForm(){
  const router = useRouter()
  const searchParams = useSearchParams()
  const registered = searchParams.get('registered')
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (res?.error) {
      // NextAuth encode error message di URL, bisa dibaca dari res.error
      if (res.error === 'EMAIL_NOT_FOUND') {
        setError('Email belum terdaftar, silakan daftar terlebih dahulu')
      } else if (res.error === 'WRONG_PASSWORD') {
        setError('Password salah, silakan coba lagi')
      } else {
        setError('Email atau password salah')
      }
      setLoading(false)
      return
    }

    const sessionRes = await fetch("/api/auth/session")
    const session = await sessionRes.json()
    const role = session?.user?.role as string
    router.push(REDIRECT_MAP[role] ?? "/")
  }

  return (
    <div className="min-h-screen bg-[#0f0d0b] flex">
      {/* Left Panel - Brand */}
      <div className="hidden lg:flex lg:w-1/2 flex-col p-16 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div
            className="absolute w-[900px] h-[900px] rounded-full blur-3xl opacity-30 pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(234, 90, 12, 0.51) 0%, transparent 90%)',
              top: -400,
              right: -400
            }}
          />
          <div
            className="absolute w-[700px] h-[700px] rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(234, 90, 12, 0.51) 0%, transparent 90%)',
              bottom: -200,
              left: -300
            }}
          />
          <div
            className="absolute w-[400px] h-[400px] rounded-full blur-2xl opacity-10 pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(249,115,22,0.4) 0%, transparent 70%)',
              top: '30%',
              left: '10%'
            }}
          />
        </div>

        {/* Content tengah */}
        <div className="relative z-10 mt-auto mb-auto">
          <div className="w-12 h-12 flex items-center justify-center">
            <Image src="/logo-putih.png" alt="logo" width={700} height={500} />
          </div>

          <h1 className="font-playfair text-6xl font-bold text-white leading-tight mb-6">
            Bengkel<br/>
            <span className="text-orange-500 italic">Nugraha Jaya</span>
          </h1>

          <p className="text-stone-400 text-m leading-relaxed max-w-sm">
            Sistem manajemen servis profesional untuk bengkel otomotif.
            Kelola booking, pantau progres, dan layani pelanggan lebih efisien.
          </p>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-stone-600 text-sm">
          © 2026 Bengkel Nugraha Jaya · Sidoarjo. Semua hak dilindungi.
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-stone-50">
        <div className="w-full max-w-md">
          <h2 className="font-sans-dm text-3xl font-bold text-stone-900 mb-2 text-center">
            Selamat Datang
          </h2>
          <p className="text-stone-500 mb-10 font-sans-dm text-center">
            Silahkan Masukkan Email dan Password Anda!
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {registered === '1' && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 flex-shrink-0" />
                Akun berhasil dibuat! Silakan login dengan email dan password Anda.
              </div>
            )}
            {/* Alert Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1.5">
                Email <span className="text-orange-600">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Masukkan Email Anda"
                required
                disabled={loading}
                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 text-gray-800 placeholder-gray-400 text-sm outline-none transition-all duration-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 bg-white disabled:opacity-60"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1.5">
                Password <span className="text-orange-600">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan Password Anda"
                  required
                  disabled={loading}
                  className="w-full px-4 py-3.5 pr-12 rounded-xl border border-gray-200 text-gray-800 placeholder-gray-400 text-sm outline-none transition-all duration-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 bg-white disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-bold text-sm tracking-wide transition-all duration-200 mt-2 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Memproses...
                </>
              ) : (
                "Masuk"
              )}
            </button>
          </form>

          {/* Register link */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Anda Pelanggan Belum Punya Akun?{" "}
            <Link
              href="/register"
              className="text-orange-600 font-semibold hover:text-orange-700 transition-colors"
            >
              Daftar Sekarang
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
