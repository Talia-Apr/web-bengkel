'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Car, Wrench, DollarSign, BarChart3, Calendar, Clock, CheckCircle } from 'lucide-react'
import { format, subDays, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'

interface DashboardData {
  total_booking_bulan: number
  total_selesai: number
  total_pendapatan: number
  pendapatan_bulan: number
  booking_hari_ini: number
  menunggu_konfirmasi: number
  weekly: { tanggal: string; total: number }[]
  jasa_populer: { nama_jasa: string; total: number }[]
  booking_terbaru: {
    id_booking: number
    tanggal_booking: string
    keluhan: string
    status_booking: string
    nomor_polisi: string
    merk: string
    tahun: number
    nama_pelanggan: string
  }[]
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

const statusConfig: Record<string, { label: string; color: string }> = {
  menunggu:     { label: 'Menunggu',     color: 'bg-yellow-100 text-yellow-700' },
  dikonfirmasi: { label: 'Dikonfirmasi', color: 'bg-blue-100 text-blue-700' },
  proses:       { label: 'Diproses',     color: 'bg-orange-100 text-orange-700' },
  selesai:      { label: 'Selesai',      color: 'bg-green-100 text-green-700' },
  dibatalkan:   { label: 'Dibatalkan',   color: 'bg-stone-100 text-stone-500' },
  ditolak:      { label: 'Ditolak',      color: 'bg-red-100 text-red-700' },
}

export default function PemilikDashboard() {
  const [data, setData]       = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/pemilik/dashboard')
      .then(r => r.json())
      .then(j => { if (j.success) setData(j.data) })
      .finally(() => setLoading(false))
  }, [])

  // Chart Booking 6 Terakhir
  const weeklyChart = (() => {
    const result = []
    let daysBack = 0
    while (result.length < 6) {
      const date = subDays(new Date(), daysBack)
      if (date.getDay() !== 0) { 
        const tanggal = format(date, 'yyyy-MM-dd')
        const found   = data?.weekly.find(w => w.tanggal.substring(0, 10) === tanggal)
        result.unshift({ tanggal, total: found?.total ?? 0 })
      }
      daysBack++
    }
    return result
  })()

  const maxWeekly = Math.max(...weeklyChart.map(w => w.total), 1)
  const maxJasa   = Math.max(...(data?.jasa_populer.map(j => j.total) ?? [1]), 1)
  const today     = format(new Date(), 'yyyy-MM-dd')

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-stone-400 text-sm">
      Memuat dashboard...
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-stone-900 to-stone-800 rounded-2xl p-6 text-white relative overflow-hidden">
        <p className="text-yellow-200 text-sm">Selamat datang,</p>
        <h2 className="font-display text-2xl font-bold mt-1">Pemilik Bengkel</h2>
        <p className="text-yellow-100 text-sm mt-1">
          {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Booking Bulan Ini',
            value: data?.total_booking_bulan ?? 0,
            icon: Calendar,
            color: 'bg-blue-500',
            suffix: 'booking'
          },
          {
            label: 'Kendaraan Selesai',
            value: data?.total_selesai ?? 0,
            icon: Wrench,
            color: 'bg-green-500',
            suffix: 'unit'
          },
          {
            label: 'Booking Hari Ini',
            value: data?.booking_hari_ini ?? 0,
            icon: Car,
            color: 'bg-orange-500',
            suffix: 'unit'
          },
          {
            label: 'Pendapatan Bulan Ini',
            value: formatRupiah(data?.pendapatan_bulan ?? 0),
            icon: DollarSign,
            color: 'bg-yellow-600',
            suffix: ''
          },
        ].map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-white border border-stone-200 rounded-xl p-5">
              <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="text-2xl font-bold font-display text-stone-900">{stat.value}</div>
              <div className="text-xs text-stone-500 mt-1">{stat.label}</div>
            </div>
          )
        })}
      </div>

      {/* Alert menunggu konfirmasi */}
      {(data?.menunggu_konfirmasi ?? 0) > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 flex items-center gap-3 text-sm">
          <Clock className="w-4 h-4 text-yellow-600 flex-shrink-0" />
          <span className="text-yellow-800">
            Ada <strong>{data?.menunggu_konfirmasi}</strong> booking menunggu konfirmasi admin
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly chart */}
        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-orange-600" /> Booking 6 Hari Terakhir (Senin-Sabtu)
          </h3>
          <div className="flex items-end gap-2 h-36">
            {weeklyChart.map(({ tanggal, total }) => {
              const isToday = tanggal === today
              const d       = parseISO(tanggal + 'T12:00:00')
              const barH    = (total / maxWeekly) * 100
              return (
                <div key={tanggal} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-xs font-bold text-stone-600">{total > 0 ? total : ''}</div>
                  <div className="w-full flex flex-col justify-end" style={{ height: '90px' }}>
                    <div
                      className={`w-full rounded-t-md transition-all ${isToday ? 'bg-orange-500' : 'bg-stone-200'}`}
                      style={{ height: `${Math.max(barH, total > 0 ? 12 : 3)}%` }}
                    />
                  </div>
                  <div className="text-xs text-stone-400">{format(d, 'EEE', { locale: id })}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Total pendapatan */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 flex flex-col justify-between">
          <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-orange-600" /> Ringkasan Pendapatan
          </h3>
          <div className="space-y-4">
            <div className="bg-orange-50 rounded-xl p-4">
              <p className="text-xs text-stone-500 mb-1">Pendapatan Bulan Ini</p>
              <p className="text-2xl font-bold text-orange-600">{formatRupiah(data?.pendapatan_bulan ?? 0)}</p>
            </div>
            <div className="bg-stone-50 rounded-xl p-4">
              <p className="text-xs text-stone-500 mb-1">Total Pendapatan Keseluruhan</p>
              <p className="text-xl font-bold text-stone-800">{formatRupiah(data?.total_pendapatan ?? 0)}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              Hanya nota lunas yang dihitung
            </div>
          </div>
        </div>
      </div>

      {/* Jasa terpopuler */}
      <div className="bg-white border border-stone-200 rounded-xl p-5">
        <h3 className="font-semibold text-stone-900 mb-4">Jasa Servis Terpopuler</h3>
        {(data?.jasa_populer.length ?? 0) === 0 ? (
          <p className="text-stone-400 text-sm text-center py-4">Belum ada data jasa</p>
        ) : (
          <div className="space-y-3">
            {data?.jasa_populer.map(j => (
              <div key={j.nama_jasa} className="flex items-center gap-3">
                <div className="text-sm text-stone-600 w-40 flex-shrink-0 truncate">{j.nama_jasa}</div>
                <div className="flex-1 bg-stone-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all"
                    style={{ width: `${(j.total / maxJasa) * 100}%` }}
                  />
                </div>
                <div className="text-sm font-bold text-stone-700 w-8 text-right">{j.total}x</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking terbaru */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-stone-100">
          <h3 className="font-semibold text-stone-900">Booking Terbaru</h3>
        </div>
        <div className="divide-y divide-stone-50">
          {(data?.booking_terbaru.length ?? 0) === 0 ? (
            <div className="p-8 text-center text-stone-400 text-sm">Belum ada booking</div>
          ) : (
            data?.booking_terbaru.map(b => {
              const cfg = statusConfig[b.status_booking] ?? { label: b.status_booking, color: 'bg-stone-100 text-stone-500' }
              return (
                <div key={b.id_booking} className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-stone-900">{b.nama_pelanggan}</div>
                    <div className="text-xs text-stone-400 truncate">
                      {b.merk} {b.tahun} · {b.nomor_polisi}
                    </div>
                    <div className="text-xs text-stone-400 line-clamp-1 mt-0.5">{b.keluhan}</div>
                  </div>
                  <div className="text-xs text-stone-500 flex-shrink-0">
                    {format(parseISO(String(b.tanggal_booking).substring(0, 10) + 'T00:00:00'), 'dd MMM', { locale: id })}
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}