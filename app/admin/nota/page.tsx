'use client'

import { useState, useEffect, useCallback } from 'react'
import { Receipt, Search, Check, ChevronDown, ClipboardList } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'
import { useRouter } from 'next/navigation'

interface NotaRow {
  id_nota: number
  id_servis: number
  nomor_nota: string
  total_biaya: number
  metode_pembayaran: string
  status_pembayaran: string
  tanggal_pembayaran: string | null
  jatuh_tempo: string | null
  diskon_jasa: number
  diskon_sparepart: number
  tanggal_nota: string
  nama_pelanggan: string
  jenis_pelanggan: string
  no_telp: string
  nomor_polisi: string
  merk: string
  tipe: string
  tahun: number
  nama_mekanik: string
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(n)

const formatTanggal = (val: string) => {
  try {
    const date = val.includes('T') ? parseISO(val) : parseISO(val + 'T00:00:00')
    return format(date, 'dd MMM yyyy', { locale: id })
  } catch {
    return val
  }
}

const getSisaHari = (jatuh_tempo: string | null): number | null => {
  if (!jatuh_tempo) return null
  try {
    const raw = String(jatuh_tempo)
 
    let year: number, month: number, day: number
 
    if (raw.includes('T') || raw.includes('Z')) {
      // Format dari MySQL: "2026-04-26T17:00:00.000Z" (UTC)
      // Konversi ke Date lalu ambil tanggal lokal (bukan UTC)
      const d = new Date(raw)
      year    = d.getFullYear()    // getFullYear() pakai timezone lokal
      month   = d.getMonth() + 1  // getMonth() 0-indexed
      day     = d.getDate()        // getDate() pakai timezone lokal
    } else {
      // Format plain: "2026-04-27"
      const parts = raw.substring(0, 10).split('-').map(Number)
      year = parts[0]; month = parts[1]; day = parts[2]
    }
 
    const today    = new Date()
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const jtMid    = new Date(year, month - 1, day)
 
    const diffMs   = jtMid.getTime() - todayMid.getTime()
    return Math.round(diffMs / (1000 * 60 * 60 * 24))
  } catch {
    return null
  }
}

export default function AdminNotaPage() {
  const router = useRouter()
  const [notas, setNotas] = useState<NotaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [success, _setSuccess] = useState('')

  const fetchNotas = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filterStatus) params.set('status', filterStatus)

    const res = await fetch(`/api/admin/nota?${params.toString()}`)
    const json = await res.json()

    if (json.success) setNotas(json.data)
    setLoading(false)
  }, [search, filterStatus])

  useEffect(() => {
    fetchNotas()
  }, [fetchNotas])

  const renderNotaCard = (n: NotaRow) => {
    const sisaHari = getSisaHari(n.jatuh_tempo)
    const isLunas = n.status_pembayaran === 'lunas'

    return (
      <div
        key={n.id_nota}
        className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-orange-300 transition-all"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0 border border-orange-100">
              <Receipt className="w-5 h-5 text-orange-500" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-stone-900">{n.nama_pelanggan}</h3>
                <span className="font-mono text-xs text-stone-500">{n.nomor_nota}</span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                {n.merk} {n.tipe} · {n.nomor_polisi}
              </p>
            </div>
          </div>

          <span
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
              isLunas ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {isLunas ? 'LUNAS' : 'BELUM LUNAS'}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4 pt-4 border-t border-stone-100">
          <div>
            <p className="text-xs text-stone-400">Tanggal Selesai</p>
            <p className="text-sm font-medium text-stone-800">{formatTanggal(n.tanggal_nota)}</p>
          </div>

          <div>
            <p className="text-xs text-stone-400">Mekanik</p>
            <p className="text-sm font-medium text-stone-800">{n.nama_mekanik ?? '-'}</p>
          </div>

          <div>
            <p className="text-xs text-stone-400">Total</p>
            <p className="text-sm font-semibold text-green-600">{formatRupiah(n.total_biaya)}</p>
          </div>

          <div>
            <p className="text-xs text-stone-400">Tempo Pembayaran</p>

            <p
              className={`text-sm font-semibold ${
                isLunas || sisaHari == null
                  ? 'text-stone-400'
                  : sisaHari <= 11
                    ? 'text-red-600'
                    : sisaHari <= 3
                      ? 'text-amber-600'
                      : 'text-stone-400'
              }`}
            >
              {isLunas || sisaHari == null
                ? '0 hari lagi'
                : sisaHari < 0
                  ? `Lewat ${Math.abs(sisaHari)} hari`
                  : sisaHari === 0
                    ? 'Jatuh tempo hari ini'
                    : `${sisaHari} hari lagi`}
            </p>
          </div>          

          <div className="flex items-end md:justify-end">
            <button
              onClick={() => router.push(`/admin/nota/${n.id_nota}`)}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm bg-yellow-300 rounded-xl font-bold text-yellow-800 hover:bg-yellow-400"
            >
              <ClipboardList className="w-4 h-4" /> Detail Nota
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
          <Check className="w-4 h-4 flex-shrink-0" /> {success}
        </div>
      )}

      <div>
        <h2 className="font-display text-2xl font-bold text-stone-900">Kelola Nota</h2>
        <p className="text-stone-500 text-sm mt-1">Kelola nota servis dan status pembayaran</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            placeholder="Cari nama pelanggan atau plat nomor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="relative">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="appearance-none pl-4 pr-9 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-stone-700"
          >
            <option value="">Semua Status</option>
            <option value="belum_lunas">Belum Lunas</option>
            <option value="lunas">Lunas</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <p className="text-stone-400 text-sm text-center py-8">Memuat nota...</p>
        ) : notas.length === 0 ? (
          <div className="text-center py-8 text-stone-400">
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Tidak ada nota</p>
          </div>
        ) : (
          notas.map(n => renderNotaCard(n))
        )}
      </div>
    </div>
  )
}