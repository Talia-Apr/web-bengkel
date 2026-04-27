'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Car, User, Phone, Mail, MapPin, Calendar,
  Clock, Wrench, Check, X, Building2, AlertTriangle
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import SearchableSelect, { SelectOption } from '@/components/ui/SearchableSelect'

interface BookingDetail {
  id_booking: number
  tanggal_booking: string
  waktu_booking: string
  keluhan: string
  status_booking: string
  created_at: string
  // Kendaraan
  id_kendaraan: number
  nomor_polisi: string
  merk: string
  tahun: number
  warna: string
  kilometer: number
  stnk: string
  no_mesin: string
  no_rangka: string
  // Pelanggan
  id_pelanggan: number
  nama_pelanggan: string
  email_pelanggan: string
  jenis_pelanggan: string
  no_telp: string
  alamat: string
  nama_perusahaan: string | null
  // Servis & Mekanik
  id_servis: number | null
  status_servis: string | null
  id_mekanik: number | null
  nama_mekanik: string | null
  spesialisasi: string | null
}

interface Mekanik {
  id_mekanik: number
  nama: string
  spesialisasi: string
  status: string
  jumlah_tugas: number
}

const statusConfig: Record<string, { label: string; color: string }> = {
  menunggu:     { label: 'Menunggu',     color: 'bg-yellow-100 text-yellow-800' },
  dikonfirmasi: { label: 'Dikonfirmasi', color: 'bg-blue-100 text-blue-800' },
  ditolak:      { label: 'Ditolak',      color: 'bg-red-100 text-red-800' },
  dibatalkan:   { label: 'Dibatalkan',   color: 'bg-stone-100 text-stone-500' },
  selesai:      { label: 'Selesai',      color: 'bg-green-100 text-green-800' },
}

const formatTanggal = (val: string) => {
  try {
    const date = val.includes('T') ? parseISO(val) : parseISO(val + 'T00:00:00')
    return format(date, 'EEEE, dd MMMM yyyy', { locale: localeId })
  } catch { return val }
}

export default function DetailBookingPage() {
  const { id } = useParams()
  const router  = useRouter()

  const [booking, setBooking]   = useState<BookingDetail | null>(null)
  const [mekaniks, setMekaniks] = useState<Mekanik[]>([])
  const [loading, setLoading]   = useState(true)
  const [success, setSuccess]   = useState('')
  const [acting, setActing]     = useState(false)

  // Assign mekanik
  const [selectedMekanik, setSelectedMekanik] = useState<string | number>('')
  const [showConfirm, setShowConfirm]         = useState<'tolak' | 'batalkan' | null>(null)

  const showSuccessMsg = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    const res  = await fetch(`/api/admin/booking/${id}`)
    const json = await res.json()
    if (json.success) {
      setBooking(json.data.booking)
      setMekaniks(json.data.mekaniks)
      if (json.data.booking.id_mekanik) {
        setSelectedMekanik(json.data.booking.id_mekanik)
      }
    }
    setLoading(false)
  }, [id])

  useEffect(() => { fetchDetail() }, [fetchDetail])

  const handleAction = async (action: string, id_mekanik?: number) => {
    setActing(true)
    const res  = await fetch(`/api/admin/booking/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, id_mekanik }),
    })
    const json = await res.json()
    setActing(false)
    if (!res.ok) { alert(json.error); return }
    showSuccessMsg(json.message)
    setShowConfirm(null)
    fetchDetail()
  }

  const handleAssign = () => {
    if (!selectedMekanik) return
    handleAction('assign', Number(selectedMekanik))
  }

  const mekanikOpts: SelectOption[] = mekaniks.map(m => ({
    value: m.id_mekanik,
    label: m.nama,
    sub: `${m.spesialisasi} · ${m.jumlah_tugas} tugas · ${m.status === 'aktif' ? 'Aktif' : 'Tidak Aktif'}`,
  }))

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-stone-400 text-sm">Memuat...</div>
  )

  if (!booking) return (
    <div className="text-center py-20 text-stone-400">
      <p>Booking tidak ditemukan</p>
      <button onClick={() => router.push('/admin/booking')}
        className="mt-3 text-orange-600 text-sm hover:underline">
        Kembali ke daftar booking
      </button>
    </div>
  )

  const cfg     = statusConfig[booking.status_booking] ?? { label: booking.status_booking, color: 'bg-stone-100 text-stone-500' }
  const isAktif = ['menunggu', 'dikonfirmasi'].includes(booking.status_booking)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
          <Check className="w-4 h-4 flex-shrink-0" /> {success}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/admin/booking')}
          className="p-2 border border-stone-300 rounded-xl hover:bg-stone-50 transition-colors">
          <ArrowLeft className="w-4 h-4 text-stone-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-xl font-bold text-stone-900">
              Detail Booking #{booking.id_booking}
            </h2>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
              {cfg.label}
            </span>
          </div>
          <p className="text-stone-500 text-sm mt-0.5">
            Dibuat {format(parseISO(String(booking.created_at).substring(0, 19)), 'dd MMM yyyy, HH:mm', { locale: localeId })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom kiri — Info + Aksi */}
        <div className="lg:col-span-2 space-y-4">

          {/* Info Pelanggan */}
          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-orange-500" /> Informasi Pelanggan
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center font-bold text-orange-700 flex-shrink-0">
                  {booking.nama_pelanggan.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-stone-900">{booking.nama_pelanggan}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    booking.jenis_pelanggan === 'perusahaan'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {booking.jenis_pelanggan === 'perusahaan'
                      ? <><Building2 className="w-3 h-3 inline mr-0.5" />{booking.nama_perusahaan}</>
                      : 'Individu'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="flex items-center gap-2 text-stone-600">
                  <Phone className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
                  <span>{booking.no_telp || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-stone-600">
                  <Mail className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
                  <span className="truncate">{booking.email_pelanggan}</span>
                </div>
                {booking.alamat && (
                  <div className="flex items-start gap-2 text-stone-600 sm:col-span-2">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 flex-shrink-0 mt-0.5" />
                    <span>{booking.alamat}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          
          {/* Info Kendaraan */}
          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2">
              <Car className="w-4 h-4 text-orange-500" /> Informasi Kendaraan
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-stone-400 text-xs mb-0.5">Merk </p>
                <p className="font-medium text-stone-800">{booking.merk}</p>
              </div>
              <div>
                <p className="text-stone-400 text-xs mb-0.5">Tahun</p>
                <p className="font-medium text-stone-800">{booking.tahun}</p>
              </div>
              <div>
                <p className="text-stone-400 text-xs mb-0.5">Nomor Polisi</p>
                <p className="font-mono font-bold text-stone-800">{booking.nomor_polisi}</p>
              </div>
              <div>
                <p className="text-stone-400 text-xs mb-0.5">Warna</p>
                <p className="font-medium text-stone-800">{booking.warna || '-'}</p>
              </div>
              <div>
                <p className="text-stone-400 text-xs mb-0.5">Kilometer</p>
                <p className="font-medium text-stone-800">
                  {booking.kilometer ? booking.kilometer.toLocaleString('id-ID') + ' km' : '-'}
                </p>
              </div>
              <div>
                <p className="text-stone-400 text-xs mb-0.5">STNK</p>
                <p className="font-medium text-stone-800 capitalize">{booking.stnk}</p>
              </div>
              {booking.no_mesin && (
                <div>
                  <p className="text-stone-400 text-xs mb-0.5">No. Mesin</p>
                  <p className="font-mono text-stone-700 text-xs">{booking.no_mesin}</p>
                </div>
              )}
              {booking.no_rangka && (
                <div>
                  <p className="text-stone-400 text-xs mb-0.5">No. Rangka</p>
                  <p className="font-mono text-stone-700 text-xs">{booking.no_rangka}</p>
                </div>
              )}
            </div>
          </div>

          {/* Info Booking */}
          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-500" /> Informasi Booking
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-stone-400 text-xs mb-0.5">Tanggal</p>
                <p className="font-medium text-stone-800">{formatTanggal(booking.tanggal_booking)}</p>
              </div>
              <div>
                <p className="text-stone-400 text-xs mb-0.5">Jam</p>
                <p className="font-medium text-stone-800 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                  {String(booking.waktu_booking).slice(0, 5)} WIB
                </p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-stone-400 text-xs mb-1">Keluhan / Deskripsi</p>
              <p className="text-stone-700 text-sm bg-stone-50 rounded-lg px-3 py-2.5 leading-relaxed">
                {booking.keluhan}
              </p>
            </div>
          </div>
          
        </div>

        {/* Kolom kanan — Mekanik + Aksi */}
        <div className="space-y-4">

          {/* Status Mekanik */}
          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-orange-500" /> Mekanik
            </h3>
            {booking.nama_mekanik ? (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
                <p className="font-semibold text-stone-900 text-sm">{booking.nama_mekanik}</p>
                <p className="text-xs text-stone-500 mt-0.5">{booking.spesialisasi}</p>
              </div>
            ) : (
              <div className="bg-stone-50 rounded-xl p-3 mb-4 text-center text-stone-400 text-xs">
                Belum ada mekanik ditugaskan
              </div>
            )}

            {/* Form assign — hanya saat menunggu atau dikonfirmasi */}
            {isAktif && (
              <div className="space-y-3">
                <SearchableSelect
                  options={mekanikOpts}
                  value={selectedMekanik}
                  onChange={setSelectedMekanik}
                  placeholder="-- Pilih Mekanik --"
                  disabled={acting}
                />
                <button
                  onClick={handleAssign}
                  disabled={!selectedMekanik || acting}
                  className="w-full py-2.5 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {booking.nama_mekanik ? 'Ganti & Konfirmasi' : 'Tugaskan & Konfirmasi'}
                </button>
              </div>
            )}
          </div>

          {/* Aksi lain */}
          {isAktif && (
            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <h3 className="font-semibold text-stone-800 mb-3">Aksi Lain</h3>
              <div className="space-y-2">
                {booking.status_booking === 'menunggu' && (
                  <button
                    onClick={() => setShowConfirm('tolak')}
                    disabled={acting}
                    className="w-full py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" /> Tolak Booking
                  </button>
                )}
                {booking.status_booking === 'dikonfirmasi' && (
                  <button
                    onClick={() => setShowConfirm('batalkan')}
                    disabled={acting}
                    className="w-full py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" /> Batalkan Booking
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Info status servis */}
          {booking.status_servis && (
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs text-stone-500">
              <p className="font-medium text-stone-700 mb-1">Status Servis</p>
              <p className="capitalize">{booking.status_servis.replace(/_/g, ' ')}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal Konfirmasi Tolak / Batalkan ── */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="font-semibold text-stone-900 text-center mb-1">
              {showConfirm === 'tolak' ? 'Tolak Booking?' : 'Batalkan Booking?'}
            </h3>
            <p className="text-stone-500 text-sm text-center mb-6">
              {showConfirm === 'tolak'
                ? 'Booking ini akan ditolak dan pelanggan akan diberitahu.'
                : 'Booking yang sudah dikonfirmasi akan dibatalkan.'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(null)}
                className="flex-1 py-2.5 border border-stone-300 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50">
                Kembali
              </button>
              <button
                onClick={() => handleAction(showConfirm)}
                disabled={acting}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-60"
              >
                {acting ? 'Memproses...' : showConfirm === 'tolak' ? 'Ya, Tolak' : 'Ya, Batalkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}