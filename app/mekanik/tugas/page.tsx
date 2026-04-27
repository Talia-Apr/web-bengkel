'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Wrench, Car, Clock, Check, CheckCircle, ChevronRight, Search, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'

interface ServisRow {
  id_servis: number
  id_booking: number
  tanggal_servis: string
  status_servis: string
  keluhan: string
  tanggal_booking: string
  nomor_polisi: string
  merk: string
  tahun: number
  warna: string
  nama_pelanggan: string
  no_telp: string
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  menunggu_konfirmasi: { label: 'Menunggu Konfirmasi', color: 'text-yellow-700', bg: 'bg-yellow-100', icon: Clock       },
  dikonfirmasi:        { label: 'Dikonfirmasi',        color: 'text-blue-700',   bg: 'bg-blue-100',   icon: Check       },
  dalam_pengerjaan:    { label: 'Dalam Pengerjaan',    color: 'text-orange-700', bg: 'bg-orange-100', icon: Wrench      },
  test_drive:          { label: 'Test Drive',          color: 'text-purple-700', bg: 'bg-purple-100', icon: Car         },
  selesai:             { label: 'Selesai',             color: 'text-green-700',  bg: 'bg-green-100',  icon: CheckCircle },
}

const prioritasUrut = ['dikonfirmasi', 'dalam_pengerjaan', 'test_drive', 'menunggu_konfirmasi', 'selesai']

const formatTanggal = (val: string) => {
  try {
    const d = val.includes('T') ? parseISO(val) : parseISO(val + 'T00:00:00')
    return format(d, 'EEEE, dd MMM yyyy', { locale: id })
  } catch { return val }
}

export default function MekanikTugasPage() {
  const router                = useRouter()
  const [list, setList]       = useState<ServisRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<'aktif' | 'selesai'>('aktif')
  const [query, setQuery]     = useState('')

  const fetchTugas = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/mekanik/tugas')
    const json = await res.json()
    if (json.success) setList(json.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchTugas() }, [fetchTugas])

  const aktif   = useMemo(() => list.filter(t => t.status_servis !== 'selesai'), [list])
  const selesai = useMemo(() => list.filter(t => t.status_servis === 'selesai'), [list])

  const displayList = useMemo(() => {
    const base = tab === 'aktif' ? aktif : selesai
    const q    = query.trim().toLowerCase()
    const filtered = q
      ? base.filter(t =>
          t.nama_pelanggan.toLowerCase().includes(q) ||
          t.merk.toLowerCase().includes(q)           ||
          t.nomor_polisi.toLowerCase().includes(q)
        )
      : base
    return tab === 'aktif'
      ? [...filtered].sort((a, b) =>
          prioritasUrut.indexOf(a.status_servis) - prioritasUrut.indexOf(b.status_servis)
        )
      : filtered
  }, [tab, aktif, selesai, query])

  const renderCard = (t: ServisRow) => {
    const cfg  = statusConfig[t.status_servis] ?? statusConfig.menunggu_konfirmasi
    const Icon = cfg.icon
    return (
      <button
        key={t.id_servis}
        onClick={() => router.push(`/mekanik/tugas/${t.id_servis}`)}
        className="w-full bg-white border border-stone-200 rounded-xl p-4 hover:border-orange-300 hover:shadow-sm transition-all text-left group"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
            <Icon className={`w-5 h-5 ${cfg.color}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="font-semibold text-stone-900 text-sm">{t.nama_pelanggan}</span>
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                {cfg.label}
              </span>
            </div>
            <p className="text-sm text-stone-600">
              {t.merk} {t.tahun}
              <span className="text-stone-400 ml-1.5 font-mono text-xs">· {t.nomor_polisi}</span>
            </p>
            {t.keluhan && (
              <p className="text-xs text-stone-400 mt-0.5 truncate">{t.keluhan}</p>
            )}
            <p className="text-xs text-stone-400 mt-1">{formatTanggal(t.tanggal_booking)}</p>
          </div>

          <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-orange-500 flex-shrink-0 transition-colors" />
        </div>
      </button>
    )
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-stone-900">Daftar Tugas</h2>
        <p className="text-stone-500 text-sm mt-0.5">Klik tugas untuk mengelola pengerjaan servis</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Cari nama pelanggan, merk mobil, atau nomor polisi..."
          className="w-full pl-9 pr-9 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tab */}
      <div className="flex bg-stone-800 rounded-xl p-1 gap-1">
        {([
          { key: 'aktif'   as const, label: 'Aktif',   count: aktif.length },
          { key: 'selesai' as const, label: 'Selesai' },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all
              ${tab === t.key
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
              }`}
          >
            {t.label}

            {/* Badge count hanya muncul di tab 'aktif' atau jika t.count ada nilainya */}
            {t.count !== undefined && t.count > 0 && (
              <span className="bg-white text-orange-600 text-xs px-1.5 py-0.5 rounded-full font-bold">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Konten */}
      {loading ? (
        <div className="text-center py-16 text-stone-400 text-sm">Memuat tugas...</div>
      ) : displayList.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          {query ? (
            <>
              <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Tidak ada hasil untuk &ldquo;{query}&rdquo;</p>
              <button onClick={() => setQuery('')}
                className="mt-2 text-xs text-orange-600 hover:underline">
                Hapus pencarian
              </button>
            </>
          ) : tab === 'aktif' ? (
            <>
              <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Tidak ada tugas aktif</p>
              <p className="text-xs mt-1">Admin belum menugaskan servis ke kamu</p>
            </>
          ) : (
            <>
              <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Belum ada servis selesai</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayList.map(renderCard)}
        </div>
      )}
    </div>
  )
}
