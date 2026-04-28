'use client'

import { useState, useEffect, useCallback } from 'react'
import { PhoneCall, CheckCircle2, Clock, Building2, User, Receipt, X, ChevronDown, Printer, Search, Phone, Check } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'

interface FollowUpRow {
  id_pelanggan: number
  nama_pelanggan: string
  jenis_pelanggan: string
  nama_perusahaan: string | null
  no_telp: string
  nomor_polisi: string
  merk: string
  id_servis: number
  tanggal_selesai: string
  hari_sejak_selesai: number
  id_booking: number
  id_nota: number | null
  total_biaya: number | null
  status_pembayaran: string | null
  jasa_servis: string | null
  sparepart_digunakan: string | null
  keluhan_servis: string | null
  kategori_followup: '3_hari' | '3_bulan' | '6_bulan'
  status_followup: string | null
  id_followup: number | null
  tanggal_followup: string | null
}

interface Summary {
  tiga_hari: number
  tiga_bulan: number
  enam_bulan: number
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
  }
  detail: {
    id_detail_nota: number
    nama_item: string
    jenis_item: string
    harga: number
    qty: number
    subtotal: number
  }[]
}

const kategoriConfig = {
  '3_hari':  { label: '3 Hari Setelah Servis',   color: 'bg-blue-100 text-blue-700',     badge: 'bg-blue-600' },
  '3_bulan': { label: '3 Bulan Setelah Servis',   color: 'bg-purple-100 text-purple-700', badge: 'bg-purple-600' },
  '6_bulan': { label: '6 Bulan Setelah Servis',   color: 'bg-amber-100 text-amber-700',   badge: 'bg-amber-600' },
}

const toNum = (v: unknown): number => {
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

// Pesan WA dengan detail kendaraan, keluhan, jasa, sparepart
const buildPesanWA = (row: FollowUpRow): string => {
  const kendaraan = `${row.merk} (${row.nomor_polisi})`
  const tglSelesai = (() => {
    try {
      const d = row.tanggal_selesai.includes('T')
        ? parseISO(row.tanggal_selesai)
        : parseISO(row.tanggal_selesai + 'T00:00:00')
      return format(d, 'dd MMMM yyyy', { locale: id })
    } catch { return row.tanggal_selesai }
  })()

  const jasaLine      = row.jasa_servis ? `\n🔧 Jasa: ${row.jasa_servis}` : ''
  const sparepartLine = row.sparepart_digunakan ? `\n🔩 Sparepart: ${row.sparepart_digunakan}` : ''
  const keluhanLine   = row.keluhan_servis ? `\n📋 Keluhan: ${row.keluhan_servis}` : ''

  if (row.kategori_followup === '3_hari') {
    return (
      `Halo Bapak/Ibu ${row.nama_pelanggan} 😊\n\n` +
      `Terima kasih telah mempercayakan kendaraan Anda kepada *Bengkel Nugraha Jaya*.\n\n` +
      `Kami ingin memastikan kondisi kendaraan Anda setelah servis pada ${tglSelesai}:\n` +
      `🚗 Kendaraan: ${kendaraan}` +
      keluhanLine +
      jasaLine +
      sparepartLine +
      `\n\nBagaimana kondisi kendaraan Anda? Apakah sudah terasa lebih baik? ` +
      `Bila ada kendala atau pertanyaan, jangan ragu untuk menghubungi kami. ` +
      `Kami siap membantu! 🙏`
    )
  }

  if (row.kategori_followup === '3_bulan') {
    return (
      `Halo Bapak/Ibu ${row.nama_pelanggan} 😊\n\n` +
      `Sudah 3 bulan sejak kendaraan Anda diservis di *Bengkel Nugraha Jaya* (${tglSelesai}).\n\n` +
      `🚗 Kendaraan: ${kendaraan}` +
      jasaLine +
      `\n\nSaatnya pengecekan rutin! Kami merekomendasikan pemeriksaan berkala untuk menjaga performa kendaraan Anda tetap optimal. ` +
      `Hubungi kami untuk reservasi 🔧`
    )
  }

  // 6_bulan
  return (
    `Halo Bapak/Ibu ${row.nama_pelanggan} 😊\n\n` +
    `Sudah 6 bulan sejak servis terakhir kendaraan Anda di *Bengkel Nugraha Jaya* (${tglSelesai}).\n\n` +
    `🚗 Kendaraan: ${kendaraan}` +
    jasaLine +
    `\n\nJangan lupa jadwalkan perawatan berkala kendaraan Anda agar tetap prima dan aman di jalan! ` +
    `Kami siap melayani Anda dengan sepenuh hati. 🚗✨`
  )
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

const formatTanggal = (val: string) => {
  try {
    const date = val.includes('T') ? parseISO(val) : parseISO(val + 'T00:00:00')
    return format(date, 'dd MMM yyyy', { locale: id })
  } catch { return val }
}

const getBase64Image = (url: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width; canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => resolve('')
    img.src = url
  })
}

export default function AdminFollowUpPage() {
  const [data, setData]               = useState<FollowUpRow[]>([])
  const [summary, setSummary]         = useState<Summary | null>(null)
  const [loading, setLoading]         = useState(true)
  const [filterKategori, setFilterKategori] = useState('')
  const [search, setSearch]           = useState('')
  const [notaModal, setNotaModal]     = useState<NotaDetail | null>(null)
  const [loadingNota, setLoadingNota] = useState(false)
  const [tandaiId, setTandaiId]       = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterKategori) params.set('kategori', filterKategori)
    if (search)         params.set('search', search)
    const res  = await fetch(`/api/admin/follow-up?${params}`)
    const json = await res.json()
    if (json.success) { setData(json.data); setSummary(json.summary) }
    setLoading(false)
  }, [filterKategori, search])

  useEffect(() => { fetchData() }, [fetchData])

  const handleTandai = async (row: FollowUpRow) => {
    setTandaiId(row.id_servis)
    await fetch('/api/admin/follow-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_pelanggan:   row.id_pelanggan,
        id_servis:      row.id_servis,        // ← penting: kirim id_servis
        jenis_followup: row.kategori_followup,
        id_followup:    row.id_followup ?? null,
      }),
    })
    setTandaiId(null)
    fetchData()
  }

  const handleLihatNota = async (id_nota: number) => {
  setLoadingNota(true)
  const res  = await fetch(`/api/admin/nota/${id_nota}`)
  const json = await res.json()
  if (json.success) {
    console.log('detail dari API:', json.data.detail) // ← tambah ini
    setNotaModal(json.data)
  }
  setLoadingNota(false)
}

  const handleWhatsApp = (row: FollowUpRow) => {
    const noTelp = row.no_telp.replace(/\D/g, '').replace(/^0/, '62')
    const pesan  = buildPesanWA(row)
    window.open(`https://wa.me/${noTelp}?text=${encodeURIComponent(pesan)}`, '_blank')
  }

  const handleCetak = async () => {
    if (!notaModal) return
    const { nota, detail } = notaModal
    const logoBase64 = await getBase64Image('/logo-hitam.png')
    const jasaItems  = detail.filter(d => d.jenis_item === 'jasa')
    const spareItems = detail.filter(d => d.jenis_item === 'sparepart')
    const totalJasaCetak      = jasaItems.reduce((s, d) => s + Number(d.subtotal), 0)
    const totalSparepartCetak = spareItems.reduce((s, d) => s + Number(d.subtotal), 0)
    const diskonJasa  = Number(nota.diskon_jasa ?? 0)
    const diskonSp    = Number(nota.diskon_sparepart ?? 0)
    const grandTotalCetak = (totalJasaCetak - diskonJasa) + (totalSparepartCetak - diskonSp)

    const jasaRows = jasaItems.map((d, i) => `<tr>
      <td style="padding:5px 8px;color:#78716c;vertical-align:top;">${i === 0 ? 'Jasa' : ''}</td>
      <td style="padding:5px 8px;">${d.nama_item}</td>
      <td style="padding:5px 8px;text-align:center;">${d.qty}</td>
      <td style="padding:5px 8px;text-align:right;">Rp. ${Number(d.harga).toLocaleString('id-ID')}</td>
      <td style="padding:5px 8px;text-align:right;">Rp. ${Number(d.subtotal).toLocaleString('id-ID')}</td>
    </tr>`).join('')

    const spareRows = spareItems.map((d, i) => `<tr>
      <td style="padding:5px 8px;color:#78716c;vertical-align:top;">${i === 0 ? 'Part' : ''}</td>
      <td style="padding:5px 8px;">${d.nama_item}</td>
      <td style="padding:5px 8px;text-align:center;">${d.qty}</td>
      <td style="padding:5px 8px;text-align:right;">Rp. ${Number(d.harga).toLocaleString('id-ID')}</td>
      <td style="padding:5px 8px;text-align:right;">Rp. ${Number(d.subtotal).toLocaleString('id-ID')}</td>
    </tr>`).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <title>Nota ${nota.nomor_nota}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #1c1917; padding: 32px; max-width: 680px; margin: 0 auto; }
        @media print {
          body { padding: 16px; }
          @page { margin: 12mm; size: A4; }
          .no-print { display: none !important; }
        }
        .btn-print {
          display: block;
          margin: 16px auto 0;
          padding: 10px 24px;
          background: #1c1917;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
    <div class="no-print" style="text-align:center; margin-bottom:16px;">
      <button class="btn-print" onclick="window.print()">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:6px;">
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        Cetak / Simpan PDF
      </button>
    </div>
    <div style="display:flex; align-items:center; justify-content:center; gap:16px; margin-bottom:24px;">
      ${logoBase64 ? `<img src="${logoBase64}" style="width:72px; height:72px; object-fit:contain;" />` : ''}
      <div style="text-align:center;">
        <div style="font-size:18px; font-weight:bold;">BENGKEL NUGRAHA JAYA</div>
        <div style="font-size:11px; color:#57534e; margin-top:4px;">Jl. Raden Wijaya II/No.2 Sawotratap, Gedangan – Sidoarjo</div>
        <div style="font-size:11px; color:#57534e;">Telp. (031)997782447, (081)1378263</div>
      </div>
    </div>
    <hr style="border:none; border-top:2px solid #1c1917; margin-bottom:16px;"/>
    <table style="width:100%; margin-bottom:16px; font-size:12px;"><tr>
      <td style="width:33%; vertical-align:top;">
        <div style="margin-bottom:5px;"><b>No. Nota</b><br/>${nota.nomor_nota}</div>
        <div style="margin-bottom:5px;"><b>Tanggal</b><br/>${formatTanggal(nota.tanggal_nota)}</div>
        <div><b>Pelanggan</b><br/>${nota.nama_pelanggan}</div>
      </td>
      <td style="width:33%; vertical-align:top;">
        <div style="margin-bottom:5px;"><b>Kendaraan</b><br/>${nota.merk} ${nota.tahun}</div>
        <div style="margin-bottom:5px;"><b>No. Pol</b><br/>${nota.nomor_polisi}</div>
        <div><b>KM</b><br/>-</div>
      </td>
      <td style="width:33%; vertical-align:top;">
        <div style="margin-bottom:5px;"><b>Mekanik</b><br/>${nota.nama_mekanik}</div>
        <div style="margin-bottom:5px;"><b>Metode</b><br/>${nota.metode_pembayaran}</div>
        <div><b>Status</b><br/>${nota.status_pembayaran === 'lunas' ? 'LUNAS' : 'BELUM LUNAS'}</div>
      </td>
    </tr></table>
    <hr style="border:none; border-top:1px solid #d6d3d1; margin-bottom:0;"/>
    <table style="width:100%; border-collapse:collapse; font-size:12px;">
      <thead><tr style="border-bottom:1px solid #d6d3d1;">
        <th style="padding:8px; text-align:left; font-weight:normal; color:#57534e; width:12%;">Deskripsi</th>
        <th style="padding:8px; text-align:left; font-weight:normal; color:#57534e;">Nama</th>
        <th style="padding:8px; text-align:center; font-weight:normal; color:#57534e; width:8%;">Qty</th>
        <th style="padding:8px; text-align:right; font-weight:normal; color:#57534e; width:18%;">Harga</th>
        <th style="padding:8px; text-align:right; font-weight:normal; color:#57534e; width:18%;">Total</th>
      </tr></thead>
      <tbody>${jasaRows}${spareRows}</tbody>
      <tfoot>
        <tr style="border-top:1px solid #d6d3d1;">
          <td colspan="3"></td>
          <td style="padding:6px 8px; text-align:right; color:#57534e;">Subtotal Jasa</td>
          <td style="padding:6px 8px; text-align:right;">Rp. ${totalJasaCetak.toLocaleString('id-ID')}</td>
        </tr>
        ${diskonJasa > 0 ? `<tr>
          <td colspan="3"></td>
          <td style="padding:6px 8px; text-align:right; color:#16a34a;">Diskon Jasa</td>
          <td style="padding:6px 8px; text-align:right; color:#16a34a;">-Rp. ${diskonJasa.toLocaleString('id-ID')}</td>
          </tr>` : ''}
          ${totalSparepartCetak > 0 ? `<tr>
            <td colspan="3"></td>
            <td style="padding:6px 8px; text-align:right; color:#57534e;">Subtotal Sparepart</td>
            <td style="padding:6px 8px; text-align:right;">Rp. ${totalSparepartCetak.toLocaleString('id-ID')}</td>
          </tr>` : ''}
          ${diskonSp > 0 ? `<tr>
            <td colspan="3"></td>
            <td style="padding:6px 8px; text-align:right; color:#16a34a;">Diskon Sparepart</td>
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
    <div style="font-size:11px;">
      <div style="font-weight:bold; margin-bottom:6px;">Pembayaran Via ${nota.metode_pembayaran ? nota.metode_pembayaran.charAt(0).toUpperCase() + nota.metode_pembayaran.slice(1) : 'Transfer'}</div>
      <div style="display:flex; gap:40px; color:#57534e;">
        <div>Bank Mandiri A/n CV.NUGRAHA JAYA<br/>A/C 1410-01416-4990</div>
        <div>Bank BCA A/n DIAN TRIANA<br/>A/C 720-5264-787</div>
      </div>
    </div>
    <div style="text-align:center; font-size:11px; color:#d6d3d1; margin-top:24px; padding-top:12px; border-top:1px solid #e7e5e4;">Terima kasih telah mempercayakan kendaraan Anda kepada kami</div>
    </body></html>`

     // Gunakan Blob URL — bisa di-preview di HP dan bisa disimpan sebagai PDF
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href   = url
    a.target = '_blank'
    a.rel    = 'noopener noreferrer'
    a.click()

    // Cleanup URL setelah 60 detik
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  const sudahDihubungi = data.filter(d => d.status_followup === 'sudah_dihubungi').length
  const belumDihubungi = data.filter(d => d.status_followup !== 'sudah_dihubungi').length
  const totalJasa = notaModal?.detail
    .filter(d => d.jenis_item?.trim().toLowerCase() === 'jasa')
    .reduce((s, d) => s + toNum(d.subtotal), 0) ?? 0

  const totalSparepart = notaModal?.detail
    .filter(d => d.jenis_item?.trim().toLowerCase() === 'sparepart')
    .reduce((s, d) => s + toNum(d.subtotal), 0) ?? 0

  const grandTotal = (totalJasa - toNum(notaModal?.nota.diskon_jasa)) 
                  + (totalSparepart - toNum(notaModal?.nota.diskon_sparepart))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-stone-900">Follow-Up Pelanggan</h2>
        <p className="text-stone-500 text-sm mt-1">Hubungi pelanggan pasca servis berdasarkan kategori waktu</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-stone-900">{data.length}</div>
          <div className="text-xs text-stone-500 mt-1">Total Perlu Follow-Up</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">{summary?.tiga_hari ?? 0}</div>
          <div className="text-xs text-blue-600 mt-1">3 Hari</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-700">{summary?.tiga_bulan ?? 0}</div>
          <div className="text-xs text-purple-600 mt-1">3 Bulan</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-amber-700">{summary?.enam_bulan ?? 0}</div>
          <div className="text-xs text-amber-600 mt-1">6 Bulan</div>
        </div>
      </div>

      {belumDihubungi > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
          <PhoneCall className="w-5 h-5 text-orange-600 flex-shrink-0" />
          <p className="text-sm text-orange-800">
            <strong>{belumDihubungi} pelanggan</strong> belum dihubungi ·{' '}
            <span className="text-orange-600">{sudahDihubungi} sudah dihubungi</span>
          </p>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input placeholder="Cari nama pelanggan atau nomor polisi..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <div className="relative w-56">
          <select value={filterKategori} onChange={e => setFilterKategori(e.target.value)}
            className="w-full appearance-none pl-4 pr-9 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-stone-700">
            <option value="">Semua Kategori</option>
            <option value="3_hari">3 Hari Setelah Servis</option>
            <option value="3_bulan">3 Bulan Setelah Servis</option>
            <option value="6_bulan">6 Bulan Setelah Servis</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
        </div>
      </div>

      
      {/* Tabel */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-800">
                {['Nama Pelanggan','Kendaraan','Tipe','Jasa Servis','Tanggal Selesai','Kategori','No. WhatsApp','Aksi'].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-stone-100 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-stone-400 text-sm">Memuat data...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-stone-400">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-300" />
                  <p>Tidak ada pelanggan yang perlu di-follow up</p>
                </td></tr>
              ) : data.map(row => {
                const cfg   = kategoriConfig[row.kategori_followup]
                const sudah = row.status_followup === 'sudah_dihubungi'
                return (
                  <tr key={`${row.id_servis}-${row.kategori_followup}`}
                    className={`hover:bg-stone-50 transition-colors ${sudah ? 'opacity-60' : ''}`}>
                    <td className="px-5 py-4">
                      <div className="font-medium text-stone-900">{row.nama_pelanggan}</div>
                      {row.jenis_pelanggan === 'perusahaan' && row.nama_perusahaan && (
                        <div className="text-xs text-stone-400">{row.nama_perusahaan}</div>
                      )}
                      {sudah && (
                        <div className="text-xs text-green-600 mt-0.5 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Dihubungi {row.tanggal_followup ? formatTanggal(row.tanggal_followup) : ''}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-medium text-stone-800 text-sm">{row.merk}</div>
                      <div className="font-mono text-xs text-stone-400">{row.nomor_polisi}</div>
                    </td>
                    <td className="px-5 py-4">
                      {row.jenis_pelanggan === 'perusahaan' ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                          <Building2 className="w-3 h-3" /> Perusahaan
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-medium">
                          <User className="w-3 h-3" /> Individu
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 max-w-[180px]">
                      <p className="text-stone-700 text-xs line-clamp-2">{row.jasa_servis ?? '—'}</p>
                      {row.sparepart_digunakan && (
                        <p className="text-stone-400 text-xs line-clamp-1 mt-0.5">{row.sparepart_digunakan}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="text-stone-800">{formatTanggal(row.tanggal_selesai)}</div>
                      <div className="text-xs text-stone-400">{row.hari_sejak_selesai} hari lalu</div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm text-stone-700">{row.no_telp}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2 flex-nowrap">
                        {row.id_nota && (
                          <button onClick={() => handleLihatNota(row.id_nota!)} disabled={loadingNota}
                            title="Lihat Nota"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 shrink-0">
                            <Receipt className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => handleWhatsApp(row)} title="Buka WhatsApp"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 shrink-0">
                          <Phone className="w-4 h-4" />
                        </button>
                        <button onClick={() => !sudah && handleTandai(row)}
                          disabled={sudah || tandaiId === row.id_servis}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0
                            ${sudah ? 'bg-green-100 text-green-700 cursor-default' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}>
                          {sudah ? <Check className="w-4 h-4" /> : tandaiId === row.id_servis ? <span className="text-[10px]">Menyimpan...</span> : <Clock className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nota */}
      {notaModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-semibold text-stone-900">Detail Nota</h3>
                <p className="text-xs text-stone-400 font-mono mt-0.5">{notaModal.nota.nomor_nota}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleCetak}
                  className="flex items-center gap-1.5 px-3 py-2 border border-stone-200 text-stone-600 rounded-lg text-xs font-medium hover:bg-stone-50">
                  <Printer className="w-3.5 h-3.5" /> Cetak
                </button>
                <button onClick={() => setNotaModal(null)} className="text-stone-400 hover:text-stone-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="text-center border-b border-stone-200 pb-4 mb-4">
                <div className="font-bold text-lg text-stone-900">BENGKEL NUGRAHA JAYA</div>
                <div className="text-xs text-stone-400 mt-0.5">Sidoarjo, Jawa Timur</div>
              </div>
              <div className="grid grid-cols-2 gap-x-6 text-xs text-stone-600 mb-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between gap-2"><span className="text-stone-400">No. Nota</span><span className="font-mono font-bold">{notaModal.nota.nomor_nota}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-stone-400">Tanggal</span><span>{formatTanggal(notaModal.nota.tanggal_nota)}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-stone-400">Mekanik</span><span className="font-medium">{notaModal.nota.nama_mekanik}</span></div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between gap-2"><span className="text-stone-400">Pelanggan</span><span className="font-medium">{notaModal.nota.nama_pelanggan}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-stone-400">Kendaraan</span><span>{notaModal.nota.merk} {notaModal.nota.tahun}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-stone-400">Plat</span><span className="font-mono">{notaModal.nota.nomor_polisi}</span></div>
                </div>
              </div>
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
                  {notaModal.detail.filter(d => String(d.jenis_item).trim().toLowerCase().includes('jasa')).length > 0 && (
                    <tr><td colSpan={4} className="py-1.5 text-stone-400 font-medium">Jasa Servis</td></tr>
                  )}
                  {notaModal.detail.filter(d => String(d.jenis_item).trim().toLowerCase().includes('jasa')).map(d => (
                    <tr key={d.id_detail_nota}>
                      <td className="py-1.5 text-stone-700">{d.nama_item}</td>
                      <td className="py-1.5 text-right">{d.qty}</td>
                      <td className="py-1.5 text-right">{formatRupiah(toNum(d.harga))}</td>
                      <td className="py-1.5 text-right font-medium">{formatRupiah(toNum(d.subtotal))}</td>
                    </tr>
                  ))}

                  {notaModal.detail.filter(d => String(d.jenis_item).trim().toLowerCase().includes('sparepart')).length > 0 && (
                    <tr><td colSpan={4} className="py-1.5 text-stone-400 font-medium pt-2">Sparepart</td></tr>
                  )}
                  {notaModal.detail.filter(d => String(d.jenis_item).trim().toLowerCase().includes('sparepart')).map(d => (
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
                  {toNum(notaModal.nota.diskon_jasa) > 0 && (
                    <tr>
                      <td colSpan={3} className="py-1 text-right text-green-600">Diskon Jasa</td>
                      <td className="py-1 text-right text-green-600">-{formatRupiah(toNum(notaModal.nota.diskon_jasa))}</td>
                    </tr>
                  )}
                  {totalSparepart > 0 && (
                    <tr>
                      <td colSpan={3} className="py-1.5 text-right text-stone-500">Subtotal Sparepart</td>
                      <td className="py-1.5 text-right">{formatRupiah(totalSparepart)}</td>
                    </tr>
                  )}
                  {toNum(notaModal.nota.diskon_sparepart) > 0 && (
                    <tr>
                      <td colSpan={3} className="py-1 text-right text-green-600">Diskon Sparepart</td>
                      <td className="py-1 text-right text-green-600">-{formatRupiah(toNum(notaModal.nota.diskon_sparepart))}</td>
                    </tr>
                  )}
                  <tr className="border-t-2 border-stone-800 font-bold">
                    <td colSpan={3} className="py-2 text-right">TOTAL</td>
                    <td className="py-2 text-right text-orange-600 text-base">{formatRupiah(grandTotal)}</td>
                  </tr>
                </tfoot>
              </table>
              <div className="border-t border-stone-100 pt-3 flex items-center justify-between text-xs">
                <div className="space-y-1 text-stone-500">
                  <div>Metode: <span className="font-medium capitalize">{notaModal.nota.metode_pembayaran}</span></div>
                  {notaModal.nota.tanggal_pembayaran && <div>Dibayar: <span className="font-medium">{formatTanggal(notaModal.nota.tanggal_pembayaran)}</span></div>}
                  {notaModal.nota.jatuh_tempo && <div>Jatuh Tempo: <span className="font-medium">{formatTanggal(notaModal.nota.jatuh_tempo)}</span></div>}
                </div>
                <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${notaModal.nota.status_pembayaran === 'lunas' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {notaModal.nota.status_pembayaran === 'lunas' ? '✓ LUNAS' : 'BELUM LUNAS'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
