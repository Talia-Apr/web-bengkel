'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Wrench, Car, CheckCircle, Clock, AlertCircle, ClipboardList } from 'lucide-react'
import { format } from 'date-fns'

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
  menunggu_konfirmasi: { label: 'Menunggu Konfirmasi', color: 'text-yellow-700', bg: 'bg-yellow-100', icon: Clock       },
  dikonfirmasi:        { label: 'Dikonfirmasi',        color: 'text-blue-700',   bg: 'bg-blue-100',   icon: CheckCircle },
  dalam_pengerjaan:    { label: 'Dalam Pengerjaan',    color: 'text-orange-700', bg: 'bg-orange-100', icon: Wrench      },
  test_drive:          { label: 'Test Drive',          color: 'text-purple-700', bg: 'bg-purple-100', icon: Car         },
  selesai:             { label: 'Selesai',             color: 'text-green-700',  bg: 'bg-green-100',  icon: CheckCircle },
}

export default function MekanikDashboard() {
  const router = useRouter()

  const [mekanik, setMekanik] = useState<MekanikInfo | null>(null)
  const [tugas, setTugas]     = useState<ServisRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/mekanik/tugas')
    const json = await res.json()
    if (json.success) {
      setTugas(json.data)
      if (json.mekanik) setMekanik(json.mekanik)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch('/api/mekanik/profile')
      .then(r => r.json())
      .then(j => { if (j.success) setMekanik(j.data) })
      .catch(() => {})
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const today   = format(new Date(), 'yyyy-MM-dd')
  const aktif   = tugas.filter(t => t.status_servis !== 'selesai')
  const selesai = tugas.filter(t => t.status_servis === 'selesai')

  const hari_ini = aktif.filter(t =>
    t.tanggal_booking === today || t.tanggal_servis === today
  )
  const lainnya = aktif.filter(t =>
    t.tanggal_booking !== today && t.tanggal_servis !== today
  )

  const sedangDikerjakan = tugas.filter(t =>
    ['dalam_pengerjaan', 'test_drive'].includes(t.status_servis)
  ).length

  const renderKartu = (t: ServisRow) => {
    const cfg  = statusConfig[t.status_servis] ?? statusConfig.menunggu_konfirmasi
    const Icon = cfg.icon
    return (
      <div key={t.id_servis} className="w-full bg-white border border-stone-200 rounded-xl p-4">
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
              <p className="text-xs text-stone-400 mt-0.5 truncate">{t.keluhan}</p>
            )}
          </div>
          <button
            onClick={() => router.push(`/mekanik/tugas/${t.id_servis}`)}
            className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm bg-orange-600 font-medium text-white hover:bg-orange-700 flex-shrink-0"
          >
            <ClipboardList className="w-4 h-4" /> Detail
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Header card mekanik ── */}
      <div className="bg-stone-900 rounded-2xl p-6 text-white">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Wrench className="w-7 h-7" />
            </div>
            <div>
              <p className="text-stone-400 text-xs">Mekanik</p>
              <h2 className="text-xl font-bold">{mekanik?.nama ?? '...'}</h2>
              {mekanik?.spesialisasi && (
                <p className="text-stone-300 text-sm">{mekanik.spesialisasi}</p>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
              <div className="text-2xl font-bold text-orange-400">{sedangDikerjakan}</div>
              <div className="text-xs text-stone-400">Dikerjakan</div>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
              <div className="text-2xl font-bold">{aktif.length}</div>
              <div className="text-xs text-stone-400">Aktif</div>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
              <div className="text-2xl font-bold text-green-400">{selesai.length}</div>
              <div className="text-xs text-stone-400">Selesai</div>
            </div>
          </div>
        </div>

        {/* Status badge */}
        {mekanik && (
          <div className="mt-4 pt-4 border-t border-stone-800 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
              mekanik.status === 'aktif' ? 'bg-green-400' : 'bg-stone-500'
            }`} />
            <span className="text-sm text-stone-300">
              {mekanik.status === 'aktif' ? 'Aktif' : 'Tidak Aktif'}
            </span>
          </div>
        )}
      </div>

      {/* ── Daftar tugas ── */}
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

          {lainnya.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-stone-400" />
                <p className="text-sm font-semibold text-stone-700">
                  Tugas Lainnya ({lainnya.length})
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