// app/components/BottomSections.tsx
'use client'
import Image from 'next/image'
import { MapPin, PhoneCall, CalendarDays, Warehouse } from 'lucide-react'

// ─────────────────────────── GALLERY ───────────────────────────
export function SectionGalery() {
  return (
    <section id="galeri bengkel" className="bg-white px-5 py-16 md:px-8 md:py-20 lg:px-16 lg:py-24">
      <div className="mb-12">
        <div className="tag">Galeri Kami</div>
        <h2 className="sec-title">Bengkel Nyaman dan <em>Luas</em></h2>
      </div>

      {/* Desktop: 3-col asymmetric | Tablet: 2-col | Mobile: 1-col */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr] gap-5">

        {/* Big image */}
        <GalleryItem title="Area Bengkel Utama" src="/img1.jpg" height="h-[400px]" className="md:col-span-2 lg:col-span-1" />

        {/* Sub col 1 */}
        <div className="grid grid-cols-2 md:grid-cols-1 gap-5">
          <GalleryItem title="Proses Servis" src="/img4.jpeg" height="h-[190px]" />
          <GalleryItem title="Ruang Tunggu"  src="/img6.jpg"  height="h-[190px]" />
        </div>

        {/* Sub col 2 */}
        <div className="grid grid-cols-2 md:grid-cols-1 gap-5">
          <GalleryItem title="Peralatan Servis" src="/img13.jpg"  height="h-[190px]" />
          <GalleryItem title="Area Kerja"       src="/img15.jpeg" height="h-[190px]" />
        </div>
      </div>
    </section>
  )
}

function GalleryItem({ title, src, height, className = '' }: { title: string; src: string; height: string; className?: string }) {
  return (
    <div className={`gallery-item relative ${height} rounded-2xl overflow-hidden cursor-pointer ${className}`}>
      <Image src={src} alt={title} fill className="gallery-img object-cover" />
      <div className="gallery-overlay absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }} />
      <div className="absolute bottom-4 left-4 text-white text-[14px] font-semibold z-10">{title}</div>
    </div>
  )
}

// ─────────────────────────── CONTACT ───────────────────────────
export function SectionContact() {
  const infos = [
    { Icon: MapPin, label: 'Alamat', val: 'Jl. Raden Wijaya Jl. Anusanata II No.30', sub: 'Sidoarjo, Jawa Timur 61254' },
    { Icon: PhoneCall, label: 'Telepon', val: '+62 811-378-263', sub: 'WA: +62 81-1378-263' },
    { Icon: CalendarDays, label: 'Jam Buka', val: 'Sen - Sab: 08-17', sub: 'Minggu: Tutup' },
    { Icon: Warehouse, label: 'Fasilitas', val: 'Parkir Luas', sub: 'WiFi · Ruang Tunggu · Kopi' },
  ]

  return (
    <section id="lokasi" className="bg-cream px-5 py-16 md:px-8 md:py-20 lg:px-16 lg:py-24 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">

      {/* Left */}
      <div>
        <div className="tag">Lokasi & Kontak</div>
        <h2 className="sec-title">Temukan <em>Kami</em><br />di Sidoarjo</h2>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-10">
          {infos.map(info => (
            <div key={info.label} className="bg-white rounded-2xl p-5 border border-stone-lite">
              <info.Icon className="w-6 h-6 text-orange mb-2.5" />
              <div className="text-[11px] font-bold text-[#57534e] uppercase tracking-[0.08em] mb-1">{info.label}</div>
              <div className="text-[14px] font-bold text-dark leading-snug">
                {info.val}
                <small className="block font-normal text-[#57534e] text-[12px] mt-0.5">{info.sub}</small>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right — map */}
      <div className="relative rounded-3xl overflow-hidden border-2 border-stone-lite">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d7913.689346917111!2d112.7337139!3d-7.3713005!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2dd7e57ee2b601fd%3A0xed151ae171c09f28!2sBengkel%20Nugraha%20Jaya!5e0!3m2!1sid!2sid!4v1774794859796!5m2!1sid!2sid"
          width="100%" height="380" className="block" style={{ border: 0 }} loading="lazy"
        />
        <div className="absolute bottom-5 left-5 bg-white/95 rounded-xl px-4 py-2.5 shadow-xl">
          <div className="text-[13px] font-bold text-dark">Bengkel Nugraha Jaya</div>
          <div className="text-[11px] text-[#57534e]">Sidoarjo</div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────── FOOTER ───────────────────────────
export function Footer() {
  const cols = [
    { title: 'Layanan',    links: ['Servis Rutin', 'Tune Up Mesin', 'Rem & Kaki-Kaki', 'Servis AC', 'Kelistrikan'] },
    { title: 'Pelanggan',  links: ['Booking Online', 'Cek Status Servis', 'Riwayat Kendaraan'] },
    { title: 'Informasi',  links: ['Tentang Kami', 'Galeri Bengkel', 'Kontak'] },
  ]

  return (
    <footer className="bg-dark border-t border-white/4">

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-7 lg:gap-12 px-5 pt-12 pb-10 md:px-8 lg:px-16 lg:pt-16 lg:pb-12 border-b border-white/5">

        {/* Brand — full width on mobile/tablet */}
        <div className="col-span-2 lg:col-span-1">
          <div className="font-playfair text-[24px] font-black text-white tracking-tight mb-1">
            Bengkel <span className="text-orange italic">Nugraha</span> Jaya
          </div>
          <div className="text-[12px] text-stone-mid mb-5">Kendaraan Sehat, Perjalanan Nyaman</div>
          <div className="text-[13px] text-stone-mid leading-[1.7] mb-6 max-w-[280px]">
            Bengkel otomotif terpercaya di Sidoarjo dengan pengalaman lebih dari 5 tahun melayani ratusan pelanggan setia.
          </div>
          <div className="inline-flex items-center gap-2 bg-orange/15 border border-orange/20 rounded-full px-3.5 py-1.5 font-mono-dm text-[12px] text-orange-lite">
            <PhoneCall className="w-4 h-4" /> +62 811-378-263
          </div>
        </div>

        {/* Link columns */}
        {cols.map(col => (
          <div key={col.title}>
            <div className="text-[10px] font-bold text-stone-mid tracking-[0.2em] uppercase mb-5">{col.title}</div>
            <ul className="flex flex-col gap-2.5 list-none">
              {col.links.map(link => (
                <li key={link}>
                  <a href="#" className="text-[13px] text-stone-mid hover:text-orange-lite transition-colors">{link}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2.5 text-center sm:text-left px-5 py-4 md:px-8 lg:px-16">
        <div className="text-[12px] text-stone-mid">© 2026 Bengkel Nugraha Jaya · Sidoarjo. Semua hak dilindungi.</div>
        <div className="flex items-center justify-center sm:justify-end gap-1.5 text-[11px] font-bold text-green-400">
          <span className="text-[8px]">●</span> Buka Senin s/d Sabtu 08.00-17.00 WIB
        </div>
      </div>
    </footer>
  )
}
