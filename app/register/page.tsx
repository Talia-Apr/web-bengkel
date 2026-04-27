'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ChevronRight, ArrowLeft, User, Building2, Check } from 'lucide-react'

const emptyForm = {
  nama: '', email: '', password: '', konfirmasi_password: '',
  no_telp: '', alamat: '',
  jenis_pelanggan: 'individu' as 'individu' | 'perusahaan',
  nama_perusahaan: '', term_of_payment: 14,
}

export default function RegisterPage() {
  const router  = useRouter()
  const [step, setStep]           = useState(1)
  const [form, setForm]           = useState(emptyForm)
  const [showPassword, setShowPassword]   = useState(false)
  const [showKonfirmasi, setShowKonfirmasi] = useState(false)
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  // ── Validasi step 1 ──────────────────────────────────────
  const handleNext = async () => {   // ← tambah async
  setError('')
  if (!form.nama.trim()) { setError('Nama lengkap wajib diisi'); return }
  if (!form.email.trim()) { setError('Email wajib diisi'); return }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError('Format email tidak valid'); return }
  if (form.password.length < 6) { setError('Password minimal 6 karakter'); return }
  if (form.password !== form.konfirmasi_password) { setError('Password dan konfirmasi password tidak cocok'); return }
    setLoading(true)
    const res = await fetch('/api/auth/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email }),
    })
    const { exists } = await res.json()
    setLoading(false)

    if (exists) {
      setError('Email sudah terdaftar, silakan gunakan email lain atau masuk')
      return
    }

    setStep(2)
  }

  // ── Submit ───────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.no_telp.trim()) { setError('Nomor WhatsApp wajib diisi'); return }
    if (form.jenis_pelanggan === 'perusahaan' && !form.nama_perusahaan.trim()) {
      setError('Nama perusahaan wajib diisi'); return
    }

    setLoading(true)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nama:             form.nama,
        email:            form.email,
        password:         form.password,
        no_telp:          form.no_telp,
        alamat:           form.alamat,
        jenis_pelanggan:  form.jenis_pelanggan,
        nama_perusahaan:  form.jenis_pelanggan === 'perusahaan' ? form.nama_perusahaan : null,
        term_of_payment:  form.jenis_pelanggan === 'perusahaan' ? form.term_of_payment : null,
      }),
    })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Terjadi kesalahan, coba lagi')
      setLoading(false)
      return
    }

    router.push('/login?registered=1')
  }

  return (
    <div className="min-h-screen bg-[#0f0d0b] flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col p-16 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute w-[900px] h-[900px] rounded-full blur-3xl opacity-30 pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(234, 90, 12, 0.51) 0%, transparent 90%)', top: -400, right: -400 }} />
          <div className="absolute w-[700px] h-[700px] rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(234, 90, 12, 0.51) 0%, transparent 90%)', bottom: -200, left: -300 }} />
          <div className="absolute w-[400px] h-[400px] rounded-full blur-2xl opacity-10 pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.4) 0%, transparent 70%)', top: '30%', left: '10%' }} />
        </div>

        <div className="relative z-10 mt-auto mb-auto">
          <div className="w-12 h-12 flex items-center justify-center">
            <Image src="/logo-putih.png" alt="logo" width={700} height={500} />
          </div>
          <h1 className="font-playfair text-6xl font-bold text-white leading-tight mb-6">
            Bengkel<br/>
            <span className="text-orange-500 italic">Nugraha Jaya</span>
          </h1>
          <p className="text-stone-400 text-m leading-relaxed max-w-sm">
            Daftarkan diri Anda untuk menikmati kemudahan booking servis online dan pantau progres kendaraan Anda.
          </p>
        </div>

        <div className="relative z-10 text-stone-600 text-sm">
          © 2026 Bengkel Nugraha Jaya · Sidoarjo. Semua hak dilindungi.
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-stone-50">
        <div className="w-full max-w-md">
          {/* Judul */}
          <h2 className="text-3xl font-bold text-stone-900 mb-1 text-center">Daftar Akun</h2>
          <p className="text-stone-500 mb-6 text-center text-sm">Buat akun untuk mulai booking servis</p>

          {/* Step indicator */}
          <div className="flex items-center mb-8">
            {[{ n: 1, label: 'Data Akun' }, { n: 2, label: 'Data Diri' }].map((s, i) => (
              <div key={s.n} className={`flex items-center ${i < 1 ? 'flex-1' : ''}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors
                    ${step === s.n ? 'bg-orange-600 text-white' : step > s.n ? 'bg-green-500 text-white' : 'bg-stone-200 text-stone-500'}`}>
                    {step > s.n ? <Check className="w-4 h-4" /> : s.n}
                  </div>
                  <span className={`text-sm font-medium ${step === s.n ? 'text-orange-600' : 'text-stone-400'}`}>
                    {s.label}
                  </span>
                </div>
                {i < 1 && <div className={`flex-1 h-0.5 mx-4 transition-colors ${step > 1 ? 'bg-orange-500' : 'bg-stone-200'}`} />}
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          {/* ── STEP 1: Data Akun ── */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Nama */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">
                  Nama Lengkap <span className="text-orange-600">*</span>
                </label>
                <input type="text" value={form.nama}
                  onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
                  placeholder="Masukkan nama lengkap Anda"
                  className="w-full px-4 py-3.5 rounded-xl border border-gray-200 text-gray-800 placeholder-gray-400 text-sm outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-100 bg-white" />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">
                  Email <span className="text-orange-600">*</span>
                </label>
                <input type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="Masukkan email Anda"
                  className="w-full px-4 py-3.5 rounded-xl border border-gray-200 text-gray-800 placeholder-gray-400 text-sm outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-100 bg-white" />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">
                  Password <span className="text-orange-600">*</span>
                </label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Minimal 6 karakter"
                    className="w-full px-4 py-3.5 pr-12 rounded-xl border border-gray-200 text-gray-800 placeholder-gray-400 text-sm outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-100 bg-white" />
                  <button type="button" onClick={() => setShowPassword(s => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Konfirmasi password */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">
                  Konfirmasi Password <span className="text-orange-600">*</span>
                </label>
                <div className="relative">
                  <input type={showKonfirmasi ? 'text' : 'password'} value={form.konfirmasi_password}
                    onChange={e => setForm(f => ({ ...f, konfirmasi_password: e.target.value }))}
                    placeholder="Ulangi password Anda"
                    className="w-full px-4 py-3.5 pr-12 rounded-xl border border-gray-200 text-gray-800 placeholder-gray-400 text-sm outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-100 bg-white" />
                  <button type="button" onClick={() => setShowKonfirmasi(s => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showKonfirmasi ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
                {/* Indikator cocok */}
                {form.konfirmasi_password && (
                  <p className={`text-xs mt-1 ${form.password === form.konfirmasi_password ? 'text-green-600' : 'text-red-500'}`}>
                    {form.password === form.konfirmasi_password ? '✓ Password cocok' : '✗ Password tidak cocok'}
                  </p>
                )}
              </div>

              {/* Tombol berikutnya */}
              <button onClick={handleNext}
                disabled={loading} 
                className="w-full py-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 mt-2">
                Berikutnya <ChevronRight className="w-4 h-4" />
              </button>

              <p className="text-center text-sm text-gray-500 mt-2">
                Sudah punya akun?{' '}
                <Link href="/login" className="text-orange-600 font-semibold hover:text-orange-700">
                  Masuk
                </Link>
              </p>
            </div>
          )}

          {/* ── STEP 2: Data Diri ── */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* No WhatsApp */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">
                  Nomor WhatsApp <span className="text-orange-600">*</span>
                </label>
                <input type="tel" value={form.no_telp}
                  onChange={e => setForm(f => ({ ...f, no_telp: e.target.value }))}
                  placeholder="Contoh: 08123456789"
                  className="w-full px-4 py-3.5 rounded-xl border border-gray-200 text-gray-800 placeholder-gray-400 text-sm outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-100 bg-white" />
              </div>

              {/* Alamat */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">Alamat</label>
                <textarea value={form.alamat}
                  onChange={e => setForm(f => ({ ...f, alamat: e.target.value }))}
                  placeholder="Masukkan alamat lengkap Anda"
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-800 placeholder-gray-400 text-sm outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-100 bg-white resize-none" />
              </div>

              {/* Jenis pelanggan */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">
                  Jenis Pelanggan <span className="text-orange-600">*</span>
                </label>
                <div className="flex gap-3">
                  {(['individu', 'perusahaan'] as const).map(j => (
                    <button key={j} type="button"
                      onClick={() => setForm(f => ({ ...f, jenis_pelanggan: j }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-colors
                        ${form.jenis_pelanggan === j
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'}`}>
                      {j === 'individu' ? <User className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                      {j === 'individu' ? 'Individu' : 'Perusahaan'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field khusus perusahaan */}
              {form.jenis_pelanggan === 'perusahaan' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1.5">
                      Nama Perusahaan <span className="text-orange-600">*</span>
                    </label>
                    <input value={form.nama_perusahaan}
                      onChange={e => setForm(f => ({ ...f, nama_perusahaan: e.target.value }))}
                      placeholder="Contoh: PT. Maju Jaya"
                      className="w-full px-4 py-3.5 rounded-xl border border-gray-200 text-gray-800 placeholder-gray-400 text-sm outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-100 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1.5">
                      Tempo Pembayaran <span className="text-orange-600">*</span>
                    </label>
                    <div className="flex gap-3">
                      {[14, 30].map(hari => (
                        <button key={hari} type="button"
                          onClick={() => setForm(f => ({ ...f, term_of_payment: hari }))}
                          className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-colors
                            ${form.term_of_payment === hari
                              ? 'border-orange-500 bg-orange-50 text-orange-700'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'}`}>
                          {hari} Hari
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-stone-400 mt-1.5">Sesuai kesepakatan dengan bengkel</p>
                  </div>
                </>
              )}

              {/* Tombol */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setStep(1); setError('') }}
                  className="flex items-center gap-2 px-5 py-3.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Kembali
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm tracking-wide transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Mendaftar...
                    </>
                  ) : 'Daftar Sekarang'}
                </button>
              </div>

              <p className="text-center text-sm text-gray-500">
                Sudah punya akun?{' '}
                <Link href="/login" className="text-orange-600 font-semibold hover:text-orange-700">
                  Masuk
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
