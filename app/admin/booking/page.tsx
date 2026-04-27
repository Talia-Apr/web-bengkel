'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Car, Search, Plus, Check, X, ChevronRight, ChevronDown, UserPlus, User, Building2, ArrowLeft } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import SearchableSelect, { SelectOption } from '@/components/ui/SearchableSelect'

// ─── Types ────────────────────────────────────────────────────
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
  no_telp: string
  nama_mekanik: string | null
  id_mekanik: number | null
}

interface PelangganResult {
  id_pelanggan: number
  nama: string
  email: string
  no_telp: string
  jenis_pelanggan: string
  nama_perusahaan: string | null
  jumlah_kendaraan: number
}

interface Kendaraan {
  id_kendaraan: number
  nomor_polisi: string
  merk: string
  tahun: number
  warna: string
  kilometer: number
  stnk: string
}

interface Mekanik {
  id_mekanik: number
  nama: string
  spesialisasi: string
  status: string
  jumlah_tugas?: number
}
// ─── Konstanta ────────────────────────────────────────────────
const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00']

const statusConfig: Record<string, { label: string; color: string }> = {
  menunggu:     { label: 'Menunggu',     color: 'bg-yellow-100 text-yellow-800' },
  dikonfirmasi: { label: 'Dikonfirmasi', color: 'bg-blue-100 text-blue-800' },
  ditolak:      { label: 'Ditolak',      color: 'bg-red-100 text-red-800' },
  dibatalkan:   { label: 'Dibatalkan',   color: 'bg-stone-100 text-stone-500' },
  selesai:      { label: 'Selesai',      color: 'bg-green-100 text-green-800' },
}

const emptyPelangganForm = {
  nama: '', email: '', password: '', no_telp: '', alamat: '',
  jenis_pelanggan: 'individu' as 'individu' | 'perusahaan',
  nama_perusahaan: '', term_of_payment: 14,
}

const emptyKendaraanForm = {
  nomor_polisi: '', merk: '',
  tahun: '' as unknown as number, warna: '',
  kilometer: '' as unknown as number, stnk: 'ada',
  no_mesin: '', no_rangka: '', kategori_mobil: '',
}

// ─── Helper format tanggal aman ───────────────────────────────
const formatTanggal = (val: string) => {
  try {
    // Coba parse sebagai ISO string atau date string
    const date = val.includes('T') ? parseISO(val) : parseISO(val + 'T00:00:00')
    if (isNaN(date.getTime())) return val
    return format(date, 'dd MMM yyyy', { locale: id })
  } catch {
    return val
  }
}

// ─── Komponen utama ───────────────────────────────────────────
export default function AdminBookingPage() {
  const [bookings, setBookings]             = useState<BookingRow[]>([])
  const [mekaniks, setMekaniks]             = useState<Mekanik[]>([])
  const [loading, setLoading]               = useState(true)
  const [search, setSearch]                 = useState('')
  const [filterStatus, setFilterStatus]     = useState('')
  const [filterTanggal, setFilterTanggal]   = useState('')
  const [success, setSuccess]               = useState('')
  const [assignModal, setAssignModal]       = useState<BookingRow | null>(null)
  const [selectedMekanik, setSelectedMekanik] = useState<string | number>('')
  const [assigning, setAssigning]           = useState(false)
  const router = useRouter()

  // Modal Assign Mekanik
  const mekanikSelectOpts: SelectOption[] = mekaniks.map(m => ({
    value: m.id_mekanik,
    label: m.nama,
    sub: `${m.spesialisasi} · ${m.jumlah_tugas ?? 0} tugas servis`,
  }))

  // Modal tambah booking — stepper
  const [showModal, setShowModal]           = useState(false)
  const [step, setStep]                     = useState(1)

  // Step 1 — cari/tambah pelanggan
  const [searchPelanggan, setSearchPelanggan]       = useState('')
  const [pelangganResults, setPelangganResults]     = useState<PelangganResult[]>([])
  const [selectedPelanggan, setSelectedPelanggan]   = useState<PelangganResult | null>(null)
  const [showTambahPelanggan, setShowTambahPelanggan] = useState(false)
  const [pelangganForm, setPelangganForm]           = useState(emptyPelangganForm)
  const [savingPelanggan, setSavingPelanggan]       = useState(false)
  const [errorPelanggan, setErrorPelanggan]         = useState('')
  const searchTimeout = useRef<NodeJS.Timeout>()

  // Step 2 — pilih/tambah kendaraan
  const [kendaraanList, setKendaraanList]           = useState<Kendaraan[]>([])
  const [selectedKendaraan, setSelectedKendaraan]   = useState<Kendaraan | null>(null)
  const [showTambahKendaraan, setShowTambahKendaraan] = useState(false)
  const [kendaraanForm, setKendaraanForm]           = useState(emptyKendaraanForm)
  const [savingKendaraan, setSavingKendaraan]       = useState(false)
  const [errorKendaraan, setErrorKendaraan]         = useState('')

  // Step 3 — detail booking
  const [bookingForm, setBookingForm] = useState({
    tanggal_booking: format(new Date(), 'yyyy-MM-dd'),
    waktu_booking: '08:00',
    keluhan: '',
    id_mekanik: '',
  })
  const [savingBooking, setSavingBooking]   = useState(false)
  const [errorBooking, setErrorBooking]     = useState('')

  // ─── Fetch ──────────────────────────────────────────────────
  const fetchBookings = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search)        params.set('search', search)
    if (filterStatus)  params.set('status', filterStatus)
    if (filterTanggal) params.set('tanggal', filterTanggal)
    const res  = await fetch(`/api/admin/booking?${params}`)
    const json = await res.json()
    if (json.success) setBookings(json.data)
    setLoading(false)
  }, [search, filterStatus, filterTanggal])

  const fetchMekaniks = useCallback(async () => {
    const res  = await fetch('/api/admin/mekanik')
    const json = await res.json()
    if (json.success) setMekaniks(json.data)
  }, [])

  useEffect(() => { fetchBookings(); fetchMekaniks() }, [fetchBookings, fetchMekaniks])

  const showSuccessMsg = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  

  // ─── Aksi booking ────────────────────────────────────────────
  const handleAction = async (id_booking: number, action: string, id_mekanik?: number) => {
    const res  = await fetch(`/api/admin/booking/${id_booking}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, id_mekanik }),
    })
    const json = await res.json()
    if (!res.ok) { alert(json.error); return }
    showSuccessMsg(json.message)
    fetchBookings()
  }

  const handleAssign = async () => {
    if (!assignModal || !selectedMekanik) return
    setAssigning(true)
    await handleAction(assignModal.id_booking, 'assign', Number(selectedMekanik))
    setAssignModal(null)
    setSelectedMekanik('')
    setAssigning(false)
  }

  // ─── Step 1: Cari pelanggan ──────────────────────────────────
  const handleSearchPelanggan = (val: string) => {
    setSearchPelanggan(val)
    clearTimeout(searchTimeout.current)
    if (val.length < 2) { setPelangganResults([]); return }
    searchTimeout.current = setTimeout(async () => {
      const res  = await fetch(`/api/admin/booking/search-pelanggan?q=${encodeURIComponent(val)}`)
      const json = await res.json()
      if (json.success) setPelangganResults(json.data)
    }, 300)
  }

  const handlePilihPelanggan = async (p: PelangganResult) => {
    setSelectedPelanggan(p)
    setPelangganResults([])
    setSearchPelanggan('')
    const res  = await fetch(`/api/admin/booking/kendaraan?id_pelanggan=${p.id_pelanggan}`)
    const json = await res.json()
    if (json.success) setKendaraanList(json.data)
  }

  const handleTambahPelanggan = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorPelanggan('')
    setSavingPelanggan(true)
    const res  = await fetch('/api/admin/pelanggan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pelangganForm),
    })
    const json = await res.json()
    if (!res.ok) {
      setErrorPelanggan(json.error ?? 'Gagal menambahkan pelanggan')
      setSavingPelanggan(false)
      return
    }
    const res2  = await fetch(`/api/admin/booking/search-pelanggan?q=${encodeURIComponent(pelangganForm.nama)}`)
    const json2 = await res2.json()
    if (json2.success && json2.data.length > 0) handlePilihPelanggan(json2.data[0])
    setShowTambahPelanggan(false)
    setPelangganForm(emptyPelangganForm)
    setSavingPelanggan(false)
  }

  // ─── Step 2: Tambah kendaraan ────────────────────────────────
  const handleTambahKendaraan = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorKendaraan('')
    setSavingKendaraan(true)
    const res  = await fetch('/api/admin/booking/kendaraan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...kendaraanForm, id_pelanggan: selectedPelanggan?.id_pelanggan }),
    })
    const json = await res.json()
    if (!res.ok) {
      setErrorKendaraan(json.error ?? 'Gagal menambahkan kendaraan')
      setSavingKendaraan(false)
      return
    }
    const res2  = await fetch(`/api/admin/booking/kendaraan?id_pelanggan=${selectedPelanggan?.id_pelanggan}`)
    const json2 = await res2.json()
    if (json2.success) {
      setKendaraanList(json2.data)
      const baru = json2.data.find((k: Kendaraan) => k.nomor_polisi === kendaraanForm.nomor_polisi)
      if (baru) setSelectedKendaraan(baru)
    }
    setShowTambahKendaraan(false)
    setKendaraanForm(emptyKendaraanForm)
    setSavingKendaraan(false)
  }

  // ─── Step 3: Simpan booking ──────────────────────────────────
  const handleSimpanBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorBooking('')
    setSavingBooking(true)
    const res  = await fetch('/api/admin/booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_kendaraan:    selectedKendaraan?.id_kendaraan,
        keluhan:         bookingForm.keluhan,
        tanggal_booking: bookingForm.tanggal_booking,
        waktu_booking:   bookingForm.waktu_booking + ':00',
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setErrorBooking(json.error ?? 'Gagal menyimpan booking')
      setSavingBooking(false)
      return
    }
    if (bookingForm.id_mekanik && json.id_booking) {
      await handleAction(json.id_booking, 'assign', Number(bookingForm.id_mekanik))
    }
    resetModal()
    showSuccessMsg('Booking berhasil ditambahkan!')
    fetchBookings()
  }

  const resetModal = () => {
    setShowModal(false)
    setStep(1)
    setSearchPelanggan('')
    setPelangganResults([])
    setSelectedPelanggan(null)
    setShowTambahPelanggan(false)
    setPelangganForm(emptyPelangganForm)
    setKendaraanList([])
    setSelectedKendaraan(null)
    setShowTambahKendaraan(false)
    setKendaraanForm(emptyKendaraanForm)
    setBookingForm({ tanggal_booking: format(new Date(), 'yyyy-MM-dd'), waktu_booking: '08:00', keluhan: '', id_mekanik: '' })
    setErrorBooking('')
  }

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
          <Check className="w-4 h-4 flex-shrink-0" /> {success}
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-display text-2xl font-bold text-stone-900">Kelola Booking</h2>
          <p className="text-stone-500 text-sm mt-1">Kelola dan pantau semua booking servis</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-700 transition-colors">
          <Plus className="w-4 h-4" /> Tambah Booking
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input placeholder="Cari nama pelanggan atau plat nomor..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>

        {/* Status */}
        <div className="relative">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="appearance-none pl-4 pr-9 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-stone-700">
            <option value="">Semua Status</option>
            {Object.entries(statusConfig).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
        </div>
        
        {/* Tanggal */}
        <div className="relative">
          <input
          type="date"
          value={filterTanggal}
          onChange={e => setFilterTanggal(e.target.value)}
          className={`border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500
          ${!filterTanggal ? 'text-transparent' : 'text-stone-700'}`}
        />
          {/* Placeholder custom */}
          {!filterTanggal && (
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-700 text-sm pointer-events-none peer-focus:hidden">
              Pilih tanggal
            </span>
          )}
        </div>

        {filterTanggal && (
          <button
            onClick={() => setFilterTanggal('')}
            className="text-stone-400 hover:text-stone-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tabel */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-800">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-stone-100 uppercase tracking-wide">Pelanggan</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-stone-100 uppercase tracking-wide">Kendaraan</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-stone-100 uppercase tracking-wide whitespace-nowrap">Tanggal & Waktu</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-stone-100 uppercase tracking-wide">Keluhan</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-stone-100 uppercase tracking-wide">Mekanik</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-stone-100 uppercase tracking-wide">Status</th>
                <th className="text-center px-5 py-3.5 text-xs font-semibold text-stone-100 uppercase tracking-wide">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-stone-400 text-sm">Memuat data...</td></tr>
              ) : bookings.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-stone-400">
                  <Car className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>Tidak ada data booking</p>
                </td></tr>
              ) : (
                bookings.map(b => {
                  const cfg = statusConfig[b.status_booking] ?? { label: b.status_booking, color: 'bg-stone-100 text-stone-600' }
                  return (
                    <tr
                      key={b.id_booking}
                      onClick={() => router.push(`/admin/booking/${b.id_booking}`)}
                      className="hover:bg-stone-50 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium text-stone-900">{b.nama_pelanggan}</div>
                        <div className="text-xs text-stone-400">{b.no_telp}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-stone-800">{b.merk} {b.tahun}</div>
                        <div className="text-xs text-stone-400">{b.nomor_polisi}</div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="text-stone-800">{formatTanggal(b.tanggal_booking)}</div>
                        <div className="text-xs text-stone-400">{b.waktu_booking?.slice(0, 5)}</div>
                      </td>
                      <td className="px-5 py-4 max-w-[160px]">
                        <p className="text-stone-700 text-xs line-clamp-2">{b.keluhan}</p>
                      </td>
                      <td className="px-5 py-4">
                        {b.nama_mekanik
                          ? <span className="text-stone-700 text-sm">{b.nama_mekanik}</span>
                          : <span className="text-stone-300 text-xs italic">Belum ditugaskan</span>
                        }
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <ChevronRight className="w-4 h-4 text-stone-400 mx-auto" />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal Assign Mekanik ─────────────────────────────── */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-stone-900 text-lg mb-1">Tugaskan Mekanik</h3>
            <p className="text-stone-500 text-sm mb-4">
              {assignModal.nama_pelanggan} · {assignModal.merk} · {assignModal.nomor_polisi}
            </p>

            <SearchableSelect
              options={mekanikSelectOpts}
              value={selectedMekanik}
              onChange={setSelectedMekanik}
              placeholder="-- Pilih Mekanik --"
              disabled={assigning}
              className="mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => { setAssignModal(null); setSelectedMekanik('') }}
                className="flex-1 py-2.5 border border-stone-300 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50"
              >
                Batal
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedMekanik || assigning}
                className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 disabled:opacity-60"
              >
                {assigning ? 'Menyimpan...' : 'Tugaskan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Tambah Booking (Stepper) ───────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Header stepper */}
            <div className="p-6 border-b border-stone-100 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-stone-900 text-lg">Tambah Booking Baru</h3>
                <button onClick={resetModal} className="text-stone-400 hover:text-stone-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center">
                {[{ n: 1, label: 'Pelanggan' }, { n: 2, label: 'Kendaraan' }, { n: 3, label: 'Detail' }].map((s, i) => (
                  <div key={s.n} className={`flex items-center ${i < 2 ? 'flex-1' : ''}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                        ${step === s.n ? 'bg-orange-600 text-white' : step > s.n ? 'bg-green-500 text-white' : 'bg-stone-200 text-stone-500'}`}>
                        {step > s.n ? <Check className="w-3.5 h-3.5" /> : s.n}
                      </div>
                      <span className={`text-xs hidden sm:block ${step === s.n ? 'text-orange-600 font-medium' : 'text-stone-400'}`}>
                        {s.label}
                      </span>
                    </div>
                    {i < 2 && <div className={`flex-1 h-0.5 mx-3 ${step > s.n ? 'bg-orange-500' : 'bg-stone-200'}`} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">

              {/* ── STEP 1 ── */}
              {step === 1 && (
                <div className="space-y-4">
                  {!selectedPelanggan ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1.5">Cari Pelanggan</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                          <input value={searchPelanggan} onChange={e => handleSearchPelanggan(e.target.value)}
                            placeholder="Ketik nama, email, atau no. telepon..."
                            className="w-full pl-9 pr-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                        </div>
                        {pelangganResults.length > 0 && (
                          <div className="mt-2 border border-stone-200 rounded-xl overflow-hidden">
                            {pelangganResults.map(p => (
                              <button key={p.id_pelanggan} type="button" onClick={() => handlePilihPelanggan(p)}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-orange-50 transition-colors text-left border-b border-stone-100 last:border-0">
                                <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 font-bold text-sm flex-shrink-0">
                                  {p.nama.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-stone-900 text-sm">{p.nama}</div>
                                  <div className="text-xs text-stone-400">{p.no_telp} · {p.jumlah_kendaraan} kendaraan</div>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${p.jenis_pelanggan === 'perusahaan' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                  {p.jenis_pelanggan === 'perusahaan' ? <><Building2 className="w-3 h-3 inline mr-0.5" />Perusahaan</> : <><User className="w-3 h-3 inline mr-0.5" />Individu</>}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowTambahPelanggan(!showTambahPelanggan)}
                        className="w-full flex items-center gap-2 px-4 py-3 border border-dashed border-stone-300 rounded-xl text-stone-500 hover:border-orange-400 hover:text-orange-600 transition-colors text-sm"
                      >
                        {showTambahPelanggan ? (
                          <X className="w-4 h-4" />
                        ) : (
                          <UserPlus className="w-4 h-4" />
                        )}

                        {showTambahPelanggan
                          ? 'Batal tambah pelanggan baru'
                          : 'Pelanggan belum terdaftar? Tambah baru'}
                      </button>

                      {showTambahPelanggan && (
                        <form onSubmit={handleTambahPelanggan} className="border border-stone-200 rounded-xl p-4 space-y-3">
                          <p className="text-sm font-medium text-stone-700">Data Pelanggan Baru</p>
                          {errorPelanggan && (
                            <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-lg">{errorPelanggan}</div>
                          )}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                              <input required value={pelangganForm.nama}
                                onChange={e => setPelangganForm(f => ({ ...f, nama: e.target.value }))}
                                placeholder="Nama lengkap *"
                                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                            </div>
                            <input required type="email" value={pelangganForm.email}
                              onChange={e => setPelangganForm(f => ({ ...f, email: e.target.value }))}
                              placeholder="Email *"
                              className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                            <input required value={pelangganForm.no_telp}
                              onChange={e => setPelangganForm(f => ({ ...f, no_telp: e.target.value }))}
                              placeholder="No. telepon *"
                              className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                            <input required type="password" value={pelangganForm.password}
                              onChange={e => setPelangganForm(f => ({ ...f, password: e.target.value }))}
                              placeholder="Password *" minLength={6}
                              className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                            <div className="flex gap-2">
                              {(['individu', 'perusahaan'] as const).map(j => (
                                <button key={j} type="button"
                                  onClick={() => setPelangganForm(f => ({ ...f, jenis_pelanggan: j }))}
                                  className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors
                                    ${pelangganForm.jenis_pelanggan === j ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-stone-300 text-stone-600'}`}>
                                  {j === 'individu' ? 'Individu' : 'Perusahaan'}
                                </button>
                              ))}
                            </div>
                          </div>
                          {pelangganForm.jenis_pelanggan === 'perusahaan' && (
                            <div className="grid grid-cols-2 gap-3">
                              <input required value={pelangganForm.nama_perusahaan}
                                onChange={e => setPelangganForm(f => ({ ...f, nama_perusahaan: e.target.value }))}
                                placeholder="Nama perusahaan *"
                                className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                              <div className="flex gap-2">
                                {[14, 30].map(h => (
                                  <button key={h} type="button"
                                    onClick={() => setPelangganForm(f => ({ ...f, term_of_payment: h }))}
                                    className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors
                                      ${pelangganForm.term_of_payment === h ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-stone-300 text-stone-600'}`}>
                                    {h} Hari
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          <button type="submit" disabled={savingPelanggan}
                            className="w-full py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-60">
                            {savingPelanggan ? 'Menyimpan...' : 'Tambah Pelanggan'}
                          </button>
                        </form>
                      )}
                    </>
                  ) : (
                    <div className="border border-green-200 bg-green-50 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center text-green-800 font-bold">
                          {selectedPelanggan.nama.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-stone-900">{selectedPelanggan.nama}</div>
                          <div className="text-xs text-stone-500">{selectedPelanggan.no_telp} · {selectedPelanggan.email}</div>
                        </div>
                      </div>
                      <button type="button" onClick={() => { setSelectedPelanggan(null); setSelectedKendaraan(null); setKendaraanList([]) }}
                        className="text-stone-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 2 Tambah Kendaraan ── */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-stone-600 bg-stone-50 px-4 py-2.5 rounded-xl">
                    <User className="w-4 h-4 text-stone-400 flex-shrink-0" />
                    <span className="font-medium">{selectedPelanggan?.nama}</span>
                    <span className="text-stone-400">·</span>
                    <span className="text-stone-400">{selectedPelanggan?.no_telp}</span>
                  </div>

                  {kendaraanList.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-stone-700 mb-2">Pilih Kendaraan</p>
                      <div className="space-y-2">
                        {kendaraanList.map(k => (
                          <button key={k.id_kendaraan} type="button" onClick={() => setSelectedKendaraan(k)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-left
                              ${selectedKendaraan?.id_kendaraan === k.id_kendaraan ? 'border-orange-500 bg-orange-50' : 'border-stone-200 hover:border-stone-300'}`}>
                            <Car className={`w-5 h-5 flex-shrink-0 ${selectedKendaraan?.id_kendaraan === k.id_kendaraan ? 'text-orange-600' : 'text-stone-400'}`} />
                            <div className="flex-1">
                              <div className="font-medium text-stone-900 text-sm">{k.merk} {k.tahun}</div>
                              <div className="text-xs text-stone-400">{k.nomor_polisi} · {k.warna} · {k.stnk === 'ada' ? 'STNK Ada' : 'STNK Tidak Ada'}</div>
                            </div>
                            {selectedKendaraan?.id_kendaraan === k.id_kendaraan && <Check className="w-4 h-4 text-orange-600 flex-shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button type="button" onClick={() => setShowTambahKendaraan(!showTambahKendaraan)}
                    className="w-full flex items-center gap-2 px-4 py-3 border border-dashed border-stone-300 rounded-xl text-stone-500 hover:border-orange-400 hover:text-orange-600 transition-colors text-sm">
                    <Plus className="w-4 h-4" />
                    {showTambahKendaraan ? 'Batal' : kendaraanList.length === 0 ? 'Belum ada kendaraan, tambah sekarang' : 'Tambah kendaraan baru'}
                  </button>

                  {showTambahKendaraan && (
                    <form onSubmit={handleTambahKendaraan} className="border border-stone-200 rounded-xl p-4 space-y-3">
                      <p className="text-sm font-medium text-stone-700">Data Kendaraan Baru</p>
                      {errorKendaraan && (
                        <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-lg">{errorKendaraan}</div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Nomor polisi */}
                        <div className="col-span-2">
                          <input required value={kendaraanForm.nomor_polisi}
                            onChange={e => setKendaraanForm(f => ({ ...f, nomor_polisi: e.target.value.toUpperCase() }))}
                            placeholder="Nomor polisi *"
                            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono" />
                        </div>
                        {/* Merk */}
                        <input required value={kendaraanForm.merk}
                          onChange={e => setKendaraanForm(f => ({ ...f, merk: e.target.value }))}
                          placeholder="Merk *"
                          className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                        {/* Tahun */}
                        <input required type="number" value={kendaraanForm.tahun || ''}
                          onChange={e => setKendaraanForm(f => ({ ...f, tahun: Number(e.target.value) }))}
                          placeholder="Tahun (cth: 2020)" min={1990} max={new Date().getFullYear() + 1}
                          className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                        {/* Warna */}
                        <input value={kendaraanForm.warna}
                          onChange={e => setKendaraanForm(f => ({ ...f, warna: e.target.value }))}
                          placeholder="Warna"
                          className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                        {/* Kilometer */}
                        <input type="number" value={kendaraanForm.kilometer || ''}
                          onChange={e => setKendaraanForm(f => ({ ...f, kilometer: Number(e.target.value) }))}
                          placeholder="Kilometer (cth: 50000)" min={0}
                          className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                        {/* STNK */}
                        <div className="col-span-2">
                          <p className="text-xs font-medium text-stone-600 mb-1.5">STNK</p>
                          <div className="flex gap-2">
                            {[{ val: 'ada', label: 'Ada' }, { val: 'tidak', label: 'Tidak Ada' }].map(opt => (
                              <button key={opt.val} type="button"
                                onClick={() => setKendaraanForm(f => ({ ...f, stnk: opt.val }))}
                                className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors
                                  ${kendaraanForm.stnk === opt.val ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-stone-300 text-stone-600'}`}>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {/* No mesin */}
                        <input value={kendaraanForm.no_mesin}
                          onChange={e => setKendaraanForm(f => ({ ...f, no_mesin: e.target.value }))}
                          placeholder="No. mesin"
                          className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono" />
                        {/* No rangka */}
                        <input value={kendaraanForm.no_rangka}
                          onChange={e => setKendaraanForm(f => ({ ...f, no_rangka: e.target.value }))}
                          placeholder="No. rangka"
                          className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono" />
                      </div>
                      <button type="submit" disabled={savingKendaraan}
                        className="w-full py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-60">
                        {savingKendaraan ? 'Menyimpan...' : 'Tambah Kendaraan'}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* ── STEP 3 ── */}
              {step === 3 && (
                <form onSubmit={handleSimpanBooking} id="form-booking" className="space-y-4">
                  <div className="bg-stone-50 rounded-xl p-4 space-y-1.5 text-sm">
                    <div className="flex items-center gap-2 text-stone-600">
                      <User className="w-4 h-4 text-stone-400" />
                      <span className="font-medium">{selectedPelanggan?.nama}</span>
                    </div>
                    <div className="flex items-center gap-2 text-stone-600">
                      <Car className="w-4 h-4 text-stone-400" />
                      <span>{selectedKendaraan?.merk} {selectedKendaraan?.tahun} · {selectedKendaraan?.nomor_polisi}</span>
                    </div>
                  </div>

                  {errorBooking && (
                    <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{errorBooking}</div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Tanggal <span className="text-red-500">*</span></label>
                      <input required type="date" value={bookingForm.tanggal_booking}
                        min={format(new Date(), 'yyyy-MM-dd')}
                        onChange={e => setBookingForm(f => ({ ...f, tanggal_booking: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Jam <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <select required value={bookingForm.waktu_booking}
                          onChange={e => setBookingForm(f => ({ ...f, waktu_booking: e.target.value }))}
                          className="w-full appearance-none px-4 py-2.5 pr-9 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white">
                          {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Keluhan / Deskripsi <span className="text-red-500">*</span></label>
                    <textarea required value={bookingForm.keluhan}
                      onChange={e => setBookingForm(f => ({ ...f, keluhan: e.target.value }))}
                      rows={3} placeholder="Jelaskan keluhan atau kondisi kendaraan..."
                      className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">
                      Tugaskan Mekanik <span className="text-stone-400 font-normal">(opsional)</span>
                    </label>
                    <div className="relative">
                      <select value={bookingForm.id_mekanik}
                        onChange={e => setBookingForm(f => ({ ...f, id_mekanik: e.target.value }))}
                        className="w-full appearance-none px-4 py-2.5 pr-9 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white">
                        <option value="">-- Belum ditentukan --</option>
                        {mekaniks.filter(m => m.status === 'tersedia').map(m => (
                          <option key={m.id_mekanik} value={m.id_mekanik}>{m.nama} · {m.spesialisasi}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Footer navigasi */}
            <div className="p-6 border-t border-stone-100 flex gap-3 flex-shrink-0">
              {step > 1 && (
                <button type="button" onClick={() => setStep(s => s - 1)}
                  className="flex items-center gap-2 px-4 py-2.5 border border-stone-300 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50">
                  <ArrowLeft className="w-4 h-4" /> Kembali
                </button>
              )}
              <div className="flex-1" />
              {step < 3 ? (
                <button type="button"
                  disabled={(step === 1 && !selectedPelanggan) || (step === 2 && !selectedKendaraan)}
                  onClick={() => setStep(s => s + 1)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
                  Lanjut <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button type="submit" form="form-booking" disabled={savingBooking}
                  className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 disabled:opacity-60">
                  {savingBooking ? 'Menyimpan...' : <><Check className="w-4 h-4" /> Simpan Booking</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
