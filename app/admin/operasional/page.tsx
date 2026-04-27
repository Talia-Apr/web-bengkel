'use client'
// app/admin/operasional/page.tsx
import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, AlertTriangle, X, Check, Calendar } from 'lucide-react'
import { format, parseISO, getDaysInMonth, startOfMonth, getDay, addMonths, subMonths } from 'date-fns'
import { id } from 'date-fns/locale'

interface JadwalItem {
  tanggal: string
  status: 'buka' | 'tutup'
  keterangan: string | null
}

interface BookingPerHari {
  tanggal_booking: string
  jumlah_booking: number
}

const KUOTA = 7
const HARI  = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const NAMA_HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']
const NAMA_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

export default function AdminJadwalPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [jadwal, setJadwal]           = useState<JadwalItem[]>([])
  const [bookingPerHari, setBookingPerHari] = useState<BookingPerHari[]>([])
  const [loading, setLoading]         = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [saving, setSaving]           = useState(false)
  const [keterangan, setKeterangan]   = useState('')
  const [success, setSuccess]         = useState('')
  const [error, setError]             = useState('')

  const bulanStr = format(currentDate, 'yyyy-MM')

  const fetchJadwal = useCallback(async () => {
    setLoading(true)
    const res  = await fetch(`/api/admin/operasional?bulan=${bulanStr}`)
    const json = await res.json()
    if (json.success) {
      setJadwal(json.data.jadwal)
      setBookingPerHari(json.data.bookingPerHari)
    }
    setLoading(false)
  }, [bulanStr])

  useEffect(() => { fetchJadwal() }, [fetchJadwal])

  // Reset selected date saat bulan berubah
  useEffect(() => { setSelectedDate(null) }, [bulanStr])

  const getStatusTanggal = (tgl: string): 'tutup' | 'buka' => {
    console.log('=== getStatusTanggal ===')
    console.log('cari tgl:', tgl)
    console.log('jadwal state:', jadwal)
    console.log('cells:', cells.filter(c => c !== null).slice(0, 10))
    console.log('hariAwal:', hariAwal)
    console.log('tahun:', tahun, 'bulan:', bulan, 'bulan+1:', bulan+1, 'hariAwal:', hariAwal, 'jumlahHari:', jumlahHari)
    
    const j = jadwal.find(j => {
      const jTgl = String(j.tanggal).substring(0, 10)
      console.log('compare:', jTgl, '===', tgl, '->', jTgl === tgl)
      return jTgl === tgl
    })
    
    console.log('hasil find:', j)
    return j?.status === 'tutup' ? 'tutup' : 'buka'

  }

  const getBookingTanggal = (tgl: string): number => {
    const b = bookingPerHari.find(b => {
      const bTgl = String(b.tanggal_booking).substring(0, 10)
      return bTgl === tgl
    })
    return b?.jumlah_booking ?? 0
  }

  const getKeteranganTanggal = (tgl: string): string | null => {
    const j = jadwal.find(j => String(j.tanggal).substring(0, 10) === tgl)
    return j?.keterangan ?? null
  }

  const isMinggu = (tgl: string): boolean => {
    const [y, m, d] = tgl.split('-').map(Number)
    return new Date(y, m - 1, d).getDay() === 0
  }

  const handleToggle = async (targetStatus: 'buka' | 'tutup') => {
    if (!selectedDate) return
    setSaving(true)
    setError('')

    const res = await fetch('/api/admin/operasional', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tanggal:    selectedDate,
        status:     targetStatus,
        keterangan: targetStatus === 'tutup' ? (keterangan || null) : null,
      }),
    })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Gagal menyimpan')
      setSaving(false)
      return
    }

    setSuccess(json.message)
    setTimeout(() => setSuccess(''), 3000)
    setKeterangan('')
    setSaving(false)

    const res2  = await fetch(`/api/admin/operasional?bulan=${bulanStr}`)
    const json2 = await res2.json()
    if (json2.success) {
      setJadwal(json2.data.jadwal)
      setBookingPerHari(json2.data.bookingPerHari)
    }
  }

  const isPastDate = (tgl: string): boolean => {
    const [y, m, d] = tgl.split('-').map(Number)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const inputDate = new Date(y, m - 1, d)
    return inputDate < today
  }

  // Generate kalender
  const tahun      = currentDate.getFullYear()
  const bulan      = currentDate.getMonth()
  const hariAwal   = new Date(tahun, bulan, 1).getDay()   // selalu lokal
  const jumlahHari = new Date(tahun, bulan + 1, 0).getDate() // hari terakhir bulan

  // Buat array sel kalender
  const cells: (string | null)[] = []
  for (let i = 0; i < hariAwal; i++) cells.push(null)
  for (let d = 1; d <= jumlahHari; d++) {
    // Buat tanggal pakai konstruktor lokal, lalu format manual
    const tgl = `${tahun}-${String(bulan + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push(tgl)
  }

  const selectedStatus = selectedDate
  ? (jadwal.find(j => String(j.tanggal).substring(0, 10) === selectedDate)?.status ?? 'buka')
  : null
  const selectedKet       = selectedDate ? getKeteranganTanggal(selectedDate) : null
  const selectedBooking   = selectedDate ? getBookingTanggal(selectedDate) : 0
  const selectedIsMinggu  = selectedDate ? isMinggu(selectedDate) : false

  const selectedDayName = selectedDate ? NAMA_HARI[parseISO(selectedDate + 'T00:00:00').getDay()] : ''
  const selectedDayFull = selectedDate ? format(parseISO(selectedDate + 'T00:00:00'), 'dd MMMM yyyy', { locale: id }) : ''

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-stone-900">Kelola Jadwal</h2>
        <p className="text-stone-500 text-sm mt-1">Atur hari buka dan tutup bengkel</p>
      </div>

      {/* Alert panduan */}
      {!selectedDate && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Pilih Salah Satu Tanggal</p>
            <p className="text-sm text-red-500 mt-0.5">Kemudian Atur Tanggal Tersebut ditutup atau tidak</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
          <Check className="w-4 h-4 flex-shrink-0" /> {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="flex gap-6 items-start flex-wrap lg:flex-nowrap">
        {/* ── Kalender ── */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 flex-1 min-w-[320px]">
          {/* Header navigasi bulan */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="p-2 rounded-xl hover:bg-stone-100 transition-colors">
              <ChevronLeft className="w-5 h-5 text-stone-600" />
            </button>
            <h3 className="font-bold text-stone-900 text-lg">
              {NAMA_BULAN[bulan]} {tahun}
            </h3>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-2 rounded-xl hover:bg-stone-100 transition-colors">
              <ChevronRight className="w-5 h-5 text-stone-600" />
            </button>
          </div>

          {/* Header hari */}
          <div className="grid grid-cols-7 mb-2">
            {HARI.map((h, i) => (
              <div key={h} className={`text-center text-xs font-semibold py-1 ${i === 0 ? 'text-red-500' : 'text-stone-400'}`}>
                {h}
              </div>
            ))}
          </div>

          {/* Grid tanggal */}
          {loading ? (
            <div className="text-center py-8 text-stone-400 text-sm">Memuat kalender...</div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {cells.map((tgl, idx) => {
                if (!tgl) return <div key={`empty-${idx}`} />

                const [y, m, d] = tgl.split('-').map(Number)
                const dayDate  = new Date(y, m - 1, d)
                const isSunday = dayDate.getDay() === 0
                const today    = new Date(); today.setHours(0,0,0,0)
                const isPast   = dayDate < today
                const status   = jadwal.find(j => String(j.tanggal).substring(0, 10) === tgl)?.status ?? 'buka'
                const booking  = bookingPerHari.find(b => String(b.tanggal_booking).substring(0, 10) === tgl)?.jumlah_booking ?? 0
                const isTutup  = status === 'tutup' || isSunday
                const isSelected = selectedDate === tgl
                const isFull   = booking >= KUOTA
                const dayNum   = d

                return (
                  <button
                    key={tgl}
                    onClick={() => {
                        console.log('KLIK tgl:', tgl)
                        if (isPast) return
                        setSelectedDate(tgl)
                        setKeterangan('')
                      }}
                    disabled={isPast}
                    className={`
                      relative flex flex-col items-center justify-center py-2 rounded-xl
                      text-xs font-medium transition-all border-2
                      ${isPast ? 'opacity-40 cursor-not-allowed bg-stone-100 border-transparent' : ''}
                      ${!isPast && isSelected ? 'border-orange-500 bg-orange-50' : ''}
                      ${!isPast && !isSelected && isTutup ? 'border-red-100 bg-red-50' : ''}
                      ${!isPast && !isSelected && !isTutup && isFull ? 'border-amber-100 bg-amber-50' : ''}
                      ${!isPast && !isSelected && !isTutup && !isFull ? 'border-transparent hover:border-stone-200' : ''}
                    `}
                  >
                    <span className={`text-sm font-bold
                      ${isSunday ? 'text-red-500' : isSelected ? 'text-orange-600' : isPast ? 'text-stone-400' : 'text-stone-800'}`}>
                      {String(dayNum).padStart(2, '0')}
                    </span>
                    {!isSunday && !isPast && (
                      <span className={`text-[10px] mt-0.5
                        ${isTutup ? 'text-red-400' : isFull ? 'text-amber-600' : 'text-stone-400'}`}>
                        {isTutup ? 'Tutup' : `${booking}/${KUOTA}`}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Legenda */}
          <div className="flex items-center gap-4 mt-5 pt-4 border-t border-stone-100">
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              <div className="w-3 h-3 rounded-sm bg-orange-100 border-2 border-orange-500" />
              Dipilih
            </div>
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              <div className="w-3 h-3 rounded-sm bg-red-50 border-2 border-red-100" />
              Ditutup
            </div>
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              <div className="w-3 h-3 rounded-sm bg-amber-50 border-2 border-amber-100" />
              Penuh
            </div>
          </div>
        </div>

        {/* ── Detail & Aksi ── */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 w-full lg:w-72 flex-shrink-0">
          <h3 className="font-bold text-stone-900 text-lg mb-5">Detail Hari Dipilih</h3>

          {!selectedDate ? (
            <div className="text-center py-8 text-stone-400">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Pilih tanggal di kalender</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Info tanggal */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-400">Hari</span>
                  <span className="font-medium text-stone-800">{selectedDayName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Tanggal</span>
                  <span className="font-medium text-stone-800">{selectedDayFull}</span>
                </div>
                {!selectedIsMinggu && (
                  <div className="flex justify-between">
                    <span className="text-stone-400">Booking</span>
                    <span className="font-medium text-stone-800">{selectedBooking} dari {KUOTA}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-stone-400">Status</span>
                  <span className={`font-semibold ${selectedIsMinggu || selectedStatus === 'tutup' ? 'text-red-600' : 'text-green-600'}`}>
                    {selectedIsMinggu ? 'Libur (Minggu)' : selectedStatus === 'tutup' ? 'Ditutup' : 'Buka'}
                  </span>
                </div>
                {selectedKet && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                    📝 {selectedKet}
                  </div>
                )}
              </div>

              {/* Aksi — tidak bisa ubah hari Minggu */}
              {selectedIsMinggu ? (
                <div className="bg-stone-50 rounded-xl px-4 py-3 text-sm text-stone-500 text-center">
                  Hari Minggu selalu tutup
                </div>
              ) : (
                <div className="space-y-3 border-t border-stone-100 pt-4">
                  {/* Keterangan (hanya saat mau tutup) */}
                  {selectedStatus === 'buka' && (
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">
                        Keterangan (opsional)
                      </label>
                      <input value={keterangan}
                        onChange={e => setKeterangan(e.target.value)}
                        placeholder="Contoh: Hari Raya, Pemeliharaan..."
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                    </div>
                  )}

                  {selectedStatus === 'tutup' ? (
                    <button onClick={() => handleToggle('buka')} disabled={saving}
                      className="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-60 transition-colors">
                      {saving ? 'Menyimpan...' : '✓ Buka Kembali'}
                    </button>
                  ) : (
                    <button onClick={() => handleToggle('tutup')} disabled={saving}
                      className="w-full py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-60 transition-colors">
                      {saving ? 'Menyimpan...' : 'Tutup Tanggal Ini'}
                    </button>
                  )}

                  {selectedDate && (
                    <button onClick={() => setSelectedDate(null)}
                      className="w-full py-2 text-stone-500 text-sm hover:text-stone-700 transition-colors">
                      Batal
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
