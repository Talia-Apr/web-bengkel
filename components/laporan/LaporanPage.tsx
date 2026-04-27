'use client'

import { useState, useCallback, useEffect } from 'react'
import { Download, FileText, TrendingUp, Wallet, AlertCircle, CheckCircle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'

interface LaporanRow {
  id_servis: number
  id_booking: number
  id_nota: number | null
  nama_pelanggan: string
  jenis_pelanggan: string
  nama_perusahaan: string | null
  no_telp: string
  term_of_payment: number | null
  nomor_polisi: string
  merk: string
  tahun: number
  warna: string
  nama_mekanik: string
  tanggal_booking: string
  tanggal_selesai: string
  tanggal_nota: string | null
  tanggal_pembayaran: string | null
  jatuh_tempo: string | null
  total_biaya: number | null
  diskon_jasa: number
  diskon_sparepart: number
  metode_pembayaran: string | null
  status_pembayaran: string | null
  kategori_pembayaran: string
  detail_jasa: string | null
  subtotal_jasa: number
  detail_sparepart: string | null
  subtotal_sparepart: number
}

interface Summary {
  total_servis: number
  total_lunas: number
  total_piutang: number
  total_pendapatan_lunas: number
  total_piutang_amount: number
  total_keseluruhan: number
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

const formatTanggal = (val: string | null) => {
  if (!val) return '—'
  try {
    const date = val.includes('T') ? parseISO(val) : parseISO(val + 'T00:00:00')
    return format(date, 'dd MMM yyyy', { locale: id })
  } catch { return val }
}

const getNamaBulan = (periode: string) => {
  try {
    const date = parseISO(periode + '-01')
    return format(date, 'MMMM yyyy', { locale: id })
  } catch { return periode }
}

interface Props {
  role: 'admin' | 'pemilik'
}

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
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => resolve('')
    img.src = url
  })
}

export default function LaporanPage({ role }: Props) {
  const [periode, setPeriode]   = useState(format(new Date(), 'yyyy-MM'))
  const [data, setData]         = useState<LaporanRow[]>([])
  const [summary, setSummary]   = useState<Summary | null>(null)
  const [loading, setLoading]   = useState(false)
  const [searched, setSearched] = useState(false)

  const fetchData = useCallback(async () => {
    if (!periode) return
    setLoading(true)
    const res  = await fetch(`/api/laporan?periode=${periode}`)
    const json = await res.json()
    if (json.success) { setData(json.data); setSummary(json.summary) }
    setLoading(false)
    setSearched(true)
  }, [periode])

  useEffect(() => { fetchData() }, [fetchData])

  // Export CSV
  const handleExportCSV = () => {
    if (data.length === 0) return

    const headers = [
      'No', 'Nama Pelanggan', 'Tipe Pelanggan', 'No. Telepon',
      'Kendaraan', 'Plat Nomor', 'Mekanik',
      'Tanggal Booking', 'Tanggal Selesai', 'Tanggal Pembayaran', 'Jatuh Tempo',
      'Detail Jasa', 'Subtotal Jasa', 'Diskon Jasa',
      'Detail Sparepart', 'Subtotal Sparepart', 'Diskon Sparepart',
      'Total Biaya', 'Kategori Pembayaran', 'Metode Pembayaran', 'Status Pembayaran'
    ]

    const rows = data.map((r, i) => [
      i + 1,
      r.nama_pelanggan,
      r.jenis_pelanggan === 'perusahaan' ? `Perusahaan (${r.nama_perusahaan ?? ''})` : 'Individu',
      r.no_telp,
      `${r.merk} ${r.tahun}`,
      r.nomor_polisi,
      r.nama_mekanik,
      formatTanggal(r.tanggal_booking),
      formatTanggal(r.tanggal_selesai),
      formatTanggal(r.tanggal_pembayaran),
      formatTanggal(r.jatuh_tempo),
      r.detail_jasa ?? '—',
      r.subtotal_jasa,
      r.diskon_jasa,
      r.detail_sparepart ?? '—',
      r.subtotal_sparepart,
      r.diskon_sparepart,
      r.total_biaya ?? 0,
      r.kategori_pembayaran,
      r.metode_pembayaran ?? '—',
      r.status_pembayaran === 'lunas' ? 'Lunas' : 'Belum Lunas',
    ])

    // Tambah baris total
    rows.push([])
    rows.push(['', '', '', '', '', '', '', '', '', '', '', '', summary?.total_pendapatan_lunas ?? 0, '', '', summary?.total_piutang_amount ?? 0, '', summary?.total_keseluruhan ?? 0, '', '', ''])

    const csvContent = [
      `Laporan Servis Bengkel Nugraha Jaya — ${getNamaBulan(periode)}`,
      '',
      headers.join(','),
      ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `laporan-servis-${periode}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCetak = async () => {
    if (data.length === 0) return

    const logoBase64 = await getBase64Image('/logo-hitam.png')

    const rows = data.map((r, i) => `
      <tr style="border-bottom:1px solid #e7e5e4;">
        <td style="padding:6px 8px;text-align:center;color:#78716c;">${i + 1}</td>
        <td style="padding:6px 8px;">
          <div style="font-weight:600;">${r.nama_pelanggan}</div>
          ${r.jenis_pelanggan === 'perusahaan' && r.nama_perusahaan ? `<div style="font-size:10px;color:#78716c;">${r.nama_perusahaan}</div>` : ''}
          <div style="font-size:10px;color:#78716c;">${r.no_telp}</div>
        </td>
        <td style="padding:6px 8px;">
          <div>${r.merk} ${r.tahun}</div>
          <div style="font-size:10px;font-family:monospace;color:#78716c;">${r.nomor_polisi}</div>
        </td>
        <td style="padding:6px 8px;color:#44403c;">${r.nama_mekanik}</td>
        <td style="padding:6px 8px;white-space:nowrap;color:#44403c;">${formatTanggal(r.tanggal_selesai)}</td>
        <td style="padding:6px 8px;font-size:10px;color:#57534e;max-width:160px;">${r.detail_jasa ?? '—'}</td>
        <td style="padding:6px 8px;text-align:right;">Rp ${r.subtotal_jasa.toLocaleString('id-ID')}</td>
        <td style="padding:6px 8px;text-align:right;color:#16a34a;">${r.diskon_jasa > 0 ? `-Rp ${r.diskon_jasa.toLocaleString('id-ID')}` : '—'}</td>
        <td style="padding:6px 8px;font-size:10px;color:#57534e;max-width:160px;">${r.detail_sparepart ?? '—'}</td>
        <td style="padding:6px 8px;text-align:right;">Rp ${r.subtotal_sparepart.toLocaleString('id-ID')}</td>
        <td style="padding:6px 8px;text-align:right;color:#16a34a;">${r.diskon_sparepart > 0 ? `-Rp ${r.diskon_sparepart.toLocaleString('id-ID')}` : '—'}</td>
        <td style="padding:6px 8px;text-align:right;font-weight:700;">${r.total_biaya ? `Rp ${r.total_biaya.toLocaleString('id-ID')}` : '—'}</td>
        <td style="padding:6px 8px;">
          <span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:999px;
              background:${r.kategori_pembayaran === 'Piutang' ? '#fee2e2' : '#dbeafe'};
              color:${r.kategori_pembayaran === 'Piutang' ? '#dc2626' : '#2563eb'};">
            ${r.kategori_pembayaran}
          </span>
        </td>
        <td style="padding:6px 8px;white-space:nowrap;color:#44403c;">${formatTanggal(r.tanggal_pembayaran)}</td>
        <td style="padding:6px 8px;white-space:nowrap;color:#44403c;">${formatTanggal(r.jatuh_tempo)}</td>
        <td style="padding:6px 8px;">
          <span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:999px;background:${r.status_pembayaran === 'lunas' ? '#dcfce7' : '#fee2e2'};color:${r.status_pembayaran === 'lunas' ? '#16a34a' : '#dc2626'};">
            ${r.status_pembayaran === 'lunas' ? 'Lunas' : 'Belum Lunas'}
          </span>
        </td>
      </tr>
    `).join('')

    const html = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Laporan Servis ${getNamaBulan(periode)}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #1c1917; padding: 32px 40px; }
        @media print { body { padding: 16px; } @page { margin: 10mm; size: landscape; } }
        table { border-collapse: collapse; }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div style="display:flex; align-items:center; gap:16px; margin-bottom:20px; border-bottom:2px solid #1c1917; padding-bottom:16px;">
        ${logoBase64 ? `<img src="${logoBase64}" style="width:64px; height:64px; object-fit:contain; flex-shrink:0;" />` : ''}
        <div>
          <div style="font-size:18px; font-weight:bold; letter-spacing:1px;">BENGKEL NUGRAHA JAYA</div>
          <div style="font-size:11px; color:#57534e; margin-top:2px;">Jl. Raden Wijaya II/No.2 Sawotratap, Gedangan – Sidoarjo</div>
          <div style="font-size:11px; color:#57534e;">Telp. (031)997782447, (081)1378263</div>
        </div>
        <div style="margin-left:auto; text-align:right;">
          <div style="font-size:14px; font-weight:bold; color:#1c1917;">LAPORAN SERVIS</div>
          <div style="font-size:13px; color:#ea580c; font-weight:600; margin-top:2px;">${getNamaBulan(periode)}</div>
          <div style="font-size:10px; color:#78716c; margin-top:2px;">Dicetak: ${format(new Date(), 'dd MMMM yyyy, HH:mm', { locale: id })}</div>
        </div>
      </div>

      <!-- Summary -->
      ${summary ? `
      <div style="display:flex; gap:16px; margin-bottom:20px;">
        <div style="flex:1; background:#f0fdf4; border:1px solid #678ee1; border-radius:8px; padding:10px 14px;">
          <div style="font-size:10px; color:#2563EB; margin-bottom:2px;">Total Servis Selesai</div>
          <div style="font-size:18px; font-weight:bold; color:#2563EB;">${summary.total_servis}</div>
        </div>
        <div style="flex:1; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:10px 14px;">
          <div style="font-size:10px; color:#15803d; margin-bottom:2px;">Pendapatan Lunas (${summary.total_lunas} servis)</div>
          <div style="font-size:15px; font-weight:bold; color:#15803d;">Rp ${summary.total_pendapatan_lunas.toLocaleString('id-ID')}</div>
        </div>
        <div style="flex:1; background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:10px 14px;">
          <div style="font-size:10px; color:#dc2626; margin-bottom:2px;">Piutang (${summary.total_piutang} servis)</div>
          <div style="font-size:15px; font-weight:bold; color:#dc2626;">Rp ${summary.total_piutang_amount.toLocaleString('id-ID')}</div>
        </div>
        <div style="flex:1; background:#fff7ed; border:1px solid #fed7aa; border-radius:8px; padding:10px 14px;">
          <div style="font-size:10px; color:#ea580c; margin-bottom:2px;">Total Keseluruhan</div>
          <div style="font-size:15px; font-weight:bold; color:#ea580c;">Rp ${summary.total_keseluruhan.toLocaleString('id-ID')}</div>
        </div>
      </div>
      ` : ''}

      <!-- Tabel -->
      <table style="width:100%; font-size:10px;">
        <thead>
          <tr style="background:#292524; color:#fff;">
            <th style="padding:8px;text-align:center;width:30px;">No</th>
            <th style="padding:8px;text-align:left;">Pelanggan</th>
            <th style="padding:8px;text-align:left;">Kendaraan</th>
            <th style="padding:8px;text-align:left;">Mekanik</th>
            <th style="padding:8px;text-align:left;white-space:nowrap;">Tgl Selesai</th>
            <th style="padding:8px;text-align:left;">Jasa Servis</th>
            <th style="padding:8px;text-align:right;white-space:nowrap;">Subtotal Jasa</th>
            <th style="padding:8px;text-align:right;white-space:nowrap;">Diskon Jasa</th>
            <th style="padding:8px;text-align:left;">Sparepart</th>
            <th style="padding:8px;text-align:right;white-space:nowrap;">Subtotal SP</th>
            <th style="padding:8px;text-align:right;white-space:nowrap;">Diskon SP</th>
            <th style="padding:8px;text-align:right;">Total</th>
            <th style="padding:8px;text-align:left;">Kategori</th>
            <th style="padding:8px;text-align:left;white-space:nowrap;">Tgl Bayar</th>
            <th style="padding:8px;text-align:left;white-space:nowrap;">Jatuh Tempo</th>
            <th style="padding:8px;text-align:left;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
        <tfoot>
          <tr style="background:#f5f5f4; border-top:2px solid #292524;">
            <td colspan="11" style="padding:8px; text-align:right; font-weight:bold;">Total Keseluruhan:</td>
            <td style="padding:8px; text-align:right; font-weight:bold; font-size:12px;">Rp ${summary?.total_keseluruhan.toLocaleString('id-ID') ?? 0}</td>
            <td colspan="4"></td>
          </tr>
          <tr style="background:#f0fdf4;">
            <td colspan="11" style="padding:6px 8px; text-align:right; color:#15803d;">Sudah Lunas:</td>
            <td style="padding:6px 8px; text-align:right; font-weight:600; color:#15803d;">Rp ${summary?.total_pendapatan_lunas.toLocaleString('id-ID') ?? 0}</td>
            <td colspan="4"></td>
          </tr>
          <tr style="background:#fef2f2;">
            <td colspan="11" style="padding:6px 8px; text-align:right; color:#dc2626;">Piutang:</td>
            <td style="padding:6px 8px; text-align:right; font-weight:600; color:#dc2626;">Rp ${summary?.total_piutang_amount.toLocaleString('id-ID') ?? 0}</td>
            <td colspan="4"></td>
          </tr>
        </tfoot>
      </table>

      <!-- Footer -->
      <div style="margin-top:24px; padding-top:12px; border-top:1px solid #e7e5e4; display:flex; justify-content:space-between; font-size:10px; color:#78716c;">
        <div>Bengkel Nugraha Jaya · Gedangan, Sidoarjo · ${new Date().getFullYear()}</div>
        <div>Laporan dibuat secara otomatis oleh sistem</div>
      </div>
    </body>
    </html>`

    const printWindow = window.open('', '_blank', 'width=1200,height=800')
    if (!printWindow) return
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 400)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-stone-900">
            {role === 'admin' ? 'Laporan Servis' : 'Data Laporan'}
          </h2>
          <p className="text-stone-500 text-sm mt-1">Rekap data servis dan pembayaran</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExportCSV} disabled={data.length === 0}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={handleCetak} disabled={data.length === 0}
            className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors">
            <FileText className="w-4 h-4" /> Cetak
          </button>
        </div>
      </div>

      {/* Filter periode */}
      <div className="flex items-center gap-3 bg-white border border-stone-200 rounded-xl p-4">
        <label className="text-sm font-medium text-stone-700 whitespace-nowrap">Periode:</label>
        <input type="month" value={periode} onChange={e => setPeriode(e.target.value)}
          className="border border-stone-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        <span className="text-sm text-stone-500">
          {getNamaBulan(periode)}
        </span>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-stone-900">{summary.total_servis}</div>
            <div className="text-xs text-stone-500 mt-1">Total Servis Selesai</div>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center mb-3">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-700">{formatRupiah(summary.total_pendapatan_lunas)}</div>
            <div className="text-xs text-stone-500 mt-1">Pendapatan Lunas ({summary.total_lunas} servis)</div>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center mb-3">
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600">{formatRupiah(summary.total_piutang_amount)}</div>
            <div className="text-xs text-stone-500 mt-1">Piutang ({summary.total_piutang} servis)</div>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center mb-3">
              <TrendingUp className="w-4 h-4 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-stone-900">{formatRupiah(summary.total_keseluruhan)}</div>
            <div className="text-xs text-stone-500 mt-1">Total Keseluruhan</div>
          </div>
        </div>
      )}

      {/* Tabel laporan */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <h3 className="font-semibold text-stone-900">
            Detail Laporan — {getNamaBulan(periode)}
          </h3>
          {data.length > 0 && (
            <span className="text-xs text-stone-400">{data.length} data</span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-100 uppercase tracking-wide whitespace-nowrap">No</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-100 uppercase tracking-wide whitespace-nowrap">Pelanggan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-100 uppercase tracking-wide whitespace-nowrap">Kendaraan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-100 uppercase tracking-wide whitespace-nowrap">Mekanik</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-100 uppercase tracking-wide whitespace-nowrap">Tgl Selesai</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-100 uppercase tracking-wide">Jasa Servis</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-stone-100 uppercase tracking-wide whitespace-nowrap">Subtotal Jasa</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-stone-100 uppercase tracking-wide whitespace-nowrap">Diskon Jasa</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-100 uppercase tracking-wide">Sparepart</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-stone-100 uppercase tracking-wide whitespace-nowrap">Subtotal SP</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-stone-100 uppercase tracking-wide whitespace-nowrap">Diskon SP</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-stone-100 uppercase tracking-wide whitespace-nowrap">Total</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-100 uppercase tracking-wide whitespace-nowrap">Kategori</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-100 uppercase tracking-wide whitespace-nowrap">Tgl Bayar</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-100 uppercase tracking-wide whitespace-nowrap">Jatuh Tempo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-100 uppercase tracking-wide whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr><td colSpan={16} className="text-center py-12 text-stone-400 text-sm">Memuat laporan...</td></tr>
              ) : !searched || data.length === 0 ? (
                <tr><td colSpan={16} className="text-center py-12 text-stone-400">
                  <Wallet className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>{searched ? 'Tidak ada data untuk periode ini' : 'Pilih periode untuk melihat laporan'}</p>
                </td></tr>
              ) : (
                data.map((r, i) => (
                  <tr key={r.id_servis} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 text-stone-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-stone-900 whitespace-nowrap">{r.nama_pelanggan}</div>
                      {r.jenis_pelanggan === 'perusahaan' && r.nama_perusahaan && (
                        <div className="text-xs text-stone-400">{r.nama_perusahaan}</div>
                      )}
                      <div className="text-xs text-stone-400">{r.no_telp}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-stone-800">{r.merk} {r.tahun}</div>
                      <div className="text-xs text-stone-400 font-mono">{r.nomor_polisi}</div>
                    </td>
                    <td className="px-4 py-3 text-stone-700 whitespace-nowrap">{r.nama_mekanik}</td>
                    <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{formatTanggal(r.tanggal_selesai)}</td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="text-xs text-stone-600 line-clamp-3">{r.detail_jasa ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap font-medium">{formatRupiah(r.subtotal_jasa)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {r.diskon_jasa > 0
                        ? <span className="text-green-600">-{formatRupiah(r.diskon_jasa)}</span>
                        : <span className="text-stone-300">—</span>}
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="text-xs text-stone-600 line-clamp-3">{r.detail_sparepart ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap font-medium">{formatRupiah(r.subtotal_sparepart)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {r.diskon_sparepart > 0
                        ? <span className="text-green-600">-{formatRupiah(r.diskon_sparepart)}</span>
                        : <span className="text-stone-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap font-bold text-stone-900">
                      {r.total_biaya ? formatRupiah(r.total_biaya) : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${r.kategori_pembayaran === 'Piutang' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                        {r.kategori_pembayaran}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{formatTanggal(r.tanggal_pembayaran)}</td>
                    <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{formatTanggal(r.jatuh_tempo)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${r.status_pembayaran === 'lunas' ? 'bg-green-100 text-green-700' : r.status_pembayaran === 'belum_lunas' ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-stone-500'}`}>
                        {r.status_pembayaran === 'lunas' ? 'Lunas' : r.status_pembayaran === 'belum_lunas' ? 'Belum Lunas' : '—'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Footer total */}
            {data.length > 0 && summary && (
              <tfoot className="border-t-2 border-stone-300 bg-stone-50">
                <tr>
                  <td colSpan={11} className="px-4 py-3 text-right font-bold text-stone-700 text-sm">Total Keseluruhan:</td>
                  <td className="px-4 py-3 text-right font-bold text-stone-900">{formatRupiah(summary.total_keseluruhan)}</td>
                  <td colSpan={4} />
                </tr>
                <tr>
                  <td colSpan={11} className="px-4 py-2 text-right text-sm text-green-700">Sudah Lunas:</td>
                  <td className="px-4 py-2 text-right font-semibold text-green-700">{formatRupiah(summary.total_pendapatan_lunas)}</td>
                  <td colSpan={4} />
                </tr>
                <tr>
                  <td colSpan={11} className="px-4 py-2 text-right text-sm text-red-600">Piutang:</td>
                  <td className="px-4 py-2 text-right font-semibold text-red-600">{formatRupiah(summary.total_piutang_amount)}</td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
