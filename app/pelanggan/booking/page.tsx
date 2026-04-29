'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Car,
  CheckCircle,
  AlertTriangle,
  Plus,
  ArrowLeft,
  Check,
  Search,
  Wrench,
  X,
  ChevronDown,
  Clock,
  CalendarDays,
} from 'lucide-react'
import { format, addDays, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'

interface Kendaraan {
  id_kendaraan: number
  nomor_polisi: string
  merk: string
  tahun: number
  warna: string
  stnk: string
}

interface JasaServis {
  id_jasa: number
  kode_jasa: string
  nama_jasa: string
  keterangan: string
  harga_jasa: number
}

interface BookingAktif {
  id_booking: number
  id_kendaraan: number
  tanggal_booking: string
  waktu_booking: string
  keluhan: string
  status_booking: string
  nomor_polisi: string
  merk: string
  tahun: number
  nama_mekanik: string | null
}

interface SlotInfo {
  waktu: string
  tersedia: boolean
  total: number
  terpakai: number
  sisa: number
}

const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00']
const emptyKendaraanForm = {
  nomor_polisi: '',
  merk: '',
  tahun: '' as unknown as number,
  warna: '',
  kilometer: '' as unknown as number,
  stnk: 'ada',
  no_mesin: '',
  no_rangka: '',
}

const statusConfig: Record<string, { label: string; color: string }> = {
  menunggu: { label: 'Menunggu Konfirmasi', color: 'bg-yellow-100 text-yellow-800' },
  dikonfirmasi: { label: 'Dikonfirmasi', color: 'bg-blue-100 text-blue-800' },
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(n)

const formatTanggal = (val: string) => {
  try {
    const d = val.includes('T') ? parseISO(val) : parseISO(val + 'T00:00:00')
    return format(d, 'EEEE, dd MMMM yyyy', { locale: id })
  } catch {
    return val
  }
}

export default function PelangganBookingPage() {
  const [activeTab, setActiveTab] = useState<'aktif' | 'booking'>('aktif')
  const [step, setStep] = useState(1)
  const [kendaraanList, setKendaraanList] = useState<Kendaraan[]>([])
  const [jasaList, setJasaList] = useState<JasaServis[]>([])
  const [bookingAktif, setBookingAktif] = useState<BookingAktif[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [loadingAktif, setLoadingAktif] = useState(true)
  const [selectedKendaraan, setSelectedKendaraan] = useState<Kendaraan | null>(null)
  const [selectedJasa, setSelectedJasa] = useState<JasaServis[]>([])
  const [searchJasa, setSearchJasa] = useState('')
  const [searchAktif, setSearchAktif] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showTambah, setShowTambah] = useState(false)
  const [kendaraanForm, setKendaraanForm] = useState(emptyKendaraanForm)
  const [savingKendaraan, setSavingKendaraan] = useState(false)
  const [errorKendaraan, setErrorKendaraan] = useState('')
  const [batalModal, setBatalModal] = useState<BookingAktif | null>(null)
  const [memBatal, setMemBatal] = useState(false)
  const [keluhan, setKeluhan] = useState('')
  const [tanggal, setTanggal] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'))
  const [waktu, setWaktu] = useState('08:00')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [idBooking, setIdBooking] = useState<number | null>(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [slots, setSlots] = useState<SlotInfo[]>([])
  const [loadingSlot, setLoadingSlot] = useState(false)
  const [kilometer, setKilometer] = useState('')
  const [tanggalDipilih, setTanggalDipilih] = useState(false)
  const [tanggalPenuh, setTanggalPenuh] = useState<string[]>([])
  const [_loadingTanggal, setLoadingTanggal] = useState(false)
  const [jadwalTutup, setJadwalTutup] = useState<string[]>([])
  const [bookingPerHari, setBookingPerHari] = useState<any[]>([])
  const [kuotaPerHari, setKuotaPerHari] = useState(7)

  const fetchKendaraan = async () => {
    const r = await fetch('/api/pelanggan/booking')
    const j = await r.json()
    if (j.success) setKendaraanList(j.data.kendaraan)
  }

  const fetchJasa = async () => {
    const r = await fetch('/api/admin/jasa-servis')
    const j = await r.json()
    if (j.success) setJasaList(j.data)
  }

  const fetchJadwalBulan = async () => {
    const bulanStr = format(new Date(), 'yyyy-MM')
    const res  = await fetch(`/api/admin/operasional?bulan=${bulanStr}`)
    const json = await res.json()

    if (json.success) {
      // tanggal tutup
      const tutup = json.data.jadwal
        .filter((j: any) => j.status === 'tutup')
        .map((j: any) => String(j.tanggal).substring(0, 10))

      setJadwalTutup(tutup)

      setBookingPerHari(json.data.bookingPerHari)
      setKuotaPerHari(json.data.kuotaPerHari)
    }
  }

  const bookingMap = useMemo(() => {
    const map: Record<string, number> = {}
    bookingPerHari.forEach((b: any) => {
      map[String(b.tanggal_booking).substring(0, 10)] = b.jumlah_booking
    })
    return map
  }, [bookingPerHari])

  const checkIsFull = (tgl: string): boolean => {
    return (bookingMap[tgl] ?? 0) >= kuotaPerHari
  }

  const fetchAktif = useCallback(async () => {
    setLoadingAktif(true)
    const p = new URLSearchParams()
    if (searchAktif) p.set('search', searchAktif)
    if (filterStatus) p.set('status', filterStatus)

    const r = await fetch(`/api/pelanggan/booking-aktif?${p}`)
    const j = await r.json()
    if (j.success) setBookingAktif(j.data)
    setLoadingAktif(false)
  }, [searchAktif, filterStatus])

  useEffect(() => {
    Promise.all([fetchKendaraan(), fetchJasa()]).finally(() => setLoadingData(false))
  }, [])

  useEffect(() => {
    fetchAktif()
  }, [fetchAktif])

  useEffect(() => {
    if (selectedKendaraan && kendaraanTerbooking(selectedKendaraan.id_kendaraan)) {
      setError('Kendaraan ini sudah memiliki booking aktif')
    } else {
      setError('')
    }
  }, [selectedKendaraan, bookingAktif])

  useEffect(() => {
    if (step === 4) {
      setTanggalDipilih(false)
    }
  }, [step])

  useEffect(() => {
    if (step === 4) fetchJadwalBulan()
  }, [step])

  const upcomingDates = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i + 1))
    .filter(d => d.getDay() !== 0)
    .slice(0, 7)
    .map(d => format(d, 'yyyy-MM-dd'))

  const filteredJasa = jasaList.filter(
    j =>
      !searchJasa ||
      j.nama_jasa.toLowerCase().includes(searchJasa.toLowerCase()) ||
      j.kode_jasa.toLowerCase().includes(searchJasa.toLowerCase())
  )

  const isTanggalTutup = (tgl: string): boolean => {
    const d = parseISO(tgl + 'T00:00:00')
    if (d.getDay() === 0) return true // Minggu selalu tutup
    return jadwalTutup.includes(tgl)
  }

  const totalEstimasi = selectedJasa.reduce((s, j) => s + j.harga_jasa, 0)

  const toggleJasa = (jasa: JasaServis) =>
    setSelectedJasa(prev =>
      prev.find(j => j.id_jasa === jasa.id_jasa)
        ? prev.filter(j => j.id_jasa !== jasa.id_jasa)
        : [...prev, jasa]
    )

  const kendaraanTerbooking = (id_kendaraan: number) =>
  bookingAktif.some(
    b =>
      b.id_kendaraan === id_kendaraan &&
      ['menunggu', 'dikonfirmasi'].includes(b.status_booking)
  )

  const fetchTanggalPenuh = async () => {
    setLoadingTanggal(true)

    const query = upcomingDates.join(',')

    const r = await fetch(`/api/pelanggan/booking/tanggal-full?tanggal=${query}`)
    const j = await r.json()

    if (j.success) {
      const penuh = j.data
        .filter((d: any) => d.penuh)
        .map((d: any) => d.tanggal)

      setTanggalPenuh(penuh)
    }

    setLoadingTanggal(false)
  }

  useEffect(() => {
    if (step === 4) {
      fetchTanggalPenuh()
    }
  }, [step])

  const handleTambahKendaraan = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorKendaraan('')
    setSavingKendaraan(true)

    const r = await fetch('/api/pelanggan/kendaraan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(kendaraanForm),
    })

    const j = await r.json()
    if (!r.ok) {
      setErrorKendaraan(j.error ?? 'Gagal')
      setSavingKendaraan(false)
      return
    }

    await fetchKendaraan()
    const r2 = await fetch('/api/pelanggan/booking')
    const j2 = await r2.json()
    if (j2.success) {
      setKendaraanList(j2.data.kendaraan)
      const baru = j2.data.kendaraan.find((k: Kendaraan) => k.nomor_polisi === kendaraanForm.nomor_polisi)
      if (baru) setSelectedKendaraan(baru)
    }

    setShowTambah(false)
    setKendaraanForm(emptyKendaraanForm)
    setSavingKendaraan(false)
  }

  const fetchSlot = useCallback(async (tgl: string) => {
    setLoadingSlot(true)
    const r = await fetch(`/api/pelanggan/booking/slot?tanggal=${tgl}`)
    const j = await r.json()

    if (j.success) {
      setSlots(j.data)
      const slotDipilih = j.data.find((s: SlotInfo) => s.waktu === waktu)
      if (slotDipilih && !slotDipilih.tersedia) {
        const pertamaTersedia = j.data.find((s: SlotInfo) => s.tersedia)
        if (pertamaTersedia) setWaktu(pertamaTersedia.waktu)
      }
    }

    setLoadingSlot(false)
  }, [waktu])

  useEffect(() => {
    if (activeTab === 'booking' && step === 4) fetchSlot(tanggal)
  }, [tanggal, step, activeTab, fetchSlot])

  const handleSubmit = async () => {
    setError('')
    if (!selectedKendaraan) {
      setError('Pilih kendaraan')
      return
    }
    if (kendaraanTerbooking(selectedKendaraan.id_kendaraan)) {
      setError('Kendaraan ini sudah punya booking aktif')
      return
    }
    if (selectedJasa.length === 0) {
      setError('Pilih minimal satu jasa servis')
      return
    }
    if (!kilometer.trim()) {
      setError('Kilometer wajib diisi')
      return
    }
    if (!keluhan.trim()) {
      setError('Isi keluhan')
      return
    }

    setSaving(true)

    const keluhanFull = `[Jasa: ${selectedJasa.map(j => j.nama_jasa).join(', ')}] ${keluhan}`

    const r = await fetch('/api/pelanggan/booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_kendaraan: selectedKendaraan.id_kendaraan,
        keluhan: keluhanFull,
        tanggal_booking: tanggal,
        waktu_booking: waktu,
        kilometer: Number(kilometer),
      }),
    })

    const j = await r.json()
    if (!r.ok) {
      setError(j.error ?? 'Gagal')
      setSaving(false)
      return
    }

    setIdBooking(j.id_booking)
    setSuccess(true)
    setSaving(false)
    fetchAktif()
  }

  const handleBatal = async () => {
    if (!batalModal) return
    setMemBatal(true)

    const r = await fetch(`/api/pelanggan/booking/${batalModal.id_booking}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'batal' }),
    })

    const j = await r.json()
    if (!r.ok) {
      alert(j.error)
      setMemBatal(false)
      return
    }

    setBatalModal(null)
    setMemBatal(false)
    setSuccessMsg('Booking berhasil dibatalkan')
    setTimeout(() => setSuccessMsg(''), 3000)
    fetchAktif()
  }

  const resetForm = () => {
    setStep(1)
    setSelectedKendaraan(null)
    setSelectedJasa([])
    setSearchJasa('')
    setKeluhan('')
    setTanggal(format(addDays(new Date(), 1), 'yyyy-MM-dd'))
    setWaktu('08:00')
    setKilometer('')
    setError('')
    setSuccess(false)
    setIdBooking(null)
    setActiveTab('aktif')
  }

  const STEPS = [
    { n: 1, label: 'Kendaraan' },
    { n: 2, label: 'Jasa Servis' },
    { n: 3, label: 'Keluhan' },
    { n: 4, label: 'Jadwal' },
  ]

  const currentSlot = slots.length > 0
    ? slots
    : TIME_SLOTS.map(t => ({ waktu: t, tersedia: true, total: 1, terpakai: 0, sisa: 1 }))

  const semuaPenuh = slots.length > 0 && slots.every(s => !s.tersedia)

  if (success && idBooking)
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="font-display text-2xl font-bold text-stone-900 mb-2">Booking Berhasil!</h3>
          <p className="text-stone-500 mb-6">Booking Anda telah diterima dan menunggu konfirmasi bengkel.</p>
          <div className="bg-stone-50 rounded-xl p-5 text-left space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">No. Booking</span>
              <span className="font-mono font-bold">#{idBooking}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Kendaraan</span>
              <span className="font-medium">
                {selectedKendaraan?.merk} {selectedKendaraan?.tahun} · {selectedKendaraan?.nomor_polisi}
              </span>
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-stone-500">Jasa Servis</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedJasa.map(j => (
                  <span key={j.id_jasa} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                    {j.nama_jasa}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Estimasi Biaya</span>
              <span className="font-semibold text-orange-600">{formatRupiah(totalEstimasi)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Tanggal</span>
              <span className="font-medium">{formatTanggal(tanggal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Jam</span>
              <span className="font-medium">{waktu} WIB</span>
            </div>
          </div>
          <button onClick={resetForm} className="w-full bg-orange-600 text-white py-3 rounded-xl font-medium hover:bg-orange-700">
            Kembali ke Booking
          </button>
        </div>
      </div>
    )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-stone-900">Booking Servis</h2>
        <p className="text-stone-500 text-sm mt-1">Jadwalkan dan pantau booking servis Anda</p>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" /> {successMsg}
        </div>
      )}

      <div className="flex bg-stone-800 rounded-xl p-1 gap-1">
        <button
          onClick={() => setActiveTab('booking')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'booking' ? 'bg-orange-600 text-white shadow-sm' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Booking Baru
        </button>
        <button
          onClick={() => setActiveTab('aktif')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'aktif' ? 'bg-orange-600 text-white shadow-sm' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Booking Aktif {bookingAktif.length > 0 && (
            <span className="ml-2 bg-white text-orange-600 text-xs px-1.5 py-0.5 rounded-full font-bold">
              {bookingAktif.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'aktif' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                value={searchAktif}
                onChange={e => setSearchAktif(e.target.value)}
                placeholder="Cari plat nomor atau merk..."
                className="w-full pl-9 pr-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="relative">
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="appearance-none pl-4 pr-9 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-stone-700"
              >
                <option value="">Semua</option>
                <option value="menunggu">Menunggu</option>
                <option value="dikonfirmasi">Dikonfirmasi</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
            </div>
          </div>

          {loadingAktif ? (
            <div className="text-center py-10 text-stone-400 text-sm">Memuat...</div>
          ) : bookingAktif.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-xl p-10 text-center text-stone-400">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Tidak ada booking aktif</p>
              <button
                onClick={() => setActiveTab('booking')}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700"
              >
                <Plus className="w-4 h-4" /> Booking Sekarang
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {bookingAktif.map(b => {
                const cfg = statusConfig[b.status_booking] ?? {
                  label: b.status_booking,
                  color: 'bg-stone-100 text-stone-500',
                }
                return (
                  <div key={b.id_booking} className="bg-white border border-stone-200 rounded-xl p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Car className="w-5 h-5 text-stone-500" />
                        </div>
                        <div>
                          <div className="font-semibold text-stone-900">
                            {b.merk} {b.tahun}
                          </div>
                          <div className="text-xs text-stone-400">{b.nomor_polisi}</div>
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <div className="text-stone-400 text-xs">Tanggal</div>
                        <div className="font-medium mt-0.5 text-sm">{formatTanggal(b.tanggal_booking)}</div>
                      </div>
                      <div>
                        <div className="text-stone-400 text-xs">Jam</div>
                        <div className="font-medium mt-0.5">{b.waktu_booking?.slice(0, 5)} WIB</div>
                      </div>
                      {b.nama_mekanik && (
                        <div className="col-span-2">
                          <div className="text-stone-400 text-xs">Mekanik</div>
                          <div className="font-medium mt-0.5">{b.nama_mekanik}</div>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-stone-500 bg-stone-50 rounded-lg px-3 py-2 mb-3 line-clamp-2">
                      {b.keluhan}
                    </div>
                    {b.status_booking === 'menunggu' && (
                      <button
                        onClick={() => setBatalModal(b)}
                        className="w-full py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                      >
                        Batalkan Booking
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'booking' && (
        <div className="space-y-5">
          <div className="flex items-center">
            {STEPS.map((s, i) => (
              <div key={s.n} className={`flex items-center ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                      step === s.n
                        ? 'bg-orange-600 text-white'
                        : step > s.n
                          ? 'bg-green-500 text-white'
                          : 'bg-stone-200 text-stone-500'
                    }`}
                  >
                    {step > s.n ? <Check className="w-3.5 h-3.5" /> : s.n}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${step === s.n ? 'text-orange-600' : 'text-stone-400'}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 transition-colors ${step > s.n ? 'bg-orange-500' : 'bg-stone-200'}`} />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-white border border-stone-200 rounded-xl p-5">
                <h3 className="font-semibold text-stone-800 mb-3">Pilih Kendaraan</h3>

                {loadingData ? (
                  <p className="text-stone-400 text-sm text-center py-4">Memuat...</p>
                ) : kendaraanList.length === 0 && !showTambah ? (
                  <div className="text-center py-6 text-stone-400">
                    <Car className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm mb-3">Belum ada kendaraan terdaftar</p>
                    <button
                      onClick={() => setShowTambah(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700"
                    >
                      <Plus className="w-4 h-4" /> Tambah Kendaraan
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {kendaraanList.map(k => {
                      const isBooked = loadingAktif
                      ? true
                      : kendaraanTerbooking(k.id_kendaraan)
                      const isSelected = selectedKendaraan?.id_kendaraan === k.id_kendaraan

                      return (
                        <button
                          key={k.id_kendaraan}
                          type="button"
                          disabled={isBooked}
                          onClick={() => !isBooked && setSelectedKendaraan(k)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                            isBooked
                              ? 'border-stone-200 bg-stone-50 text-stone-300 cursor-not-allowed'
                              : isSelected
                                ? 'border-orange-500 bg-orange-50'
                                : 'border-stone-200 hover:border-stone-300'
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isBooked
                                ? 'bg-stone-100'
                                : isSelected
                                  ? 'bg-orange-500'
                                  : 'bg-stone-100'
                            }`}
                          >
                            <Car
                              className={`w-5 h-5 ${
                                isBooked
                                  ? 'text-stone-300'
                                  : isSelected
                                    ? 'text-white'
                                    : 'text-stone-500'
                              }`}
                            />
                          </div>

                          <div className="flex-1">
                            <div className="font-medium text-stone-900">
                              {k.merk} {k.tahun}
                            </div>
                            <div className="text-xs text-stone-400">
                              {k.nomor_polisi} · {k.warna}
                            </div>
                          </div>

                          {isBooked ? (
                            <span className="text-xs text-red-500 font-medium">Kendaraan memiliki jadwal servis </span>
                          ) : isSelected ? (
                            <Check className="w-5 h-5 text-orange-600 flex-shrink-0" />
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                )}

                {kendaraanList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowTambah(!showTambah)}
                    className="mt-3 w-full flex items-center gap-2 px-4 py-3 border border-dashed border-stone-300 rounded-xl text-stone-500 hover:border-orange-400 hover:text-orange-600 transition-colors text-sm"
                  >
                    {showTambah ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {showTambah ? 'Batal' : 'Tambah kendaraan baru'}
                  </button>
                )}

                {showTambah && (
                  <form onSubmit={handleTambahKendaraan} className="mt-3 border border-stone-200 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-medium text-stone-700">Data Kendaraan Baru</p>
                    {errorKendaraan && (
                      <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-lg">
                        {errorKendaraan}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <input
                          required
                          value={kendaraanForm.nomor_polisi}
                          onChange={e => setKendaraanForm(f => ({ ...f, nomor_polisi: e.target.value.toUpperCase() }))}
                          placeholder="Nomor polisi *"
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                        />
                      </div>
                      <input
                        required
                        value={kendaraanForm.merk}
                        onChange={e => setKendaraanForm(f => ({ ...f, merk: e.target.value }))}
                        placeholder="Merk *"
                        className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <input
                        required
                        type="number"
                        value={kendaraanForm.tahun || ''}
                        onChange={e => setKendaraanForm(f => ({ ...f, tahun: Number(e.target.value) }))}
                        placeholder="Tahun *"
                        min={1990}
                        max={new Date().getFullYear() + 1}
                        className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <input
                        value={kendaraanForm.warna}
                        onChange={e => setKendaraanForm(f => ({ ...f, warna: e.target.value }))}
                        placeholder="Warna"
                        className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <input
                        type="number"
                        value={kendaraanForm.kilometer || ''}
                        onChange={e => setKendaraanForm(f => ({ ...f, kilometer: Number(e.target.value) }))}
                        placeholder="Kilometer"
                        min={0}
                        className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <input
                        value={kendaraanForm.no_mesin}
                        onChange={e => setKendaraanForm(f => ({ ...f, no_mesin: e.target.value }))}
                        placeholder="No. mesin"
                        className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                      />
                      <input
                        value={kendaraanForm.no_rangka}
                        onChange={e => setKendaraanForm(f => ({ ...f, no_rangka: e.target.value }))}
                        placeholder="No. rangka"
                        className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                      />
                      <div className="col-span-2">
                        <p className="text-xs font-medium text-stone-600 mb-1.5">STNK</p>
                        <div className="flex gap-2">
                          {[
                            { val: 'ada', label: 'Ada' },
                            { val: 'tidak', label: 'Tidak Ada' },
                          ].map(opt => (
                            <button
                              key={opt.val}
                              type="button"
                              onClick={() => setKendaraanForm(f => ({ ...f, stnk: opt.val }))}
                              className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                                kendaraanForm.stnk === opt.val
                                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                                  : 'border-stone-300 text-stone-600'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={savingKendaraan}
                      className="w-full py-2.5 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-60"
                    >
                      {savingKendaraan ? 'Menyimpan...' : 'Tambah Kendaraan'}
                    </button>
                  </form>
                )}
              </div>

              <button
                onClick={() => {
                  if (loadingAktif) {
                    setError('Data booking sedang dimuat...')
                    return
                  }

                  if (!selectedKendaraan) {
                    setError('Pilih kendaraan terlebih dahulu')
                    return
                  }

                  if (kendaraanTerbooking(selectedKendaraan.id_kendaraan)) {
                    setError('Kendaraan ini sudah memiliki booking aktif')
                    return
                  }

                  setError('')
                  setStep(2)
                }}
                className="w-full bg-stone-900 text-white py-3.5 rounded-xl font-medium hover:bg-stone-800"
              >
                Lanjutkan →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
                <Car className="w-5 h-5 text-orange-600 flex-shrink-0" />
                <div>
                  <div className="font-medium text-stone-900 text-sm">
                    {selectedKendaraan?.merk} {selectedKendaraan?.tahun}
                  </div>
                  <div className="text-xs text-stone-500">{selectedKendaraan?.nomor_polisi}</div>
                </div>
              </div>

              <div className="bg-white border border-stone-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-stone-800">Pilih Jasa Servis</h3>
                  <span className="text-xs text-stone-400">Bisa pilih lebih dari satu</span>
                </div>

                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    value={searchJasa}
                    onChange={e => setSearchJasa(e.target.value)}
                    placeholder="Cari jasa servis..."
                    className="w-full pl-9 pr-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {filteredJasa.length === 0 ? (
                    <div className="text-center py-6 text-stone-400">
                      <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Tidak ditemukan</p>
                    </div>
                  ) : (
                    filteredJasa.map(j => {
                      const isSel = selectedJasa.some(s => s.id_jasa === j.id_jasa)

                      return (
                        <button
                          key={j.id_jasa}
                          type="button"
                          onClick={() => toggleJasa(j)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                            isSel ? 'border-orange-500 bg-orange-50' : 'border-stone-200 hover:border-stone-300'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              isSel ? 'border-orange-500 bg-orange-500' : 'border-stone-300'
                            }`}
                          >
                            {isSel && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-stone-900 text-sm">
                              {j.nama_jasa}
                            </div>

                            {j.keterangan && (
                              <div className="text-xs text-stone-500 mt-0.5 line-clamp-2">
                                {j.keterangan}
                              </div>
                            )}

                            <div className="text-xs text-stone-400 mt-1">
                              {j.kode_jasa}
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-stone-700 flex-shrink-0">
                            {formatRupiah(j.harga_jasa)}
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>

                {selectedJasa.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-stone-100">
                    <p className="text-xs text-stone-500 mb-2">Terpilih ({selectedJasa.length}):</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedJasa.map(j => (
                        <span
                          key={j.id_jasa}
                          className="inline-flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full"
                        >
                          {j.nama_jasa}
                          <button onClick={() => toggleJasa(j)} className="hover:text-orange-900">
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStep(1)
                    setError('')
                  }}
                  className="flex items-center gap-2 px-5 py-3.5 border border-stone-300 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50"
                >
                  <ArrowLeft className="w-4 h-4" /> Kembali
                </button>
                <button
                  onClick={() => {
                    if (selectedJasa.length === 0) {
                      setError('Pilih minimal satu jasa servis')
                      return
                    }
                    setError('')
                    setStep(3)
                  }}
                  className="flex-1 bg-stone-900 text-white py-3.5 rounded-xl font-medium hover:bg-stone-800"
                >
                  Lanjutkan →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Car className="w-4 h-4 text-stone-400" />
                  <span className="font-medium">
                    {selectedKendaraan?.merk} {selectedKendaraan?.tahun} · {selectedKendaraan?.nomor_polisi}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Wrench className="w-4 h-4 text-stone-400 mt-0.5 flex-shrink-0" />
                  <div className="flex flex-wrap gap-1">
                    {selectedJasa.map(j => (
                      <span key={j.id_jasa} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                        {j.nama_jasa}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-stone-200 rounded-xl p-5">
                <h3 className="font-semibold text-stone-800 mb-1">Kilometer Saat Ini</h3>
                <p className="text-xs text-stone-400 mb-3">Kilometer kendaraan wajib diisi.</p>
                <input
                  type="number"
                  min={0}
                  required
                  value={kilometer}
                  onChange={e => setKilometer(e.target.value)}
                  placeholder="Contoh: 45000"
                  className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="bg-white border border-stone-200 rounded-xl p-5">
                <h3 className="font-semibold text-stone-800 mb-1">Keluhan / Catatan untuk Mekanik</h3>
                <p className="text-xs text-stone-400 mb-3">Ceritakan kondisi kendaraan Anda secara detail.</p>
                <textarea
                  value={keluhan}
                  onChange={e => setKeluhan(e.target.value)}
                  rows={5}
                  placeholder="Contoh: Mesin terasa kasar saat idle, bunyi berisik di bagian kiri depan..."
                  className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStep(2)
                    setError('')
                  }}
                  className="flex items-center gap-2 px-5 py-3.5 border border-stone-300 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50"
                >
                  <ArrowLeft className="w-4 h-4" /> Kembali
                </button>
                <button
                  onClick={() => {
                    if (!kilometer.trim()) {
                      setError('Kilometer wajib diisi')
                      return
                    }
                    if (!keluhan.trim()) {
                      setError('Isi keluhan terlebih dahulu')
                      return
                    }
                    setError('')
                    setStep(4)
                    fetchSlot(tanggal)
                  }}
                  className="flex-1 bg-stone-900 text-white py-3.5 rounded-xl font-medium hover:bg-stone-800"
                >
                  Lanjutkan →
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-white border border-stone-200 rounded-xl p-5">
                <h3 className="font-semibold text-stone-800 mb-3">Pilih Tanggal</h3>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {upcomingDates.map(date => {
                    const isClosed = isTanggalTutup(date)
                    const isFull   = checkIsFull(date)
                    return (
                      <button
                        key={date}
                        type="button"
                        disabled={isClosed || isFull}
                        onClick={() => {
                          if (!isClosed && !isFull) {
                            setTanggal(date)
                            setTanggalDipilih(true)
                          }
                        }}
                        className={`p-2 rounded-xl border-2 text-center transition-all
                          ${
                            isClosed
                              ? 'border-red-100 bg-red-50 opacity-50 cursor-not-allowed'
                              : isFull
                              ? 'border-stone-100 bg-stone-50 text-stone-300 cursor-not-allowed'
                              : tanggal === date
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-stone-200 hover:border-orange-300'
                          }`}
                      >
                        {/* Hari */}
                        <div className="text-xs text-stone-400">
                          {format(parseISO(date + 'T00:00:00'), 'EEE', { locale: id })}
                        </div>

                        {/* Tanggal */}
                        <div
                          className={`text-base font-bold mt-0.5 ${
                            isClosed
                              ? 'text-red-300'
                              : isFull
                              ? 'text-stone-300'
                              : tanggal === date
                              ? 'text-orange-600'
                              : 'text-stone-800'
                          }`}
                        >
                          {format(parseISO(date + 'T00:00:00'), 'd')}
                        </div>

                        {/* Keterangan */}
                        <div className="text-[10px] mt-0.5">
                          {isClosed ? (
                            <span className="text-red-400">
                              {parseISO(date + 'T00:00:00').getDay() === 0 ? 'Libur' : 'Tutup'}
                            </span>
                          ) : isFull ? (
                            <span className="text-red-400 font-medium">Penuh</span>
                          ) : (
                            <span className="text-stone-300">
                              {format(parseISO(date + 'T00:00:00'), 'MMM', { locale: id })}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {tanggalDipilih && tanggalPenuh.includes(tanggal) && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                    Tanggal ini sudah penuh, silakan pilih tanggal lain.
                  </div>
                )}

                {tanggal && (
                  <p className="text-xs text-stone-500 mt-3 flex items-center justify-center gap-1">
                    <CalendarDays className="w-4 h-4" />
                    {formatTanggal(tanggal)}
                  </p>
                )}
              </div>

              <div className="bg-white border border-stone-200 rounded-xl p-5">
                <h3 className="font-semibold text-stone-800 mb-3">Pilih Jam</h3>
                  {!tanggalDipilih ? (
                    <div className="text-center py-6 text-stone-400 text-sm">
                      Silakan pilih tanggal terlebih dahulu
                    </div>
                  ) : loadingSlot ? (
                    <p className="text-stone-400 text-sm text-center py-4">
                      Memuat slot tersedia...
                    </p>
                  ) : (
                    <>
                      {semuaPenuh && (
                        <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
                          Semua slot pada tanggal ini penuh.
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {currentSlot.map(slot => {
                          const penuh = !slot.tersedia || slot.sisa <= 0

                          return (
                            <button
                              key={slot.waktu}
                              type="button"
                              onClick={() => !penuh && setWaktu(slot.waktu)}
                              disabled={penuh}
                              className={`py-3 rounded-xl border-2 text-[15px] font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                                penuh
                                  ? 'border-stone-100 bg-stone-50 text-stone-300 cursor-not-allowed'
                                  : waktu === slot.waktu
                                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                                    : 'border-stone-200 text-stone-700 hover:border-orange-300'
                              }`}
                            >
                              <span>{slot.waktu}</span>
                              <span
                                className={`text-[12px] font-bold ${
                                  penuh ? 'text-red-500' : 'text-green-600'
                                }`}
                              >
                                {penuh ? 'Slot penuh' : `${slot.sisa} Slot tersedia`}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
              </div>

              <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 space-y-3">
                <p className="font-semibold text-stone-700">Ringkasan Booking</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Kendaraan</span>
                    <span className="font-medium">
                      {selectedKendaraan?.merk} {selectedKendaraan?.tahun} · {selectedKendaraan?.nomor_polisi}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Tanggal</span>
                    <span className="font-medium">{formatTanggal(tanggal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Jam</span>
                    <span className="font-medium">{waktu} WIB</span>
                  </div>
                </div>

                <div className="border-t border-stone-200 pt-3 space-y-1.5">
                  <p className="text-xs font-medium text-stone-500 mb-2">Estimasi Biaya Jasa</p>
                  {selectedJasa.map(j => (
                    <div key={j.id_jasa} className="flex justify-between text-sm">
                      <span className="text-stone-700">{j.nama_jasa}</span>
                      <span className="font-medium">{formatRupiah(j.harga_jasa)}</span>
                    </div>
                  ))}
                  
                  {/* Baris Total Estimasi */}
                  <div className="flex justify-between items-start border-t border-stone-300 pt-2 mt-2">
                    <span className="text-sm font-bold">Total Estimasi</span>
                    <div className="text-right">
                      <span className="block text-sm font-bold text-orange-600">{formatRupiah(totalEstimasi)}</span>
                      <p className="text-sm text-red-400 mt-0.5">* Harga belum termasuk sparepart</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStep(3)
                    setError('')
                  }}
                  className="flex items-center gap-2 px-5 py-3.5 border border-stone-300 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50"
                >
                  <ArrowLeft className="w-4 h-4" /> Kembali
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex-1 bg-orange-600 text-white py-3.5 rounded-xl font-medium hover:bg-orange-700 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Memproses...
                    </>
                  ) : (
                    'Konfirmasi Booking'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {batalModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="font-semibold text-stone-900 text-center mb-1">Batalkan Booking?</h3>
            <p className="text-stone-500 text-sm text-center mb-6">
              Booking untuk <strong>{batalModal.merk} {batalModal.tahun}</strong> pada{' '}
              <strong>{formatTanggal(batalModal.tanggal_booking)}</strong> akan dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setBatalModal(null)}
                className="flex-1 py-2.5 border border-stone-300 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50"
              >
                Tidak
              </button>
              <button
                onClick={handleBatal}
                disabled={memBatal}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-60"
              >
                {memBatal ? 'Membatalkan...' : 'Ya, Batalkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}