'use client'
// app/components/Hero.tsx — Tailwind v3
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

// ── path gambar ──
const SLIDES = [
  '/img1.jpg',
  '/img14.jpg',
  '/img3.jpg',
  '/img4.jpeg',
  '/img11.jpg',
  '/img6.jpg',
  '/img7.jpg',
  '/img8.jpg',
  '/img5.jpg',
]

const INTERVAL = 5000  // kecepatan slide (ms)
const FADE_MS  = 1000  // durasi transisi fade

export default function Hero() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setActive(prev => (prev + 1) % SLIDES.length)
    }, INTERVAL)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center">

      {/* ── Background slideshow ── */}
      <div className="absolute inset-0 z-0">
        {SLIDES.map((src, i) => (
          <div
            key={src}
            className="absolute inset-0"
            style={{
              opacity: i === active ? 1 : 0,
              transition: `opacity ${FADE_MS}ms ease-in-out`,
              zIndex: i === active ? 1 : 0,
            }}
          >
            <Image
              src={src}
              alt={`Slide ${i + 1}`}
              fill
              priority={i === 0}
              className="object-cover object-center"
            />
          </div>
        ))}

        {/* Dark overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-black/70"
          style={{ zIndex: SLIDES.length }}
        />
      </div>

      {/* ── Content: 2 kolom ── */}
      <div
        className="relative w-full max-w-6xl mx-auto px-6 md:px-12 py-20
          flex flex-col-reverse md:flex-row items-center justify-between gap-10 md:gap-16"
        style={{ zIndex: SLIDES.length + 1 }}
      >

        {/* ── Kiri: Teks + Button ── */}
        <div className="flex flex-col items-center text-center md:items-start md:text-left flex-1">
          <h1 className="font-playfair font-black leading-[1.05] text-white mb-5 tracking-tight
            text-[36px] sm:text-[48px] md:text-[56px] lg:text-[68px]">
            Kendaraan<br />
            <em className="text-orange-500 italic">Sehat,</em>{' '}
            <span className="text-white">Perjalanan</span><br />
            Nyaman
          </h1>

          <p className="text-[15px] text-stone-300 leading-[1.75] max-w-[480px] mb-9 font-normal">
            Bengkel Nugraha Jaya hadir dengan mekanik berpengalaman, sparepart original,
            dan sistem booking online yang mudah. Percayakan kendaraan Anda pada kami.
          </p>

          <Link href="/harga-servis" className="no-underline">
            <div className="inline-flex items-center gap-2.5
              bg-orange-600 hover:bg-orange-500
              border border-orange-500/30
              hover:shadow-[0_0_30px_rgba(249,115,22,0.55)]
              rounded-full px-7 py-3.5
              transition-all duration-300
              cursor-pointer">
              <span className="text-[14px] text-white font-sans font-bold">
                Lihat Daftar Harga Servis
              </span>
            </div>
          </Link>
        </div>

        {/* ── Kanan: Logo ── */}
        <div className="flex-shrink-0 flex items-center justify-center">
          <div className="relative w-[220px] h-[220px] sm:w-[280px] sm:h-[280px] md:w-[340px] md:h-[340px] lg:w-[400px] lg:h-[400px]">
            
            {/* Glow layer berdenyut di belakang logo */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(234,88,12,0.45) 0%, rgba(234,88,12,0.15) 50%, transparent 75%)',
                animation: 'logoPulse 2.5s ease-in-out infinite',
                filter: 'blur(18px)',
                zIndex: 0,
              }}
            />

            {/* Ring pulse luar */}
            <div
              className="absolute inset-[-12px] rounded-full border border-orange-500/30"
              style={{
                animation: 'ringPulse 2.5s ease-in-out infinite',
                zIndex: 0,
              }}
            />

            {/* Logo */}
            <Image
              src="/logo-merah.png"
              alt="Logo Bengkel Nugraha Jaya"
              fill
              priority
              className="object-contain relative"
              style={{
                filter: 'drop-shadow(0 0 18px rgba(234,88,12,0.7)) drop-shadow(0 0 40px rgba(234,88,12,0.35))',
                zIndex: 1,
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Dots + Scroll indicator ── */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
        style={{ zIndex: SLIDES.length + 1 }}
      >
        <div className="flex items-center gap-2.5">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-500"
              style={{
                width:      i === active ? '28px' : '8px',
                height:     '8px',
                background: i === active ? '#ea580c' : 'rgba(255,255,255,0.35)',
              }}
            />
          ))}
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[12px] tracking-[0.15em] uppercase text-stone-400">Scroll</span>
          <div className="w-px h-5" style={{ background: 'linear-gradient(to bottom, #ea580c, transparent)' }} />
        </div>
      </div>

    </section>
  )
}