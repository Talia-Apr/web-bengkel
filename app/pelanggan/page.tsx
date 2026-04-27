'use client'

import { useEffect, useState } from 'react'
import { Car, Calendar, ArrowRight, Wrench, Clock, CheckCircle, ClipboardList } from 'lucide-react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'

interface Pelanggan {
  nama: string
  jenis_pelanggan: string
  nama_perusahaan: string | null
}

interface ServisBerjalan {
  id_booking: number
  tanggal_booking: string
  keluhan: string
  nomor_polisi: string
  merk: string
  tahun: number
  id_servis: number
  status_servis: string
  catatan_servis: string | null
  nama_mekanik: string | null
}

interface Stats {
  total_booking: number
  menunggu: number
  selesai: number
}

const statusServisConfig: Record<string, { label: string; color: string; progress: number }> = {
  menunggu_konfirmasi: { label: 'Menunggu Mekanik',  color: 'bg-yellow-100 text-yellow-800', progress: 1 },
  dikonfirmasi:        { label: 'Siap Dikerjakan',   color: 'bg-blue-100 text-blue-800',    progress: 2 },
  dalam_pengerjaan:    { label: 'Sedang Dikerjakan', color: 'bg-orange-100 text-orange-800', progress: 3 },
  test_drive:          { label: 'Test Drive',        color: 'bg-purple-100 text-purple-800', progress: 4 },
  selesai:             { label: 'Selesai',           color: 'bg-green-100 text-green-800',  progress: 5 },
}

const formatTanggal = (val: string) => {
  try {
    const date = val.includes('T') ? parseISO(val) : parseISO(val + 'T00:00:00')
    return format(date, 'dd MMM yyyy', { locale: id })
  } catch { return val }
}

export default function PelangganDashboard() {
  const [pelanggan, setPelanggan]   = useState<Pelanggan | null>(null)
  const [berjalan, setBerjalan]     = useState<ServisBerjalan[]>([])
  const [stats, setStats]           = useState<Stats | null>(null)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    fetch('/api/pelanggan/dashboard')
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setPelanggan(json.data.pelanggan)
          setBerjalan(json.data.berjalan)
          setStats(json.data.stats)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-stone-400 text-sm">Memuat...</div>
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-br from-orange-600 to-amber-500 rounded-2xl p-6 text-white">
        <p className="text-orange-100 text-sm">Halo,</p>
        <div className="mt-1 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">{pelanggan?.nama ?? '...'}</h2>
            <p className="text-orange-100 text-sm mt-1">
              {pelanggan?.jenis_pelanggan === 'perusahaan'
                ? pelanggan.nama_perusahaan
                : 'Pelanggan Bengkel Nugraha Jaya'}
            </p>
          </div>
          <div className="flex gap-3">
            <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
              <div className="text-2xl font-bold">{stats?.total_booking ?? 0}</div>
              <div className="text-xs text-orange-100">Total</div>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
              <div className="text-2xl font-bold">{stats?.menunggu ?? 0}</div>
              <div className="text-xs text-orange-100">Menunggu</div>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
              <div className="text-2xl font-bold">{stats?.selesai ?? 0}</div>
              <div className="text-xs text-orange-100">Selesai</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/pelanggan/booking"
          className="flex items-center gap-3 bg-stone-900 text-white rounded-xl p-4 hover:bg-stone-800 transition-colors group">
          <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">Booking Servis</div>
            <div className="text-stone-400 text-xs">Jadwalkan servis baru</div>
          </div>
          <ArrowRight className="w-4 h-4 text-stone-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
        </Link>

        <Link href="/pelanggan/progress"
          className="flex items-center gap-3 bg-white border border-stone-200 rounded-xl p-4 hover:border-orange-300 transition-colors group">
          <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <Wrench className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-stone-900">Progress Servis</div>
            <div className="text-stone-400 text-xs">Pantau pengerjaan</div>
          </div>
          <ArrowRight className="w-4 h-4 text-stone-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
        </Link>

        <Link href="/pelanggan/riwayat"
          className="flex items-center gap-3 bg-white border border-stone-200 rounded-xl p-4 hover:border-orange-300 transition-colors group">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-stone-900">Riwayat Servis</div>
            <div className="text-stone-400 text-xs">Lihat servis selesai</div>
          </div>
          <ArrowRight className="w-4 h-4 text-stone-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
        </Link>
      </div>

      
      {/* Booking menunggu konfirmasi */}
      {stats && stats.menunggu > 0 && (
        <Link href="/pelanggan/booking"
          className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4 hover:bg-yellow-100 transition-colors">
          <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-800">
              {stats.menunggu} booking menunggu konfirmasi
            </p>
            <p className="text-xs text-yellow-600 mt-0.5">Klik untuk melihat detail</p>
          </div>
          <ArrowRight className="w-4 h-4 text-yellow-600 flex-shrink-0" />
        </Link>
      )}

      {/* Servis sedang dikerjakan */}
      <div>
        <h3 className="font-semibold text-stone-900 mb-3">Sedang Diservis</h3>
        {berjalan.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-xl p-8 text-center text-stone-400">
            <Car className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Tidak ada kendaraan yang sedang diservis</p>
            <p className="text-xs mt-1 text-stone-300">Cek status booking di halaman Booking Servis</p>
          </div>
        ) : (
          <div className="space-y-4">
            {berjalan.map(b => {
              const cfg = statusServisConfig[b.status_servis] ?? statusServisConfig.dalam_pengerjaan
              const PROGRESS_STEPS = ['dikonfirmasi', 'dalam_pengerjaan', 'test_drive', 'selesai']
              const currentIdx = PROGRESS_STEPS.indexOf(b.status_servis)

              return (
                <div key={b.id_booking} className="bg-white border border-orange-200 rounded-xl p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Car className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-stone-900">{b.merk} {b.tahun}</div>
                        <div className="text-xs text-stone-400">{b.nomor_polisi} · {formatTanggal(b.tanggal_booking)}</div>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-1 mb-4">
                    {PROGRESS_STEPS.map((s, i) => (
                      <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${
                        i <= currentIdx ? 'bg-orange-500' : 'bg-stone-200'
                      }`} />
                    ))}
                  </div>

                  {/* Info */}
                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div>
                      <div className="text-stone-400 text-xs">Mekanik</div>
                      <div className="font-medium mt-0.5">{b.nama_mekanik ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-stone-400 text-xs">Status</div>
                      <div className="font-medium mt-0.5">{cfg.label}</div>
                    </div>
                  </div>

                  {b.catatan_servis && (
                    <div className="bg-stone-50 rounded-lg px-3 py-2 text-xs text-stone-600 mb-3">
                      <span className="flex items-center gap-1">
                          <ClipboardList className='w-4 h-4'/> {b.catatan_servis}
                      </span>                      
                    </div>
                  )}

                  {b.status_servis === 'dalam_pengerjaan' && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-2.5 flex items-center gap-2 mb-3">
                      <Wrench className="w-4 h-4 text-orange-600 animate-spin" style={{ animationDuration: '3s' }} />
                      <span className="text-sm text-orange-700 font-medium">Kendaraan sedang dalam proses pengerjaan</span>
                    </div>
                  )}

                  <Link href="/pelanggan/progress"
                    className="flex items-center justify-center gap-2 text-orange-600 text-sm font-medium hover:text-orange-700 transition-colors">
                    Lihat detail progress <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
