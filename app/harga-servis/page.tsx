'use client'
// app/harga-servis/page.tsx
import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { Footer } from '@/components/BottomSections'
import {
  Search, Grid2X2,
  Wrench, Cog, Disc2, Snowflake, Zap,
  Tag,
  Database,
  TagIcon,
  Info,
} from 'lucide-react'


const BADGE_STYLE: Record<string, string> = {
  orange: 'bg-orange-pale text-orange border border-orange-lite',
  green:  'bg-green-50 text-green-700 border border-green-200',
  blue:   'bg-blue-50 text-blue-700 border border-blue-200',
}


// ── Main page ─────────────────────────────────────────────────────────────────
export default function HargaServisPage() {
  const [activecat, setActivecat] = useState('all')
  const [search,    setSearch]    = useState('')  
  const [jasaDB, setJasaDB] = useState<any[]>([])
  const [sparepartDB, setSparepartDB] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const ICON_MAP: any = {
  rutin: Wrench,
  mesin: Cog,
  kaki: Disc2,
  ac: Snowflake,
  listrik: Zap,
  lainnya: Database
}


const getKategori = (nama: string) => {
  const n = nama.toLowerCase()

  if (n.includes('oli') || n.includes('service ringan')) return 'rutin'
  if (n.includes('tune') || n.includes('overhaul') || n.includes('mesin')) return 'mesin'
  if (n.includes('spooring') || n.includes('balancing') || n.includes('kaki') || n.includes('shock')) return 'kaki'
  if (n.includes('ac') || n.includes('freon')) return 'ac'
  if (n.includes('aki') || n.includes('kelistrikan') || n.includes('lampu')) return 'listrik'

  return 'lainnya'
}

const SERVICES = useMemo(() => {
  return jasaDB.map((j: any, i: number) => {
    const kategori = getKategori(j.nama_jasa)
    return {
      id: i,
      cat: kategori,
      icon: ICON_MAP[kategori] || Wrench,
      name: j.nama_jasa,
      desc: j.keterangan || 'Layanan servis kendaraan', 
      includes: ['Dikerjakan mekanik profesional'],
      price: `Rp ${Number(j.harga_jasa).toLocaleString('id-ID')}`,
      priceNote: 'Biaya jasa',
      badge: '',
      badgeColor: ''
    }
  })
}, [jasaDB])

const CATS = useMemo(() => {
  const uniqueCats = [
  ...new Set(jasaDB.map((j: any) => getKategori(j.nama_jasa)))
]

  return [
    { key: 'all', label: 'Semua', icon: Grid2X2 },
    ...uniqueCats.map((cat: string) => ({
      key: cat,
      label: cat.charAt(0).toUpperCase() + cat.slice(1),
      icon: ICON_MAP[cat] || Wrench
    })),
    { key: 'sparepart', label: 'Sparepart', icon: Tag }
  ]
}, [jasaDB])

const CAT_LABELS = useMemo(() => {
  const obj: any = {}

  jasaDB.forEach((j: any) => {
  const cat = getKategori(j.nama_jasa)

    if (!obj[cat]) {
      const Icon = ICON_MAP[cat] || Wrench

      obj[cat] = {
        title: cat.charAt(0).toUpperCase() + cat.slice(1),
        icon: <Icon className="w-5 h-5 text-orange-600" />
      }
    }
  })

  return obj
}, [jasaDB])

useEffect(() => {
  fetch("/api/harga-servis")
    .then(res => res.json())
    .then(res => {
      setJasaDB(res.jasa)
      setSparepartDB(res.sparepart)
      setLoading(false)
    })
}, [])

  const filteredServices = useMemo(() => {
    let list = SERVICES
    if (activecat !== 'all' && activecat !== 'sparepart') list = list.filter(s => s.cat === activecat)
    if (activecat === 'sparepart') return []
    if (search) list = list.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.desc.toLowerCase().includes(search.toLowerCase()))
    return list
  }, [activecat, search, SERVICES])

  const grouped = useMemo(() => {
    const g: Record<string, typeof SERVICES> = {}
    filteredServices.forEach(s => { if (!g[s.cat]) g[s.cat] = []; g[s.cat].push(s) })
    return g
  }, [filteredServices])

  const showSparepart = activecat === 'all' || activecat === 'sparepart'
  if (loading) {
  return (
    <div className="p-10 text-center">
      Loading...
    </div>
  )
}

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />

      {/* ── HERO ── */}
      <div className="pt-[72px] bg-[#0f0d0b] relative overflow-hidden">
        <div className="absolute w-[600px] h-[600px] rounded-full pointer-events-none" style={{ background:'radial-gradient(circle,rgba(234,88,12,0.15)0%,transparent 70%)', top:-100, right:-80 }} />
        <div className="relative z-10 px-5 py-14 md:px-8 md:py-16 lg:px-16 lg:py-20">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6 text-[12px] text-stone-mid">
            <Link href="/" className="hover:text-white transition-colors no-underline text-stone-mid">Beranda</Link>
            <span>/</span>
            <span className="text-orange-lite font-semibold">Harga Servis</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-0.5 bg-orange" />
                <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-orange-lite">Transparan & Tanpa Biaya Tersembunyi</span>
              </div>
              <h1 className="font-playfair font-black text-white leading-tight tracking-tight mb-4 text-[36px] sm:text-[48px] lg:text-[56px]">
                Estimasi Harga<br /><em className="text-orange">Servis Kendaraan</em>
              </h1>
              <p className="text-[15px] text-stone-mid leading-relaxed max-w-[520px]">
                Lihat daftar lengkap harga layanan servis kami secara transparan.
              </p>
            </div>

            {/* Stats */}
            <div className="flex gap-4 flex-wrap">
              {[
                { num:'13+', lbl:'Jenis Layanan' },
                { num:'Rp 50rb', lbl:'Mulai dari' },
                { num:'0%', lbl:'Biaya Tersembunyi' },
              ].map(s => (
                <div key={s.lbl} className="bg-white/4 border border-white/8 rounded-2xl px-6 py-4 text-center min-w-[120px]">
                  <div className="font-playfair text-[26px] font-black text-white leading-none">{s.num}</div>
                  <div className="text-[11px] text-stone-mid mt-1.5 font-medium">{s.lbl}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── FILTER BAR (sticky) ── */}
      <div className="sticky top-[72px] z-40 bg-white border-b border-stone-lite shadow-sm">
        <div className="px-5 py-4 md:px-8 lg:px-16 flex flex-col sm:flex-row gap-3 sm:items-center">

          {/* Category chips */}
          <div className="flex gap-2 flex-wrap flex-1">
            {CATS.map(c => (
              <button key={c.key} onClick={() => setActivecat(c.key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold border transition-all cursor-pointer whitespace-nowrap
                  ${activecat === c.key
                    ? 'bg-dark border-dark text-white'
                    : 'bg-white border-stone-lite text-[#57534e] hover:border-orange hover:text-orange'}`}>
                  <span>
                    <c.icon className="w-4 h-4" />
                  </span>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="px-5 py-10 md:px-8 lg:px-16 lg:py-12">

        {/* Info banner */}
        <div className="flex items-start gap-3.5 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 mb-10 text-[13px] text-blue-700">
          <span className="text-xl flex-shrink-0 mt-0.5"><Info className='w-4 h-4'/></span>
          <div className="leading-relaxed">
            <strong>Tentang Estimasi Harga:</strong> Harga di bawah adalah estimasi biaya jasa. Harga sparepart, oli, atau freon belum termasuk kecuali disebutkan. Harga final dapat berbeda berdasarkan kondisi kendaraan dan hasil diagnosa mekanik.
          </div>
        </div>

        {/* Services by category */}
        {Object.keys(grouped).map(cat => (
          <div key={cat} className="mb-14">
            {/* Category header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-11 h-11 rounded-xl bg-orange-pale border border-orange-lite flex items-center justify-center text-xl flex-shrink-0">
                {CAT_LABELS[cat]?.icon || <Wrench className="w-5 h-5 text-orange-600" />}
              </div>
              <div>
                <h2 className="font-playfair text-[22px] font-black text-dark leading-tight">{CAT_LABELS[cat]?.title}</h2>
                <div className="text-[12px] text-stone-mid font-medium">{grouped[cat].length} layanan tersedia</div>
              </div>
              <div className="flex-1 h-px bg-stone-lite ml-2" />
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {grouped[cat].map(s => (
                <ServiceCard key={s.id} service={s} />
              ))}
            </div>
          </div>
        ))}

        {/* Empty state */}
        {filteredServices.length === 0 && activecat !== 'sparepart' && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">
              <Search className="w-4 h-4" />
            </div>
            <div className="text-[16px] font-semibold text-dark mb-2">Layanan tidak ditemukan</div>
            <div className="text-[14px] text-stone-mid">Coba kata kunci lain atau pilih kategori berbeda</div>
            <button onClick={() => { setSearch(''); setActivecat('all') }}
              className="mt-6 px-6 py-2.5 bg-orange text-white rounded-full text-[13px] font-bold border-none cursor-pointer">
              Reset Filter
            </button>
          </div>
        )}

        {/* Sparepart table */}
        {showSparepart && <SparepartTable data={sparepartDB} />}

        {/* CTA */}
        <CtaStrip />
      </div>

      <Footer />
    </div>
  )
}

// ── Service Card Component ────────────────────────────────────────────────────
function ServiceCard({ service: s }: { service: any }) {
  return (
    <div className={`bg-white rounded-2xl border border-stone-lite overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:border-orange-lite group ${s.badge === 'Paling Populer' ? '!bg-[#0f0d0b] !border-orange' : ''}`}>
      {/* Top */}
      <div className="flex items-start justify-between p-6 pb-0">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${s.badge === 'Paling Populer' ? 'bg-orange/15 border border-orange/30' : 'bg-orange-pale border border-orange-lite'}`}>
          <s.icon className="w-6 h-6 text-orange" />
        </div>
        {s.badge && (
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide flex-shrink-0 ml-2 ${BADGE_STYLE[s.badgeColor] || ''}`}>
            {s.badge}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-6">
        <div className={`text-[17px] font-black mb-2 tracking-tight ${s.badge === 'Paling Populer' ? 'text-white' : 'text-dark'}`}>{s.name}</div>
        {s.desc && s.desc !== 'Layanan servis kendaraan' && (
          <div className={`text-[13px] leading-relaxed mb-4 ${s.badge === 'Paling Populer' ? 'text-stone-mid' : 'text-[#57534e]'}`}>
            {s.desc}
          </div>
        )}

        {/* Includes */}
        <div className="flex flex-col gap-1.5 mb-4">
          {(s.includes || []).map((inc: string, i: number) => (
            <div key={i} className="flex items-center gap-2 text-[12px]">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0
                ${s.badge === 'Paling Populer' ? 'bg-orange/15 text-orange-lite' : 'bg-green-100 text-green-700'}`}>✓</div>
              <span className={s.badge === 'Paling Populer' ? 'text-stone-mid' : 'text-[#57534e]'}>{inc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className={`flex items-center justify-between px-6 py-4 border-t ${s.badge === 'Paling Populer' ? 'border-white/8' : 'border-stone-lite'}`}>
        <div>
          <div className="text-[10px] text-stone-mid font-semibold uppercase tracking-wide">Estimasi Biaya Jasa</div>
          <div className={`font-sans text-[20px] text-red-500 font-bold mt-0.5 ${s.badge === 'Paling Populer' ? 'text-orange-lite' : 'text-dark'}`}>{s.price}</div>
          <div className="text-[11px] text-stone-mid mt-0.5">{s.priceNote}</div>
        </div>
      </div>
    </div>
  )
}

// ── Sparepart Table ───────────────────────────────────────────────────────────
function SparepartTable({ data }: { data: any[] }) {
  return (
    <div className="mb-14">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-11 h-11 rounded-xl bg-orange-pale border border-orange-lite flex items-center justify-center text-xl"><TagIcon className='w-4 h-4 text-orange'/></div>
        <div>
          <h2 className="font-playfair text-[22px] font-black text-dark">Harga Sparepart Umum</h2>
          <div className="text-[12px] text-stone-mid">Referensi harga — belum termasuk biaya jasa pemasangan</div>
        </div>
        <div className="flex-1 h-px bg-stone-lite ml-2" />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-2xl border border-stone-lite overflow-hidden">
        <table className="w-full table-fixed border-collapse bg-white">
          
          <colgroup>
            <col className="w-1/2" />
            <col className="w-1/4" />
            <col className="w-1/4" />
          </colgroup>

          <thead className="bg-stone-900 text-white">
            <tr>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide">
                Nama Sparepart
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide">
                Spesifikasi
              </th>
              <th className="px-5 py-3.5 text-right text-[11px] font-bold uppercase tracking-wide">
                Harga Satuan
              </th>
            </tr>
          </thead>

          <tbody>
            {data.map((sp, i) => (
              <tr key={i} className="border-t border-stone-200">
                
                <td className="px-5 py-3.5">
                  <div className="text-[14px] font-semibold text-dark break-words">
                    {sp.nama_sparepart}
                  </div>
                  <div className="text-[12px] text-stone-mid mt-0.5">
                    {sp.mobil} • {sp.kategori}
                  </div>
                </td>

                <td className="px-5 py-3.5 text-[14px] text-[#57534e]">
                  {sp.satuan}
                </td>

                <td className="px-5 py-3.5 text-right font-sans text-[14px] text-red-500 font-bold text-dark">
                  Rp {Number(sp.harga_jual).toLocaleString("id-ID")}
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {data.map((sp, i) => (
          <div key={i} className="bg-white rounded-2xl border p-4">
            <div className="flex justify-between">
              <div>
                <div className="font-semibold">{sp.nama_sparepart}</div>
                <div className="text-xs text-stone-500">
                  {sp.mobil} • {sp.kategori}
                </div>
              </div>
              <span className="text-xs">
                {sp.stok > 0 ? "Tersedia" : "Habis"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── CTA Strip ─────────────────────────────────────────────────────────────────
function CtaStrip() {
  return (
    <div className="bg-orange rounded-3xl px-8 py-10 md:px-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
      <div className="absolute right-[-40px] top-1/2 -translate-y-1/2 font-playfair font-black text-white/10 pointer-events-none select-none hidden lg:block" style={{ fontSize: 120, whiteSpace:'nowrap' }}>BOOKING</div>
      <div className="relative z-10">
        <h3 className="font-playfair text-[28px] md:text-[32px] font-black text-white leading-tight">
          Sudah Tahu Estimasinya?<br />Yuk Booking Sekarang!
        </h3>
        <p className="text-[14px] text-white/75 mt-2">Booking online mudah, pilih jadwal yang sesuai, kendaraan langsung ditangani mekanik kami.</p>
      </div>
      <div className="flex gap-3 flex-shrink-0 relative z-10 flex-wrap">
        <Link href="/pelangan/booking">
          <button className="bg-dark hover:bg-dark-2 transition-colors text-white px-7 py-3.5 rounded-xl text-[14px] font-bold border-none cursor-pointer">
            Booking Sekarang
          </button>
        </Link>
      </div>
    </div>
  )
}
