'use client'
// app/admin/nota/[id]/page.tsx
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Check, Pencil, Printer, X, Save,
  Plus,
  Trash2,
  Wrench,
  Settings
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'
import SearchableSelect from '@/components/ui/SearchableSelect'

interface NotaRow {
  id_nota: number
  id_servis: number
  nomor_nota: string
  total_biaya: number
  metode_pembayaran: string
  status_pembayaran: string
  tanggal_pembayaran: string | null
  jatuh_tempo: string | null
  diskon_jasa: number
  diskon_sparepart: number
  tanggal_nota: string
  nama_pelanggan: string
  jenis_pelanggan: string
  no_telp: string
  nomor_polisi: string
  merk: string
  tahun: number
  nama_mekanik: string
}

interface DetailItem {
  id_detail_nota: number
  nama_item: string
  jenis_item: string
  harga: number | string   
  qty: number | string      
  subtotal: number | string
}

interface JasaOption {
  id_jasa: number
  nama_jasa: string
  harga_jasa: number
}

interface SparepartOption {
  id_sparepart: number
  nama_sparepart: string
  harga_jual: number
  satuan: string
  stok: number
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

const formatTanggal = (val: string) => {
  try {
    const date = val.includes('T') ? parseISO(val) : parseISO(val + 'T00:00:00')
    return format(date, 'dd MMM yyyy', { locale: id })
  } catch {
    return val
  }
}

const getSisaHari = (jatuh_tempo: string | null): number | null => {
  if (!jatuh_tempo) return null
  try {
    const raw = String(jatuh_tempo)
 
    let year: number, month: number, day: number
 
    if (raw.includes('T') || raw.includes('Z')) {
      // Format dari MySQL: "2026-04-26T17:00:00.000Z" (UTC)
      // Konversi ke Date lalu ambil tanggal lokal (bukan UTC)
      const d = new Date(raw)
      year    = d.getFullYear()    // getFullYear() pakai timezone lokal
      month   = d.getMonth() + 1  // getMonth() 0-indexed
      day     = d.getDate()        // getDate() pakai timezone lokal
    } else {
      // Format plain: "2026-04-27"
      const parts = raw.substring(0, 10).split('-').map(Number)
      year = parts[0]; month = parts[1]; day = parts[2]
    }
 
    const today    = new Date()
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const jtMid    = new Date(year, month - 1, day)
 
    const diffMs   = jtMid.getTime() - todayMid.getTime()
    return Math.round(diffMs / (1000 * 60 * 60 * 24))
  } catch {
    return null
  }
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

export default function DetailNotaPage() {
  const { id } = useParams()
  const router = useRouter()

  const [nota, setNota] = useState<NotaRow | null>(null)
  const [detail, setDetail] = useState<DetailItem[]>([])
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState('')

  const [showTambah, setShowTambah] = useState(false)
  const [newItem, setNewItem]       = useState({ nama_item: '', jenis_item: 'jasa', harga: 0, qty: 1 })
  const [savingItem, setSavingItem] = useState(false)

  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState({
    diskon_jasa: 0,
    diskon_sparepart: 0,
    metode_pembayaran: 'tunai',
    jatuh_tempo: '',
    detail: [] as DetailItem[],
  })
  const [saving, setSaving] = useState(false)

  const [showLunas, setShowLunas] = useState(false)
  const [metodeLunas, setMetodeLunas] = useState('tunai')
  const [savingLunas, setSavingLunas] = useState(false)

  const [editingItem, setEditingItem] = useState<DetailItem | null>(null)
  const [savingEditItem, setSavingEditItem] = useState(false)

  const [jasaList, setJasaList]         = useState<JasaOption[]>([])
  const [sparepartList, setSparepartList] = useState<SparepartOption[]>([])
  const [selectedJasaId, setSelectedJasaId]         = useState<string | number>('')
  const [selectedSparepartId, setSelectedSparepartId] = useState<string | number>('')

  const [deleteConfirm, setDeleteConfirm] = useState<DetailItem | null>(null)
  const [deletingItem, setDeletingItem]   = useState(false)

  const showSuccessMsg = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  const fetchMasterData = async () => {
    const [resJasa, resSp] = await Promise.all([
      fetch('/api/admin/jasa-servis'),
      fetch('/api/admin/sparepart'),
    ])
    const [jsonJasa, jsonSp] = await Promise.all([resJasa.json(), resSp.json()])
    if (jsonJasa.success) setJasaList(jsonJasa.data)
    if (jsonSp.success)   setSparepartList(jsonSp.data)
  }

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/nota/${id}`)
    const json = await res.json()

    if (json.success) {
      setNota(json.data.nota)
      setDetail(json.data.detail)
      setEditForm({
        diskon_jasa: json.data.nota.diskon_jasa,
        diskon_sparepart: json.data.nota.diskon_sparepart,
        metode_pembayaran: json.data.nota.metode_pembayaran,
        jatuh_tempo: json.data.nota.jatuh_tempo ?? '',
        detail: json.data.detail.map((d: DetailItem) => ({ ...d })),
      })
    }

    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  const handleTambahItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nota) return
    setSavingItem(true)
    const res  = await fetch(`/api/admin/nota/${nota.id_nota}/detail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    })
    const json = await res.json()
    if (!res.ok) { alert(json.error); setSavingItem(false); return }
    showSuccessMsg('Item berhasil ditambahkan')
    setShowTambah(false)
    setNewItem({ nama_item: '', jenis_item: 'jasa', harga: 0, qty: 1 })
    setSavingItem(false)
    fetchDetail()
  }

  const handleLunas = async () => {
    if (!nota) return
    setSavingLunas(true)

    const res = await fetch(`/api/admin/nota/${nota.id_nota}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'lunas', metode_pembayaran: metodeLunas }),
    })

    const json = await res.json()
    if (!res.ok) {
      alert(json.error)
      setSavingLunas(false)
      return
    }

    showSuccessMsg('Nota berhasil ditandai lunas')
    setShowLunas(false)
    setSavingLunas(false)
    fetchDetail()
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nota) return
    setSaving(true)

    const res = await fetch(`/api/admin/nota/${nota.id_nota}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'edit', ...editForm }),
    })

    const json = await res.json()
    if (!res.ok) {
      alert(json.error)
      setSaving(false)
      return
    }

    showSuccessMsg('Nota berhasil diperbarui')
    setShowEdit(false)
    setSaving(false)
    fetchDetail()
  }

  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nota || !editingItem) return
    setSavingEditItem(true)

    const res = await fetch(`/api/admin/nota/${nota.id_nota}/detail`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingItem),
    })

    const json = await res.json()
    if (!res.ok) {
      alert(json.error)
      setSavingEditItem(false)
      return
    }

    showSuccessMsg('Item berhasil diperbarui')
    setEditingItem(null)
    setSavingEditItem(false)
    fetchDetail()
  }

  const handleHapusItem = async () => {
    if (!nota || !deleteConfirm) return
    setDeletingItem(true)
    const res = await fetch(`/api/admin/nota/${nota.id_nota}/detail`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_detail_nota: deleteConfirm.id_detail_nota }),
    })
    const json = await res.json()
    setDeletingItem(false)
    if (!res.ok) { alert(json.error); return }
    showSuccessMsg('Item berhasil dihapus')
    setDeleteConfirm(null)
    fetchDetail()
  }

  const toNum = (v: unknown): number => {
    const n = Number(v)
    return isNaN(n) ? 0 : n
  }

  const totalJasa = detail.filter(d => d.jenis_item === 'jasa').reduce((s, d) => s + toNum(d.subtotal), 0)
  const totalSparepart = detail.filter(d => d.jenis_item === 'sparepart').reduce((s, d) => s + toNum(d.subtotal), 0)
  const diskonJasa = toNum(nota?.diskon_jasa)
  const diskonSp = toNum(nota?.diskon_sparepart)
  const grandTotal = (totalJasa - diskonJasa) + (totalSparepart - diskonSp)

  const handleCetak = async () => {
  if (!nota) return

  const logoBase64 = await getBase64Image('/logo-hitam.png')
  const jasaItems  = detail.filter(d => d.jenis_item === 'jasa')
  const spareItems = detail.filter(d => d.jenis_item === 'sparepart')
  const totalJasaCetak      = jasaItems.reduce((s, d) => s + Number(d.subtotal), 0)
  const totalSparepartCetak = spareItems.reduce((s, d) => s + Number(d.subtotal), 0)
  const grandTotalCetak = (totalJasaCetak - diskonJasa) + (totalSparepartCetak - diskonSp)

  const jasaRows = jasaItems.map((d, i) => `<tr>
    <td style="padding:5px 8px;color:#78716c;vertical-align:top;">${i === 0 ? 'Jasa' : ''}</td>
    <td style="padding:5px 8px;">${d.nama_item}</td>
    <td style="padding:5px 8px;text-align:center;">${d.qty}</td>
    <td style="padding:5px 8px;text-align:right;">Rp ${Number(d.harga).toLocaleString('id-ID')}</td>
    <td style="padding:5px 8px;text-align:right;">Rp ${Number(d.subtotal).toLocaleString('id-ID')}</td>
  </tr>`).join('')

  const spareRows = spareItems.map((d, i) => `<tr>
    <td style="padding:5px 8px;color:#78716c;vertical-align:top;">${i === 0 ? 'Part' : ''}</td>
    <td style="padding:5px 8px;">${d.nama_item}</td>
    <td style="padding:5px 8px;text-align:center;">${d.qty}</td>
    <td style="padding:5px 8px;text-align:right;">Rp ${Number(d.harga).toLocaleString('id-ID')}</td>
    <td style="padding:5px 8px;text-align:right;">Rp ${Number(d.subtotal).toLocaleString('id-ID')}</td>
  </tr>`).join('')

  const html = `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
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
    <!-- Tombol print hanya tampil di layar, hilang saat print -->
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

    <div style="display:flex; align-items:center; justify-content:center; gap:16px; margin-bottom:20px;">
      ${logoBase64 ? `<img src="${logoBase64}" style="width:60px; height:60px; object-fit:contain;" />` : ''}
      <div style="text-align:center;">
        <div style="font-size:16px; font-weight:bold;">BENGKEL NUGRAHA JAYA</div>
        <div style="font-size:10px; color:#57534e; margin-top:3px;">Jl. Raden Wijaya II/No.2 Sawotratap, Gedangan – Sidoarjo</div>
        <div style="font-size:10px; color:#57534e;">Telp. (031)997782447, (081)1378263</div>
      </div>
    </div>

    <hr style="border:none; border-top:2px solid #1c1917; margin-bottom:14px;"/>

    <table style="width:100%; margin-bottom:14px; font-size:11px;">
      <tr>
        <td style="width:33%; vertical-align:top;">
          <div style="margin-bottom:4px;"><b>No. Nota</b><br/>${nota.nomor_nota}</div>
          <div style="margin-bottom:4px;"><b>Tanggal</b><br/>${formatTanggal(nota.tanggal_nota)}</div>
          <div><b>Pelanggan</b><br/>${nota.nama_pelanggan}</div>
        </td>
        <td style="width:33%; vertical-align:top;">
          <div style="margin-bottom:4px;"><b>Kendaraan</b><br/>${nota.merk} ${nota.tahun}</div>
          <div style="margin-bottom:4px;"><b>No. Pol</b><br/>${nota.nomor_polisi}</div>
          <div><b>KM</b><br/>-</div>
        </td>
        <td style="width:33%; vertical-align:top;">
          <div style="margin-bottom:4px;"><b>No. Telp</b><br/>${nota.no_telp}</div>
          <div style="margin-bottom:4px;"><b>Mekanik</b><br/>${nota.nama_mekanik}</div>
          <div><b>Warna</b><br/>-</div>
        </td>
      </tr>
    </table>

    <hr style="border:none; border-top:1px solid #d6d3d1;"/>

    <table style="width:100%; border-collapse:collapse; font-size:11px;">
      <thead>
        <tr style="border-bottom:1px solid #d6d3d1;">
          <th style="padding:7px 8px; text-align:left; font-weight:normal; color:#57534e; width:12%;">Deskripsi</th>
          <th style="padding:7px 8px; text-align:left; font-weight:normal; color:#57534e;">Nama</th>
          <th style="padding:7px 8px; text-align:center; font-weight:normal; color:#57534e; width:8%;">Qty</th>
          <th style="padding:7px 8px; text-align:right; font-weight:normal; color:#57534e; width:18%;">Harga</th>
          <th style="padding:7px 8px; text-align:right; font-weight:normal; color:#57534e; width:18%;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${jasaRows}
        ${spareRows}
      </tbody>
      <tfoot>
        <tr style="border-top:1px solid #d6d3d1;">
          <td colspan="3"></td>
          <td style="padding:5px 8px; text-align:right; color:#57534e;">Subtotal Jasa</td>
          <td style="padding:5px 8px; text-align:right;">Rp ${totalJasaCetak.toLocaleString('id-ID')}</td>
        </tr>
        ${diskonJasa > 0 ? `<tr>
          <td colspan="3"></td>
          <td style="padding:5px 8px; text-align:right; color:#16a34a;">Diskon Jasa</td>
          <td style="padding:5px 8px; text-align:right; color:#16a34a;">-Rp ${diskonJasa.toLocaleString('id-ID')}</td>
        </tr>` : ''}
        ${totalSparepartCetak > 0 ? `<tr>
          <td colspan="3"></td>
          <td style="padding:5px 8px; text-align:right; color:#57534e;">Subtotal Sparepart</td>
          <td style="padding:5px 8px; text-align:right;">Rp ${totalSparepartCetak.toLocaleString('id-ID')}</td>
        </tr>` : ''}
        ${diskonSp > 0 ? `<tr>
          <td colspan="3"></td>
          <td style="padding:5px 8px; text-align:right; color:#16a34a;">Diskon Part</td>
          <td style="padding:5px 8px; text-align:right; color:#16a34a;">-Rp ${diskonSp.toLocaleString('id-ID')}</td>
        </tr>` : ''}
        <tr style="border-top:1px solid #d6d3d1;">
          <td colspan="3"></td>
          <td style="padding:8px; text-align:right; font-weight:bold;">Total Pembayaran</td>
          <td style="padding:8px; text-align:right; font-weight:bold;">Rp ${grandTotalCetak.toLocaleString('id-ID')}</td>
        </tr>
      </tfoot>
    </table>

    <hr style="border:none; border-top:1px solid #d6d3d1; margin:12px 0;"/>

    <div style="font-size:10px;">
      <div style="font-weight:bold; margin-bottom:5px;">
        Pembayaran Via ${nota.metode_pembayaran ? nota.metode_pembayaran.charAt(0).toUpperCase() + nota.metode_pembayaran.slice(1) : 'Transfer'}
      </div>
      <div style="display:flex; gap:32px; color:#57534e;">
        <div>Bank Mandiri A/n CV.NUGRAHA JAYA<br/>A/C 1410-01416-4990</div>
        <div>Bank BCA A/n DIAN TRIANA<br/>A/C 720-5264-787</div>
      </div>
    </div>

    <div style="text-align:center; font-size:10px; color:#d6d3d1; margin-top:20px; padding-top:10px; border-top:1px solid #e7e5e4;">
      Terima kasih telah mempercayakan kendaraan Anda kepada kami
    </div>
  </body>
  </html>`

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

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-stone-400 text-sm">Memuat...</div>
  }

  if (!nota) {
    return (
      <div className="text-center py-20 text-stone-400">
        <p>Nota tidak ditemukan</p>
        <button onClick={() => router.push('/admin/nota')} className="mt-3 text-orange-600 text-sm hover:underline">
          Kembali ke daftar nota
        </button>
      </div>
    )
  }

  const sisaHari = getSisaHari(nota.jatuh_tempo)

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
          <Check className="w-4 h-4 flex-shrink-0" /> {success}
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/admin/nota')}
          className="p-2 border border-stone-300 rounded-xl hover:bg-stone-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-stone-600" />
        </button>
        <div className="flex-1">
          <h2 className="font-display text-xl font-bold text-stone-900">{nota.nomor_nota}</h2>
          <p className="text-stone-500 text-sm">
            {nota.nama_pelanggan} · {nota.merk} · {nota.nomor_polisi}
          </p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap no-print">
        {nota.status_pembayaran === 'belum_lunas' && (
          <>
            <button
              onClick={() => setShowLunas(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700"
            >
              <Check className="w-4 h-4" /> Tandai Lunas
            </button>
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
            >
              <Pencil className="w-4 h-4" /> Edit Nota
            </button>
          </>
        )}
        <button onClick={() => { setShowTambah(true); fetchMasterData() }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700">
          <Plus className="w-4 h-4" /> Tambah Item
        </button>
        <button
          onClick={handleCetak}
          className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800"
        >
          <Printer className="w-4 h-4" /> Cetak
        </button>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
        <div className="text-center border-b border-stone-200 pb-4">
          <div className="font-bold text-xl text-stone-900">BENGKEL NUGRAHA JAYA</div>
          <div className="text-xs text-stone-400 mt-1">Jl. Raden Wijaya II/No.2 Sawotratap, Gedangan - Sidoarjo</div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 text-xs text-stone-600">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>No. Nota</span>
              <span className="font-mono font-bold">{nota.nomor_nota}</span>
            </div>
            <div className="flex justify-between">
              <span>Tanggal</span>
              <span>{formatTanggal(nota.tanggal_nota)}</span>
            </div>
            <div className="flex justify-between">
              <span>Mekanik</span>
              <span>{nota.nama_mekanik}</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Pelanggan</span>
              <span className="font-medium">{nota.nama_pelanggan}</span>
            </div>
            <div className="flex justify-between">
              <span>Kendaraan</span>
              <span>{nota.merk}</span>
            </div>
            <div className="flex justify-between">
              <span>Plat</span>
              <span className="font-mono">{nota.nomor_polisi}</span>
            </div>
          </div>
        </div>

        {nota.jatuh_tempo && (
          <div
            className={`text-xs px-3 py-2 rounded-lg flex items-center justify-between ${
              nota.status_pembayaran === 'lunas'
                ? 'bg-green-50 text-green-700'
                : sisaHari !== null && sisaHari < 0
                  ? 'bg-red-50 text-red-700'
                  : 'bg-amber-50 text-amber-700'
            }`}
          >
            <span>
              Jatuh Tempo: <strong>{formatTanggal(nota.jatuh_tempo)}</strong>
            </span>
            {nota.status_pembayaran !== 'lunas' && sisaHari !== null && (
              <span className="font-bold">
                {sisaHari < 0 ? `Terlambat ${Math.abs(sisaHari)} hari` : sisaHari === 0 ? 'Hari ini' : `${sisaHari} hari lagi`}
              </span>
            )}
          </div>
        )}

        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-t border-stone-300">
              <th className="py-2 text-left text-stone-600">Item</th>
              <th className="py-2 text-right text-stone-600">Qty</th>
              <th className="py-2 text-right text-stone-600">Harga</th>
              <th className="py-2 text-right text-stone-600">Subtotal</th>
              <th className="py-2 w-16 no-print"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {detail.filter(d => d.jenis_item === 'jasa').length > 0 && (
              <tr>
                <td colSpan={4} className="py-1.5 text-stone-400 font-medium text-xs">
                  Jasa Servis
                </td>
              </tr>
            )}
            {detail.filter(d => d.jenis_item === 'jasa').map(d => (
              <tr key={d.id_detail_nota}>
                <td className="py-1.5 text-stone-700">{d.nama_item}</td>
                <td className="py-1.5 text-right">{d.qty}</td>
                <td className="py-1.5 text-right">{formatRupiah(toNum(d.harga))}</td>
                <td className="py-1.5 text-right font-medium">{formatRupiah(toNum(d.subtotal))}</td>
                <td className="py-1.5 text-right no-print">
                  <button onClick={() => setDeleteConfirm(d)}
                    className="p-1 text-stone-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}

            {detail.filter(d => d.jenis_item === 'sparepart').length > 0 && (
              <tr>
                <td colSpan={4} className="py-1.5 text-stone-400 font-medium text-xs pt-2">
                  Sparepart
                </td>
              </tr>
            )}

            {detail.filter(d => d.jenis_item === 'sparepart').map(d => (
              <tr key={d.id_detail_nota}>
                {editingItem?.id_detail_nota === d.id_detail_nota ? (
                  <td colSpan={5} className="py-2 px-1">
                    <form onSubmit={handleEditItem} className="space-y-2">
                      <div className="text-xs font-medium text-stone-700 truncate">{d.nama_item}</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="text-xs text-stone-400">Qty</label>
                          <input
                            type="number" min={1} value={editingItem.qty}
                            onChange={e => {
                              const qty = Number(e.target.value)
                              setEditingItem({ ...editingItem, qty, subtotal: qty * toNum(editingItem.harga) })
                            }}
                            className="w-full px-2 py-1.5 border border-stone-300 rounded-lg text-xs text-right focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-stone-400">Harga</label>
                          <div className="px-2 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-right text-stone-500">
                            {formatRupiah(toNum(d.harga))}
                          </div>
                        </div>
                        <div className="flex gap-1 mt-4">
                          <button type="submit" disabled={savingEditItem}
                            className="p-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                            <Save className="w-3 h-3" />
                          </button>
                          <button type="button" onClick={() => setEditingItem(null)}
                            className="p-1.5 border border-stone-300 text-stone-500 rounded-lg hover:bg-stone-50">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </form>
                  </td>
                ) : (
                  <>
                    <td className="py-1.5 text-stone-700">{d.nama_item}</td>
                    <td className="py-1.5 text-right">{d.qty}</td>
                    <td className="py-1.5 text-right">{formatRupiah(toNum(d.harga))}</td>
                    <td className="py-1.5 text-right font-medium">{formatRupiah(toNum(d.subtotal))}</td>
                    <td className="py-1.5 text-right no-print">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditingItem({ ...d })}
                          className="p-1 text-stone-400 hover:text-blue-600 transition-colors">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={() => setDeleteConfirm(d)}
                          className="p-1 text-stone-400 hover:text-red-600 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </>
                )}
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
            <tr>
              <td colSpan={3} className="py-1.5 text-right text-stone-500">Subtotal Sparepart</td>
              <td className="py-1.5 text-right">{formatRupiah(totalSparepart)}</td>
            </tr>
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

        <div className="border-t border-stone-100 pt-3 flex items-center justify-between text-xs">
          <div className="space-y-1 text-stone-500">
            <div>Metode: <span className="font-medium capitalize">{nota.metode_pembayaran}</span></div>
            {nota.tanggal_pembayaran && (
              <div>Dibayar: <span className="font-medium">{formatTanggal(nota.tanggal_pembayaran)}</span></div>
            )}
          </div>
          <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${
            nota.status_pembayaran === 'lunas' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {nota.status_pembayaran === 'lunas' ? '✓ LUNAS' : 'BELUM LUNAS'}
          </span>
        </div>

        <div className="border-t border-stone-200 pt-3 mt-3 text-xs text-stone-600 space-y-1 only-print">
          <div className="font-semibold mb-1">
            Pembayaran Via {nota.metode_pembayaran
              ? nota.metode_pembayaran.charAt(0).toUpperCase() + nota.metode_pembayaran.slice(1)
              : 'Transfer'}
          </div>
          <div className="flex gap-10">
            <div>
              Bank Mandiri A/n CV.NUGRAHA JAYA<br />
              A/C 1410-01416-4990
            </div>
            <div>
              Bank BCA A/n DIAN TRIANA<br />
              A/C 720-5264-787
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-stone-300 mt-4 pt-4 border-t border-stone-100 only-print">
          Terima kasih telah mempercayakan kendaraan Anda kepada kami
        </div>
      </div>

      {showLunas && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-stone-900 text-center mb-1">Tandai Lunas</h3>
            <p className="text-stone-500 text-sm text-center mb-4">
              {nota.nama_pelanggan} · {formatRupiah(nota.total_biaya)}
            </p>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Metode Pembayaran</label>
              <div className="flex gap-2">                
                {['tunai', 'transfer bank mandiri', 'transfer bank bca'].map(m => (
                  <button key={m} type="button" onClick={() => setMetodeLunas(m)}
                    className={`
                      flex-1 py-2 rounded-xl border text-xs font-medium capitalize transition-colors
                      ${metodeLunas === m ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-stone-300 text-stone-600'}`}>
                      {m === 'tunai' ? 'Tunai' : m === 'transfer bank mandiri' ? 'Mandiri' : 'BCA'}
                  </button>
                ))}
              </div>
            </div>
          
                      
            <div className="flex gap-3 mt-1.5">
              <button
                onClick={() => setShowLunas(false)}
                className="flex-1 py-2.5 border border-stone-300 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50"
              >
                Batal
              </button>
              <button
                onClick={handleLunas}
                disabled={savingLunas}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-60"
              >
                {savingLunas ? 'Memproses...' : 'Tandai Lunas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Item */}
      {showTambah && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-stone-900">Tambah Item</h3>
            <button onClick={() => {
              setShowTambah(false)
              setNewItem({ nama_item: '', jenis_item: 'jasa', harga: 0, qty: 1 })
              setSelectedJasaId('')
              setSelectedSparepartId('')
            }} className="text-stone-400 hover:text-stone-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleTambahItem} className="space-y-4">
            {/* Pilih jenis item */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Jenis Item</label>
              <div className="flex gap-2">
                {[
                  { val: 'jasa', label: 'Jasa Servis', icon: Wrench },
                  { val: 'sparepart', label: 'Sparepart', icon: Settings },
                ].map(opt => {
                  const Icon = opt.icon
                  return (
                    <button key={opt.val} type="button"
                      onClick={() => {
                        setNewItem({ nama_item: '', jenis_item: opt.val, harga: 0, qty: 1 })
                        setSelectedJasaId('')
                        setSelectedSparepartId('')
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors
                        ${newItem.jenis_item === opt.val
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-stone-300 text-stone-600 hover:border-stone-400'}`}>
                      <Icon className="w-4 h-4" />
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Select jasa */}
            {newItem.jenis_item === 'jasa' && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Pilih Jasa Servis <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={jasaList.map(j => ({
                    value: j.id_jasa,
                    label: j.nama_jasa,
                    sub: `Rp ${j.harga_jasa.toLocaleString('id-ID')}`,
                  }))}
                  value={selectedJasaId}
                  onChange={val => {
                    setSelectedJasaId(val)
                    const jasa = jasaList.find(j => j.id_jasa === Number(val))
                    if (jasa) setNewItem(f => ({
                      ...f,
                      nama_item: jasa.nama_jasa,
                      harga: jasa.harga_jasa,
                      qty: 1,
                    }))
                  }}
                  placeholder="-- Pilih jasa servis --"
                />
                {/* Preview harga */}
                {selectedJasaId && (
                  <div className="mt-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-700">
                    Harga: <span className="font-semibold">{formatRupiah(newItem.harga)}</span>
                    <span className="text-stone-400 ml-2">(qty otomatis 1)</span>
                  </div>
                )}
              </div>
            )}

            {/* Select sparepart */}
            {newItem.jenis_item === 'sparepart' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Pilih Sparepart <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={sparepartList.map(s => ({
                      value: s.id_sparepart,
                      label: s.nama_sparepart,
                      sub: `Rp ${s.harga_jual.toLocaleString('id-ID')} · Stok: ${s.stok} ${s.satuan}`,
                    }))}
                    value={selectedSparepartId}
                    onChange={val => {
                      setSelectedSparepartId(val)
                      const sp = sparepartList.find(s => s.id_sparepart === Number(val))
                      if (sp) setNewItem(f => ({
                        ...f,
                        nama_item: sp.nama_sparepart,
                        harga: sp.harga_jual,
                        qty: 1,
                      }))
                    }}
                    placeholder="-- Pilih sparepart --"
                  />
                </div>

                {/* Qty — hanya untuk sparepart */}
                {selectedSparepartId && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Qty</label>
                      <input
                        required
                        type="number"
                        min={1}
                        value={newItem.qty}
                        onChange={e => setNewItem(f => ({ ...f, qty: Number(e.target.value) }))}
                        className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Harga Satuan</label>
                      <input
                        required
                        type="number"
                        min={0}
                        value={newItem.harga}
                        onChange={e => setNewItem(f => ({ ...f, harga: Number(e.target.value) }))}
                        className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                )}

                {/* Preview subtotal */}
                {selectedSparepartId && newItem.qty > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-700">
                    Subtotal: <span className="font-semibold">{formatRupiah(newItem.harga * newItem.qty)}</span>
                  </div>
                )}
              </>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => {
                setShowTambah(false)
                setNewItem({ nama_item: '', jenis_item: 'jasa', harga: 0, qty: 1 })
                setSelectedJasaId('')
                setSelectedSparepartId('')
              }}
                className="flex-1 py-2.5 border border-stone-300 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50">
                Batal
              </button>
              <button
                type="submit"
                disabled={savingItem || (!selectedJasaId && !selectedSparepartId)}
                className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 disabled:opacity-60">
                {savingItem ? 'Menyimpan...' : 'Tambah'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

      {/* Modal Tambah Diskon */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-semibold text-stone-900 text-lg">Edit Nota</h3>
              <button onClick={() => setShowEdit(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Diskon Jasa</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">Rp</span>
                    <input
                      type="number"
                      min={0}
                      value={editForm.diskon_jasa}
                      onChange={e => setEditForm(f => ({ ...f, diskon_jasa: Number(e.target.value) }))}
                      className="w-full pl-10 pr-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Diskon Sparepart</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">Rp</span>
                    <input
                      type="number"
                      min={0}
                      value={editForm.diskon_sparepart}
                      onChange={e => setEditForm(f => ({ ...f, diskon_sparepart: Number(e.target.value) }))}
                      className="w-full pl-10 pr-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Metode Pembayaran</label>
                <div className="flex gap-2">
                  {['tunai', 'transfer bank mandiri', 'transfer bank bca'].map(m => (
                    <button key={m} type="button" onClick={() => setEditForm(f => ({ ...f, metode_pembayaran: m }))}
                      className={`flex-1 py-2 rounded-xl border text-xs font-medium capitalize transition-colors
                       ${editForm.metode_pembayaran === m ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-stone-300 text-stone-600'}`}>
                      {m === 'tunai' ? 'Tunai' : m === 'transfer bank mandiri' ? 'Mandiri' : 'BCA'}
                    </button>
                  ))}
                </div>
              </div>

              {nota.jenis_pelanggan === 'perusahaan' && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Jatuh Tempo</label>
                  <input
                    type="date"
                    value={editForm.jatuh_tempo}
                    onChange={e => setEditForm(f => ({ ...f, jatuh_tempo: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  className="flex-1 py-2.5 border border-stone-300 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 disabled:opacity-60"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="font-semibold text-stone-900 text-center mb-1">Hapus Item?</h3>
            <p className="text-stone-500 text-sm text-center mb-6">
              <strong>{deleteConfirm.nama_item}</strong> akan dihapus dari nota ini.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 border border-stone-300 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50">
                Batal
              </button>
              <button onClick={handleHapusItem} disabled={deletingItem}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-60">
                {deletingItem ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}