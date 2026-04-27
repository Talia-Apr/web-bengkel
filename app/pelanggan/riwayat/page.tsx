'use client'
// app/pelanggan/riwayat/page.tsx
import { useEffect, useState, useCallback } from 'react'
import { CheckCircle, XCircle, Car, Search, ChevronDown, Receipt, X, Printer, Clock, CalendarDays, UserCog } from 'lucide-react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { id } from 'date-fns/locale'

interface RiwayatRow {
  id_booking: number
  tanggal_booking: string
  keluhan: string
  status_booking: string
  nomor_polisi: string
  merk: string
  tahun: number
  id_nota: number | null
  total_biaya: number | null
  status_pembayaran: string | null
  jatuh_tempo: string | null
  nama_mekanik: string | null
}

interface DetailItem {
  id_detail_nota: number
  nama_item: string
  jenis_item: string
  harga: number
  qty: number
  subtotal: number
}

interface NotaDetail {
  nota: {
    id_nota: number
    nomor_nota: string
    tanggal_nota: string
    nama_pelanggan: string
    nomor_polisi: string
    merk: string
    tahun: number
    nama_mekanik: string
    total_biaya: number
    diskon_jasa: number
    diskon_sparepart: number
    metode_pembayaran: string
    status_pembayaran: string
    tanggal_pembayaran: string | null
    jatuh_tempo: string | null
    no_telp: string
  }
  detail: DetailItem[]
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  selesai:    { label: 'Selesai',    color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  ditolak:    { label: 'Ditolak',    color: 'bg-red-100 text-red-700',      icon: XCircle },
  dibatalkan: { label: 'Dibatalkan', color: 'bg-stone-100 text-stone-500',  icon: XCircle },
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

const formatTanggal = (val: string) => {
  try {
    if (!val) return '-'

    const [year, month, day] = val.substring(0, 10).split('-').map(Number)
    const date = new Date(year, month - 1, day) 

    return format(date, 'dd MMMM yyyy', { locale: id })
  } catch {
    return val
  }
}

// Tambahkan fungsi ini di luar komponen (di atas export default)
const getBase64Image = (url: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('/image/png'))
    }
    img.onerror = () => resolve('') // fallback kosong kalau gagal
    img.src = url
  })
}

const toNum = (v: unknown): number => {
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

export default function RiwayatPage() {
  const [data, setData]             = useState<RiwayatRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [notaModal, setNotaModal]   = useState<NotaDetail | null>(null)
  const [loadingNotaId, setLoadingNotaId] = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search)       params.set('search', search)
    if (filterStatus) params.set('status', filterStatus)
    const res  = await fetch(`/api/pelanggan/riwayat?${params}`)
    const json = await res.json()
    if (json.success) setData(json.data)
    setLoading(false)
  }, [search, filterStatus])

  useEffect(() => { fetchData() }, [fetchData])

  // Ganti handleLihatNota
  const handleLihatNota = async (id_nota: number) => {
    setLoadingNotaId(id_nota)
    const res  = await fetch(`/api/pelanggan/nota/${id_nota}`)
    const json = await res.json()
    if (json.success) setNotaModal(json.data)
    setLoadingNotaId(null)
  }

  const getSisaHari = (jatuh_tempo: string | null): number | null => {
  if (!jatuh_tempo) return null

  try {
    const [year, month, day] = jatuh_tempo.substring(0, 10).split('-').map(Number)

    const today = new Date()
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    const jtMid = new Date(year, month - 1, day)

    const diffMs = jtMid.getTime() - todayMid.getTime()
    return Math.round(diffMs / (1000 * 60 * 60 * 24))
  } catch {
    return null
  }
}
  

const handleCetak = async () => {
  if (!notaModal) return

  const { nota, detail } = notaModal
  const jasaItems = detail.filter(d => d.jenis_item === 'jasa')
  const spareItems = detail.filter(d => d.jenis_item === 'sparepart')
  const logoBase64 = await getBase64Image('/logo-hitam.png')

  // Hitung running total
  let runningJasa = 0
  const jasaRows = jasaItems.map((d, i) => {
    runningJasa += Number(d.subtotal)  // ← pastikan Number()
    return `<tr>
      <td style="padding:5px 8px;color:#78716c;vertical-align:top;">${i === 0 ? 'Jasa' : ''}</td>
      <td style="padding:5px 8px;">${d.nama_item}</td>
      <td style="padding:5px 8px;text-align:center;">${d.qty}</td>
      <td style="padding:5px 8px;text-align:right;">Rp ${Number(d.harga).toLocaleString('id-ID')}</td>
      <td style="padding:5px 8px;text-align:right;">Rp ${Number(d.subtotal).toLocaleString('id-ID')}</td>
    </tr>`
  }).join('')

  let runningSpare = 0
  const spareRows = spareItems.map((d, i) => {
    runningSpare += Number(d.subtotal)  // ← variabel terpisah
    return `<tr>
      <td style="padding:5px 8px;color:#78716c;vertical-align:top;">${i === 0 ? 'Part' : ''}</td>
      <td style="padding:5px 8px;">${d.nama_item}</td>
      <td style="padding:5px 8px;text-align:center;">${d.qty}</td>
      <td style="padding:5px 8px;text-align:right;">Rp ${Number(d.harga).toLocaleString('id-ID')}</td>
      <td style="padding:5px 8px;text-align:right;">Rp ${Number(d.subtotal).toLocaleString('id-ID')}</td>
    </tr>`
  }).join('')

  const grandTotalCetak = (totalJasa - diskonJasa) + (totalSparepart - diskonSp)

  const html = `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8"/>
    <title>Nota ${nota.nomor_nota}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: Arial, sans-serif; font-size: 12px; color: #1c1917; padding: 40px 48px; max-width: 720px; margin: 0 auto; }
      @media print {
        body { padding: 24px; }
        @page { margin: 16mm; }
      }
    </style>
  </head>
  <body>
    <!-- Header -->
    <div style="display:flex; align-items:center; justify-content:center; gap:16px; margin-bottom:24px;">
      ${logoBase64 ? `<img src="${logoBase64}" style="width:72px; height:72px; object-fit:contain; flex-shrink:0;" />` : ''}
      <div style="text-align:center;">
        <div style="font-size:18px; font-weight:bold; letter-spacing:1px;">BENGKEL NUGRAHA JAYA</div>
        <div style="font-size:11px; color:#57534e; margin-top:4px;">Jl. Raden Wijaya II/No.2 Sawotratap, Gedangan – Sidoarjo</div>
        <div style="font-size:11px; color:#57534e;">Telp. (031)997782447, (081)1378263</div>
      </div>
    </div>

    <hr style="border:none; border-top:2px solid #1c1917; margin-bottom:16px;"/>

    <!-- Info Grid -->
    <table style="width:100%; margin-bottom:16px; font-size:12px;">
      <tr>
        <td style="width:33%; vertical-align:top; padding-bottom:4px;">
          <div style="margin-bottom:5px;"><span style="font-weight:bold;">No. Nota</span><br/>${nota.nomor_nota}</div>
          <div style="margin-bottom:5px;"><span style="font-weight:bold;">Tanggal</span><br/>${formatTanggal(nota.tanggal_nota)}</div>
          <div><span style="font-weight:bold;">Pelanggan</span><br/>${nota.nama_pelanggan}</div>
        </td>
        <td style="width:33%; vertical-align:top; padding-bottom:4px;">
          <div style="margin-bottom:5px;"><span style="font-weight:bold;">Type/Thn</span><br/>${nota.merk} ${nota.tahun}</div>
          <div style="margin-bottom:5px;"><span style="font-weight:bold;">No. Pol</span><br/>${nota.nomor_polisi}</div>
          <div><span style="font-weight:bold;">KM</span><br/>-</div>
        </td>
        <td style="width:33%; vertical-align:top; padding-bottom:4px;">
          <div style="margin-bottom:5px;"><span style="font-weight:bold;">No. Telp</span><br/>${nota.no_telp}</div>
          <div style="margin-bottom:5px;"><span style="font-weight:bold;">Warna</span><br/>-</div>
          <div><span style="font-weight:bold;">Mekanik</span><br/>${nota.nama_mekanik}</div>
        </td>
      </tr>
    </table>

    <hr style="border:none; border-top:1px solid #d6d3d1; margin-bottom:0;"/>

    <!-- Tabel Item -->
    <table style="width:100%; border-collapse:collapse; font-size:12px; margin-bottom:0;">
      <thead>
        <tr style="border-bottom:1px solid #d6d3d1;">
          <th style="padding:8px; text-align:left; font-weight:normal; color:#57534e; width:12%;">Deskripsi</th>
          <th style="padding:8px; text-align:left; font-weight:normal; color:#57534e;">Nama</th>
          <th style="padding:8px; text-align:center; font-weight:normal; color:#57534e; width:8%;">Qty</th>
          <th style="padding:8px; text-align:right; font-weight:normal; color:#57534e; width:18%;">Harga</th>
          <th style="padding:8px; text-align:right; font-weight:normal; color:#57534e; width:18%;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${jasaRows}
        ${spareRows}
      </tbody>
      <tfoot>
        <tr style="border-top:1px solid #d6d3d1;">
          <td colspan="3"></td>
          <td style="padding:6px 8px; text-align:right; color:#57534e;">Subtotal Jasa</td>
          <td style="padding:6px 8px; text-align:right;">Rp. ${totalJasa.toLocaleString('id-ID')}</td>
        </tr>
        ${diskonJasa > 0 ? `<tr>
          <td colspan="3"></td>
          <td style="padding:6px 8px; text-align:right; color:#16a34a;">Diskon Jasa</td>
          <td style="padding:6px 8px; text-align:right; color:#16a34a;">-Rp. ${diskonJasa.toLocaleString('id-ID')}</td>
        </tr>` : ''}
        ${totalSparepart > 0 ? `<tr>
          <td colspan="3"></td>
          <td style="padding:6px 8px; text-align:right; color:#57534e;">Subtotal Sparepart</td>
          <td style="padding:6px 8px; text-align:right;">Rp. ${totalSparepart.toLocaleString('id-ID')}</td>
        </tr>` : ''}
        ${diskonSp > 0 ? `<tr>
          <td colspan="3"></td>
          <td style="padding:6px 8px; text-align:right; color:#16a34a;">Diskon Part</td>
          <td style="padding:6px 8px; text-align:right; color:#16a34a;">-Rp. ${diskonSp.toLocaleString('id-ID')}</td>
        </tr>` : ''}
        <tr style="border-top:1px solid #d6d3d1;">
          <td colspan="3"></td>
          <td style="padding:8px; text-align:right; font-weight:bold;">Total Pembayaran</td>
          <td style="padding:8px; text-align:right; font-weight:bold;">Rp. ${grandTotalCetak.toLocaleString('id-ID')}</td>
        </tr>
      </tfoot>
    </table>

    <hr style="border:none; border-top:1px solid #d6d3d1; margin-bottom:12px;"/>

    <!-- Footer Pembayaran -->
    <div style="font-size:11px;">
      <div style="font-weight:bold; margin-bottom:6px;">Pembayaran Via ${nota.metode_pembayaran ? nota.metode_pembayaran.charAt(0).toUpperCase() + nota.metode_pembayaran.slice(1) : 'Transfer'}</div>
      <div style="display:flex; gap:40px; color:#57534e;">
        <div>Bank Mandiri A/n CV.NUGRAHA JAYA<br/>A/C 1410-01416-4990</div>
        <div>Bank BCA A/n DIAN TRIANA<br/>A/C 720-5264-787</div>
      </div>
    </div>
  </body>
  </html>`

  const printWindow = window.open('', '_blank', 'width=800,height=700')
  if (!printWindow) return
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => {
    printWindow.print()
    printWindow.close()
  }, 300)
}

  // Hitung total dari detail nota
  const totalJasa      = notaModal?.detail.filter(d => d.jenis_item === 'jasa').reduce((s, d) => s + toNum(d.subtotal), 0) ?? 0
  const totalSparepart = notaModal?.detail.filter(d => d.jenis_item === 'sparepart').reduce((s, d) => s + toNum(d.subtotal), 0) ?? 0
  const diskonJasa     = toNum(notaModal?.nota.diskon_jasa)
  const diskonSp       = toNum(notaModal?.nota.diskon_sparepart)
  const grandTotal     = (totalJasa - diskonJasa) + (totalSparepart - diskonSp)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-stone-900">Riwayat Servis</h2>
        <p className="text-stone-500 text-sm mt-1">Semua riwayat servis kendaraan Anda</p>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari plat nomor atau merk kendaraan..."
            className="w-full pl-9 pr-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <div className="relative">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="appearance-none pl-4 pr-9 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-stone-700">
            <option value="">Semua Status</option>
            <option value="selesai">Selesai</option>
            <option value="ditolak">Ditolak</option>
            <option value="dibatalkan">Dibatalkan</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-stone-400 text-sm">Memuat riwayat...</div>
      ) : data.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-12 text-center text-stone-400">
          <Car className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Belum ada riwayat servis</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map(b => {
            const cfg     = statusConfig[b.status_booking] ?? { label: b.status_booking, color: 'bg-stone-100 text-stone-500', icon: Car }
            const Icon    = cfg.icon
            const isSelesai = b.status_booking === 'selesai'
            const sisaHari  = getSisaHari(b.jatuh_tempo)

            return (
              <div key={b.id_booking} className="bg-white border border-stone-200 rounded-xl p-5">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
                    ${isSelesai ? 'bg-green-100' : 'bg-stone-100'}`}>
                    <Icon className={`w-5 h-5 ${isSelesai ? 'text-green-600' : 'text-stone-400'}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
                      <div>
                        <div className="font-semibold text-stone-900">{b.merk} {b.tahun}</div>
                        <div className="text-xs text-stone-400">{b.nomor_polisi}</div>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>

                    <div className="text-xs text-stone-500 line-clamp-2 mb-2">{b.keluhan}</div>

                    <div className="flex items-center gap-3 text-xs text-stone-400">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-4 h-4" />
                        {formatTanggal(b.tanggal_booking)}
                      </span>

                      {b.nama_mekanik && (
                        <span className="flex items-center gap-1">
                          <UserCog className="w-4 h-4" />
                          {b.nama_mekanik}
                        </span>
                      )}
                    </div>

                    {/* Nota info + tombol */}
                    {isSelesai && b.id_nota && (
                      <div className="border border-stone-100 rounded-xl p-3 bg-stone-50">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            {b.total_biaya && (
                              <div className="font-bold text-stone-800">{formatRupiah(b.total_biaya)}</div>
                            )}
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${b.status_pembayaran === 'lunas' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                {b.status_pembayaran === 'lunas' ? '✓ Lunas' : 'Belum Lunas'}
                              </span>
                              {/* Countdown jatuh tempo */}
                              {b.status_pembayaran !== 'lunas' && sisaHari !== null && (
                                <span className={`text-xs font-medium flex items-center gap-1 ${sisaHari < 0 ? 'text-red-600' : sisaHari <= 3 ? 'text-amber-600' : 'text-stone-400'}`}>
                                  <Clock className="w-3 h-3" />
                                  {sisaHari < 0 ? `Terlambat ${Math.abs(sisaHari)} hari` : sisaHari === 0 ? 'Jatuh tempo hari ini' : `${sisaHari} hari lagi`}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleLihatNota(b.id_nota!)}
                            disabled={loadingNotaId === b.id_nota}
                            className="flex items-center gap-1.5 px-3 py-2 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-800 disabled:opacity-60 transition-colors flex-shrink-0">
                            <Receipt className="w-3.5 h-3.5" />
                            {loadingNotaId === b.id_nota ? 'Memuat...' : 'Lihat Nota'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal Nota ─────────────────────────────────────── */}
      {notaModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Header modal */}
            <div className="p-5 border-b border-stone-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-semibold text-stone-900">Detail Nota</h3>
                <p className="text-xs text-stone-400 font-mono mt-0.5">{notaModal.nota.nomor_nota}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleCetak}
                  className="flex items-center gap-1.5 px-3 py-2 border border-stone-200 text-stone-600 rounded-lg text-xs font-medium hover:bg-stone-50 transition-colors">
                  <Printer className="w-3.5 h-3.5" /> Cetak
                </button>
                <button onClick={() => setNotaModal(null)} className="text-stone-400 hover:text-stone-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Konten nota */}
            <div className="flex-1 overflow-y-auto p-5" id="nota-cetak">
              {/* Header nota */}
              <div className="text-center border-b border-stone-200 pb-4 mb-4">
                <div className="font-bold text-lg text-stone-900">BENGKEL NUGRAHA JAYA</div>
                <div className="text-xs text-stone-400 mt-0.5">Sidoarjo, Jawa Timur</div>
              </div>

              {/* Info */}
              <div className="grid grid-cols-2 gap-x-6 text-xs text-stone-600 mb-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between gap-2">
                    <span className="text-stone-400">No. Nota</span>
                    <span className="font-mono font-bold">{notaModal.nota.nomor_nota}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-stone-400">Tanggal</span>
                    <span>{formatTanggal(notaModal.nota.tanggal_nota)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-stone-400">Mekanik</span>
                    <span className="font-medium">{notaModal.nota.nama_mekanik}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between gap-2">
                    <span className="text-stone-400">Pelanggan</span>
                    <span className="font-medium">{notaModal.nota.nama_pelanggan}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-stone-400">Kendaraan</span>
                    <span>{notaModal.nota.merk} {notaModal.nota.tahun}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-stone-400">Plat</span>
                    <span className="font-mono">{notaModal.nota.nomor_polisi}</span>
                  </div>
                </div>
              </div>

              {/* Jatuh tempo */}
              {notaModal.nota.jatuh_tempo && (
                <div
                  className={`text-xs px-3 py-2 rounded-lg mb-4 flex items-center justify-between
                    ${notaModal.nota.status_pembayaran === 'lunas'
                      ? 'bg-green-50 text-green-700'
                      : getSisaHari(notaModal.nota.jatuh_tempo) !== null &&
                        getSisaHari(notaModal.nota.jatuh_tempo)! <= 11
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-700'
                    }`}
                >
                  <span>
                    Jatuh Tempo: <strong>{formatTanggal(notaModal.nota.jatuh_tempo)}</strong>
                  </span>

                  {notaModal.nota.status_pembayaran !== 'lunas' && (() => {
                    const sisa = getSisaHari(notaModal.nota.jatuh_tempo)
                    if (sisa === null) return null

                    return (
                      <span className="font-bold flex items-center gap-1 text-red-600">
                        <Clock className="w-3 h-3" />
                        {sisa < 0
                          ? `Terlambat ${Math.abs(sisa)} hari`
                          : sisa === 0
                            ? 'Hari ini'
                            : `${sisa} hari lagi`}
                      </span>
                    )
                  })()}
                </div>
              )}

              {/* Tabel item */}
              <table className="w-full text-xs mb-4">
                <thead>
                  <tr className="border-b border-t border-stone-300">
                    <th className="py-2 text-left text-stone-600">Item</th>
                    <th className="py-2 text-right text-stone-600">Qty</th>
                    <th className="py-2 text-right text-stone-600">Harga</th>
                    <th className="py-2 text-right text-stone-600">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {/* Jasa */}
                  {notaModal.detail.filter(d => d.jenis_item === 'jasa').length > 0 && (
                    <tr><td colSpan={4} className="py-1.5 text-stone-400 font-medium">Jasa Servis</td></tr>
                  )}
                  {notaModal.detail.filter(d => d.jenis_item === 'jasa').map(d => (
                    <tr key={d.id_detail_nota}>
                      <td className="py-1.5 text-stone-700">{d.nama_item}</td>
                      <td className="py-1.5 text-right">{d.qty}</td>
                      <td className="py-1.5 text-right">{formatRupiah(toNum(d.harga))}</td>
                      <td className="py-1.5 text-right font-medium">{formatRupiah(toNum(d.subtotal))}</td>
                    </tr>
                  ))}
                  {/* Sparepart */}
                  {notaModal.detail.filter(d => d.jenis_item === 'sparepart').length > 0 && (
                    <tr><td colSpan={4} className="py-1.5 text-stone-400 font-medium pt-2">Sparepart</td></tr>
                  )}
                  {notaModal.detail.filter(d => d.jenis_item === 'sparepart').map(d => (
                    <tr key={d.id_detail_nota}>
                      <td className="py-1.5 text-stone-700">{d.nama_item}</td>
                      <td className="py-1.5 text-right">{d.qty}</td>
                      <td className="py-1.5 text-right">{formatRupiah(toNum(d.harga))}</td>
                      <td className="py-1.5 text-right font-medium">{formatRupiah(toNum(d.subtotal))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-stone-200">
                  <tr>
                    <td colSpan={3} className="py-1.5 text-right text-stone-500">Subtotal Jasa</td>
                    <td className="py-1.5 text-right">{formatRupiah(totalJasa)}</td>
                  </tr>
                  {diskonJasa > 0 && (
                    <tr>
                      <td colSpan={3} className="py-1 text-right text-green-600">Diskon Jasa</td>
                      <td className="py-1 text-right text-green-600">-{formatRupiah(diskonJasa)}</td>
                    </tr>
                  )}
                  {totalSparepart > 0 && (
                    <tr>
                      <td colSpan={3} className="py-1.5 text-right text-stone-500">Subtotal Sparepart</td>
                      <td className="py-1.5 text-right">{formatRupiah(totalSparepart)}</td>
                    </tr>
                  )}
                  {diskonSp > 0 && (
                    <tr>
                      <td colSpan={3} className="py-1 text-right text-green-600">Diskon Sparepart</td>
                      <td className="py-1 text-right text-green-600">-{formatRupiah(diskonSp)}</td>
                    </tr>
                  )}
                  <tr className="border-t-2 border-stone-800 font-bold">
                    <td colSpan={3} className="py-2 text-right">TOTAL</td>
                    <td className="py-2 text-right text-orange-600 text-base">{formatRupiah(grandTotal)}</td>
                  </tr>
                </tfoot>
              </table>

              {/* Status pembayaran */}
              <div className="border-t border-stone-100 pt-3 flex items-center justify-between text-xs">
                <div className="space-y-1 text-stone-500">
                  <div>Metode: <span className="font-medium capitalize">{notaModal.nota.metode_pembayaran}</span></div>
                  {notaModal.nota.tanggal_pembayaran && (
                    <div>Dibayar: <span className="font-medium">{formatTanggal(notaModal.nota.tanggal_pembayaran)}</span></div>
                  )}
                </div>
                <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${notaModal.nota.status_pembayaran === 'lunas' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {notaModal.nota.status_pembayaran === 'lunas' ? '✓ LUNAS' : 'BELUM LUNAS'}
                </span>
              </div>

              <div className="text-center text-xs text-stone-300 mt-4 pt-4 border-t border-stone-100">
                Terima kasih telah mempercayakan kendaraan Anda kepada kami
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
