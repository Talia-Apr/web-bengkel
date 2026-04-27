'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Wrench, Car, CheckCircle, Clock, ChevronRight, AlertCircle, ClipboardList } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'

interface MekanikInfo {
  id_mekanik: number
  nama: string
  spesialisasi: string
  status: string
}

interface ServisRow {
  id_servis: number
  tanggal_servis: string
  status_servis: string
  keluhan: string
  tanggal_booking: string
  waktu_booking: string
  nomor_polisi: string
  merk: string
  tahun: number
  warna: string
  nama_pelanggan: string
  no_telp: string
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  menunggu_konfirmasi: { label: 'Menunggu Konfirmasi', color: 'text-yellow-700', bg: 'bg-yellow-100',  icon: Clock        },
  dikonfirmasi:        { label: 'Dikonfirmasi',        color: 'text-blue-700',   bg: 'bg-blue-100',    icon: CheckCircle  },
  dalam_pengerjaan:    { label: 'Dalam Pengerjaan',    color: 'text-orange-700', bg: 'bg-orange-100',  icon: Wrench       },
  test_drive:          { label: 'Test Drive',          color: 'text-purple-700', bg: 'bg-purple-100',  icon: Car          },
  selesai:             { label: 'Selesai',             color: 'text-green-700',  bg: 'bg-green-100',   icon: CheckCircle  },
}

const formatWaktu = (val: string) => {
  try {
    const d = val.includes('T') ? parseISO(val) : parseISO(val + 'T00:00:00')
    return format(d, 'EEEE, dd MMM yyyy', { locale: id })
  } catch { return val }
}

export default function MekanikDashboard() {
  const router = useRouter()

  const [mekanik, setMekanik]   = useState<MekanikInfo | null>(null)
  const [tugas, setTugas]       = useState<ServisRow[]>([])
  const [loading, setLoading]   = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/mekanik/tugas')
    const json = await res.json()

    if (json.success) {
      setTugas(json.data)
      // Ambil info mekanik dari endpoint GET juga
      if (json.mekanik) setMekanik(json.mekanik)
    }
    setLoading(false)
  }, [])

  // Ambil info mekanik dari session
  useEffect(() => {
    fetch('/api/mekanik/profile')
      .then(r => r.json())
      .then(j => { if (j.success) setMekanik(j.data) })
      .catch(() => {})
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const today    = format(new Date(), 'yyyy-MM-dd')
  const aktif    = tugas.filter(t => t.status_servis !== 'selesai')
  const hari_ini = aktif.filter(t => t.tanggal_booking === today || t.tanggal_servis === today)
  const lainnya  = aktif.filter(t => t.tanggal_booking !== today && t.tanggal_servis !== today)
  const selesai  = tugas.filter(t => t.status_servis === 'selesai')

  const sedangDikerjakan = tugas.filter(t =>
    ['dalam_pengerjaan', 'test_drive'].includes(t.status_servis)
  ).length

  const renderKartu = (t: ServisRow) => {
    const cfg  = statusConfig[t.status_servis] ?? statusConfig.menunggu_konfirmasi
    const Icon = cfg.icon
    return (
      <div
        key={t.id_servis}
        className="w-full bg-white border border-stone-200 rounded-xl p-4 text-left group"
      >
         <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
            <Icon className={`w-5 h-5 ${cfg.color}`} />
        </div>

           <div className="flex-1 min-w-0">
             <div className="flex items-center gap-2 flex-wrap">
               <span className="font-semibold text-stone-900 text-sm">{t.nama_pelanggan}</span>
               <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                 {cfg.label}
               </span>
             </div>
             <p className="text-sm text-stone-600">
               {t.merk} {t.tahun}
               <span className="text-stone-400 ml-1.5">· {t.nomor_polisi}</span>
             </p>
             {t.keluhan && (
               <p className="text-xs text-stone-400 mt-0.5 truncate">
                 {t.keluhan}
               </p>
             )}
          </div>         

          <div className="flex items-end md:justify-end">
            <button
              onClick={() => router.push(`/mekanik/tugas/${t.id_servis}`)}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm bg-orange rounded-xl font-medium text-white hover:bg-orange-600"
            >
              <ClipboardList className="w-4 h-4" /> Detail Servis
            </button>
          </div>
        </div>
      </div>

    )
  }

  return (
    <div className="space-y-6">

      {/* ── Header card mekanik ── */}
      <div className="bg-stone-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Wrench className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-stone-400 text-xs">Mekanik</p>
            <h2 className="text-xl font-bold truncate">
              {mekanik?.nama ?? '...'}
            </h2>
            {mekanik?.spesialisasi && (
              <p className="text-stone-300 text-sm">
                Spesialisasi: {mekanik.spesialisasi}
              </p>
            )}
          </div>
          <div className="flex gap-5 flex-shrink-0">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-400">{sedangDikerjakan}</p>
              <p className="text-xs text-stone-400">Dikerjakan</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{aktif.length}</p>
              <p className="text-xs text-stone-400">Aktif</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{selesai.length}</p>
              <p className="text-xs text-stone-400">Selesai</p>
            </div>
          </div>
        </div>

        {/* Status badge mekanik */}
        {mekanik && (
          <div className="mt-4 pt-4 border-t border-stone-800 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full flex-shrink-0
              ${mekanik.status === 'tersedia'    ? 'bg-green-400'  : ''}
              ${mekanik.status === 'sibuk'       ? 'bg-orange-400' : ''}
              ${mekanik.status === 'tidak_aktif' ? 'bg-stone-500'  : ''}
            `} />
            <span className="text-sm text-stone-300 capitalize">
              {mekanik.status === 'tersedia'    ? 'Tersedia'    :
               mekanik.status === 'sibuk'       ? 'Sedang Sibuk' :
               mekanik.status === 'tidak_aktif' ? 'Tidak Aktif'  : mekanik.status}
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-stone-400 text-sm">Memuat tugas...</div>
      ) : tugas.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-12 text-center text-stone-400">
          <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-300" />
          <p className="font-medium">Tidak ada tugas saat ini</p>
          <p className="text-xs mt-1">Admin belum menugaskan servis ke anda</p>
        </div>
      ) : (
        <>
          {/* ── Tugas hari ini ── */}
          {hari_ini.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-600" />
                <p className="text-sm font-semibold text-stone-700">
                  Tugas Hari Ini ({hari_ini.length})
                </p>
              </div>
              {hari_ini.map(renderKartu)}
            </div>
          )}

          {/* ── Tugas lainnya ── */}
          {lainnya.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-stone-400" />
                <p className="text-sm font-semibold text-stone-700">
                  Tugas Hari ini ({lainnya.length})
                </p>
              </div>
              {lainnya.map(renderKartu)}
            </div>
          )}

        </>
      )}
    </div>
  )
}
