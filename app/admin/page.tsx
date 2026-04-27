'use client'

import { useEffect, useState } from 'react'
import { Car, Wrench, CheckCircle, Clock, TrendingUp, Users, Calendar, ArrowRight, Receipt } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

interface Stats {
  total_booking_hari_ini: number
  booking_menunggu: number
  servis_berjalan: number
  selesai_hari_ini: number
  nota_belum_lunas: number
}

interface BookingRow {
  id_booking: number
  tanggal_booking: string
  waktu_booking: string
  keluhan: string
  status_booking: string
  nomor_polisi: string
  merk: string
  tahun: number
  nama_pelanggan: string
  info_kendaraan: string
}

interface MekanikRow {
  id_mekanik: number
  nama: string
  spesialisasi: string
  status: string
}

const statusColors: Record<string, string> = {
  menunggu:      'bg-yellow-100 text-yellow-800',
  dikonfirmasi:  'bg-blue-100 text-blue-800',
  dalam_pengerjaan: 'bg-orange-100 text-orange-800',
  selesai:       'bg-green-100 text-green-800',
  ditolak:       'bg-red-100 text-red-800',
  dibatalkan:    'bg-stone-100 text-stone-600',
}

const statusLabels: Record<string, string> = {
  menunggu:         'Menunggu',
  dikonfirmasi:     'Dikonfirmasi',
  dalam_pengerjaan: 'Dikerjakan',
  selesai:          'Selesai',
  ditolak:          'Ditolak',
  dibatalkan:       'Dibatalkan',
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [mekaniks, setMekaniks] = useState<MekanikRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setStats(json.data.stats)
          setBookings(json.data.bookings)
          setMekaniks(json.data.mekaniks)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const statCards = [
    {
      label: 'Booking Hari Ini',
      value: stats?.total_booking_hari_ini ?? 0,
      icon: Calendar,
      color: 'bg-blue-500',
      sub: 'kendaraan masuk'
    },
    {
      label: 'Sedang Dikerjakan',
      value: stats?.servis_berjalan ?? 0,
      icon: Wrench,
      color: 'bg-orange-500',
      sub: 'kendaraan aktif'
    },
    {
      label: 'Menunggu Konfirmasi',
      value: stats?.booking_menunggu ?? 0,
      icon: Clock,
      color: 'bg-yellow-500',
      sub: 'perlu ditindak'
    },
    {
      label: 'Selesai Hari Ini',
      value: stats?.selesai_hari_ini ?? 0,
      icon: CheckCircle,
      color: 'bg-green-500',
      sub: 'kendaraan selesai'
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-stone-900 to-stone-800 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-full opacity-5">
          <div className="w-64 h-64 border-8 border-white rounded-full absolute -right-20 -top-20" />
          <div className="w-40 h-40 border-4 border-white rounded-full absolute right-10 top-16" />
        </div>
        <div className="relative">
          <p className="text-stone-400 text-sm">Selamat datang,</p>
          <h2 className="font-display text-2xl font-bold mt-1">Dashboard Operasional</h2>
          <p className="text-stone-300 text-sm mt-2">
            {format(new Date(), "EEEE, dd MMMM yyyy", { locale: id })}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-white rounded-xl border border-stone-200 p-5">
              <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="text-3xl font-bold font-display text-stone-900">
                {loading ? '...' : stat.value}
              </div>
              <div className="text-sm font-medium text-stone-700 mt-0.5">{stat.label}</div>
              <div className="text-xs text-stone-400 mt-1">{stat.sub}</div>
            </div>
          )
        })}
      </div>

      {/* Nota belum lunas alert */}
      {!loading && stats && stats.nota_belum_lunas > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Receipt className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <p className="text-yellow-800 text-sm">
              Terdapat <strong>{stats.nota_belum_lunas} nota</strong> yang belum lunas.
            </p>
          </div>
          <Link href="/admin/nota" className="text-yellow-700 text-sm font-semibold hover:underline flex-shrink-0">
            Lihat →
          </Link>
        </div>
      )}

      {/* Tabel booking + status mekanik */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Booking hari ini */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200">
          <div className="p-5 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-semibold text-stone-900">Booking Hari Ini</h3>
            <Link href="/admin/booking" className="text-orange-600 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
              Lihat semua <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-stone-50">
            {loading ? (
              <div className="p-8 text-center text-stone-400 text-sm">Memuat data...</div>
            ) : bookings.length === 0 ? (
              <div className="p-8 text-center text-stone-400">
                <Car className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Belum ada booking hari ini</p>
              </div>
            ) : (
              bookings.slice(0, 5).map(b => (
                <div key={b.id_booking} className="p-4 flex items-center gap-4 hover:bg-stone-50">
                  <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Car className="w-5 h-5 text-stone-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-stone-900 text-sm truncate">{b.nama_pelanggan}</div>
                    <div className="text-xs text-stone-500">{b.info_kendaraan} • {b.nomor_polisi}</div>
                    <div className="text-xs text-stone-400">{b.waktu_booking?.slice(0, 5)} • {b.keluhan?.slice(0, 40)}{b.keluhan?.length > 40 ? '...' : ''}</div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${statusColors[b.status_booking] ?? 'bg-stone-100 text-stone-600'}`}>
                    {statusLabels[b.status_booking] ?? b.status_booking}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Status mekanik */}
        <div className="bg-white rounded-xl border border-stone-200">
          <div className="p-5 border-b border-stone-100">
            <h3 className="font-semibold text-stone-900">Status Mekanik</h3>
          </div>
          <div className="p-4 space-y-3">
            {loading ? (
              <p className="text-sm text-stone-400 text-center py-4">Memuat...</p>
            ) : mekaniks.length === 0 ? (
              <p className="text-sm text-stone-400 text-center py-4">Belum ada mekanik</p>
            ) : (
              mekaniks.map(m => (
                <div key={m.id_mekanik} className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center font-bold text-orange-700 text-sm flex-shrink-0">
                    {m.nama.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-stone-900 truncate">{m.nama}</div>
                    <div className="text-xs text-stone-400">{m.spesialisasi}</div>
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${
                    m.status === 'aktif'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-stone-100 text-stone-500'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      m.status === 'aktif' ? 'bg-green-500' : 'bg-stone-400'
                    }`} />
                    {m.status === 'aktif' ? 'Aktif' : 'Tidak Aktif'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="font-semibold text-stone-700 text-sm mb-3">Aksi Cepat</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Kelola Booking',   href: '/admin/booking',   icon: Calendar,   color: 'text-orange-600' },
            { label: 'Kelola Jasa Servis',    href: '/admin/jasa-servis',    icon: Wrench,     color: 'text-blue-600' },
            { label: 'Kelola Sparepart',   href: '/admin/sparepart', icon: TrendingUp, color: 'text-green-600' },
            { label: 'Kelola Pelanggan',   href: '/admin/pelanggan', icon: Users,      color: 'text-purple-600' },
          ].map(action => {
            const Icon = action.icon
            return (
              <Link key={action.href} href={action.href}
                className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col items-center gap-2 hover:border-orange-300 hover:bg-orange-50 transition-all text-center">
                <Icon className={`w-6 h-6 ${action.color}`} />
                <span className="text-sm font-medium text-stone-700">{action.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
