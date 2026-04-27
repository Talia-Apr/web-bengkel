'use client'
// app/components/Navbar.tsx — Tailwind v3
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const links = ['Tentang Kami', 'Proses', 'Galeri Bengkel', 'Lokasi']

  return (
    <nav
      className="fixed z-50 left-1/2 border"
      style={{
        top:             scrolled ? '0px'  : '16px',
        width:           scrolled ? '100%' : 'calc(100% - 2rem)',
        maxWidth:        scrolled ? '100%' : '72rem',
        transform:       'translateX(-50%)',
        borderRadius:    scrolled ? '0px'  : '12px',
        boxShadow:       scrolled
          ? '0 2px 16px rgba(0,0,0,0.08)'
          : '0 4px 24px rgba(0,0,0,0.10)',
        backdropFilter:  scrolled ? 'none' : 'blur(20px)',
        backgroundColor: scrolled ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.95)',
        borderColor:     scrolled ? '#e5e7eb' : 'rgba(229,231,235,0.6)',
        transition:      [
          'top 400ms cubic-bezier(0.4,0,0.2,1)',
          'width 400ms cubic-bezier(0.4,0,0.2,1)',
          'max-width 400ms cubic-bezier(0.4,0,0.2,1)',
          'border-radius 400ms cubic-bezier(0.4,0,0.2,1)',
          'box-shadow 400ms cubic-bezier(0.4,0,0.2,1)',
          'background-color 400ms cubic-bezier(0.4,0,0.2,1)',
        ].join(', '),
      }}
    >
      {/* ── Desktop / Tablet bar ── */}
      <div className="flex items-center justify-between px-5 md:px-8 lg:px-16 h-[72px]">

        {/* Brand */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center justify-center">
            <Image src="/logo-merah.png" alt="Logo" width={50} height={30} />
          </div>
          <div>
            <div className="font-sans text-[17px] font-bold text-gray-900 tracking-wide leading-tight">
              Bengkel Nugraha Jaya
            </div>
          </div>
        </div>

        {/* Desktop links */}
        <ul className="hidden lg:flex gap-8 list-none">
          {links.map(item => (
            <li key={item}>
              <a
                href={`#${item.toLowerCase()}`}
                className="text-[13px] font-sans font-semibold text-gray-500 hover:text-orange-600 transition-colors tracking-wide"
                onClick={() => setMenuOpen(false)}
              >{item}</a>
            </li>
          ))}
        </ul>

        {/* Desktop right */}
        <div className="hidden lg:flex items-center gap-3">
          <Link href="/login">
            <button className="bg-orange-600 hover:bg-orange-500 transition-colors text-white px-5 py-2 rounded-lg text-[13px] font-bold tracking-wide cursor-pointer">
              Masuk/Daftar
            </button>
          </Link>
        </div>

        {/* Hamburger */}
        <button
          className="lg:hidden flex items-center justify-center p-2 text-gray-500"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen
            ? <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            : <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>}
        </button>
      </div>

      {/* ── Mobile dropdown ── */}
      {menuOpen && (
        <div className="lg:hidden flex flex-col bg-white border-t border-gray-100 px-6 rounded-b-xl overflow-hidden">
          {links.map(item => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="block py-4 border-b border-gray-100 text-[15px] font-semibold text-gray-600 hover:text-orange-600 transition-colors"
              onClick={() => setMenuOpen(false)}
            >{item}</a>
          ))}
          <Link href="/login">
            <button className="my-4 w-full bg-orange-600 hover:bg-orange-500 text-white py-3.5 rounded-xl text-[14px] font-bold cursor-pointer transition-colors">
              Masuk / Daftar
            </button>
          </Link>
        </div>
      )}
    </nav>
  )
}
