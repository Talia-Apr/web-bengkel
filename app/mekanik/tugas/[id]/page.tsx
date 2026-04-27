'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  Wrench, Car, Clock, Check, CheckCircle, AlertCircle,
  ChevronLeft, Plus, Trash2, User, Phone, Calendar, FileText, X
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'
import SearchableSelect, { SelectOption } from '@/components/ui/SearchableSelect'

interface ServisRow {
  id_servis: number; id_booking: number; tanggal_servis: string | null; status_servis: string
  catatan_servis: string | null; keluhan: string; tanggal_booking: string; waktu_booking: string | null
  nomor_polisi: string; merk: string; tahun: number; warna: string; kilometer: number | null
  no_mesin: string | null; no_rangka: string | null; kategori_mobil: string | null
  nama_pelanggan: string; no_telp: string; jenis_pelanggan: string
}
interface DetailJasa { id_detail_jasa: number; id_jasa: number; nama_jasa: string; kode_jasa: string; harga: number }
interface DetailSparepart { id_detail_sparepart: number; id_sparepart: number; nama_sparepart: string; kode_sparepart: string; harga_jual: number; jumlah: number; subtotal: number; satuan: string }
interface StatusLog { id_log: number; status: string; keterangan: string; waktu_perubahan: string }
interface JasaOption { id_jasa: number; kode_jasa: string; nama_jasa: string; harga_jasa: number }
interface SparepartOption { id_sparepart: number; kode_sparepart: string; nama_sparepart: string; harga_jual: number; stok: number; satuan: string }

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  menunggu_konfirmasi: { label: 'Menunggu Konfirmasi', color: 'text-yellow-700', bg: 'bg-yellow-100', icon: Clock },
  dikonfirmasi:        { label: 'Dikonfirmasi',        color: 'text-blue-700',   bg: 'bg-blue-100',   icon: Check },
  dalam_pengerjaan:    { label: 'Dalam Pengerjaan',    color: 'text-orange-700', bg: 'bg-orange-100', icon: Wrench },
  test_drive:          { label: 'Test Drive',          color: 'text-purple-700', bg: 'bg-purple-100', icon: Car },
  selesai:             { label: 'Selesai',             color: 'text-green-700',  bg: 'bg-green-100',  icon: CheckCircle },
}

const fmtTgl = (val: string | null) => {
  if (!val) return '—'
  try { const d = val.includes('T') ? parseISO(val) : parseISO(val + 'T00:00:00'); return format(d, 'dd MMM yyyy', { locale: id }) } catch { return val }
}
const fmtRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

// ── Mini Toast Modal ──────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999] animate-in slide-in-from-bottom-4">
      <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-medium
        ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
        {type === 'success' ? <Check className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
        {msg}
        <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
      </div>
    </div>
  )
}

export default function MekanikTugasDetailPage() {
  const router   = useRouter()
  const params   = useParams()
  const idServis = Number(params.id)

  const [detail, setDetail]     = useState<{ servis: ServisRow; jasa: DetailJasa[]; sparepart: DetailSparepart[]; logs: StatusLog[] } | null>(null)
  const [loading, setLoading]   = useState(true)
  const [toast, setToast]       = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const [jasaOpts, setJasaOpts]       = useState<JasaOption[]>([])
  const [spOpts, setSpOpts]           = useState<SparepartOption[]>([])
  const [optsLoading, setOptsLoading] = useState(true)

  const [selJasa, setSelJasa]         = useState<string | number>('')
  const [addingJasa, setAddingJasa]   = useState(false)
  const [selSp, setSelSp]             = useState<string | number>('')
  const [jumlahSp, setJumlahSp]       = useState(1)
  const [addingSp, setAddingSp]       = useState(false)
  const [catatan, setCatatan]             = useState('')
  const [savingCatatan, setSavingCatatan] = useState(false)
  const [showSelesai, setShowSelesai]     = useState(false)
  const [savingSelesai, setSavingSelesai] = useState(false)

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
  }, [])

  const fetchDetail = useCallback(async () => {
    const res  = await fetch(`/api/mekanik/tugas/${idServis}`)
    const json = await res.json()
    if (json.success) { setDetail(json.data); setCatatan(json.data.servis?.catatan_servis ?? '') }
    else showToast(json.error ?? 'Gagal memuat data', 'error')
  }, [idServis, showToast])

  const fetchOptions = useCallback(async () => {
    setOptsLoading(true)
    const [rJ, rS] = await Promise.all([fetch('/api/admin/jasa-servis'), fetch('/api/admin/sparepart')])
    const [jJ, jS] = await Promise.all([rJ.json(), rS.json()])
    if (jJ.success) setJasaOpts(jJ.data ?? [])
    if (jS.success) setSpOpts(jS.data ?? [])
    setOptsLoading(false)
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchDetail(), fetchOptions()]).finally(() => setLoading(false))
  }, [fetchDetail, fetchOptions])

  const doAction = async (action: string, extra?: object) => {
    const res  = await fetch(`/api/mekanik/tugas/${idServis}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    })
    const json = await res.json()
    if (!res.ok) { showToast(json.error ?? 'Terjadi kesalahan', 'error'); return null }
    return json
  }

  const handleUpdateStatus = async (status: string) => {
    const labelMap: Record<string, string> = {
      dikonfirmasi: 'Mekanik mengkonfirmasi penugasan',
      dalam_pengerjaan: 'Pengerjaan dimulai',
      test_drive: 'Kendaraan dalam proses test drive',
    }
    const ok = await doAction('update_status', { status, keterangan: labelMap[status] ?? '' })
    if (ok) { showToast('Status berhasil diperbarui'); fetchDetail() }
  }

  const handleTambahJasa = async () => {
    if (!selJasa) return
    const jasa = jasaOpts.find(j => j.id_jasa === Number(selJasa))
    if (!jasa) return
    setAddingJasa(true)
    const ok = await doAction('tambah_jasa', { id_jasa: jasa.id_jasa, harga: jasa.harga_jasa })
    if (ok) { showToast(`${jasa.nama_jasa} ditambahkan`); setSelJasa(''); fetchDetail() }
    setAddingJasa(false)
  }

  const handleHapusJasa = async (id_detail_jasa: number, nama: string) => {
    const ok = await doAction('hapus_jasa', { id_detail_jasa })
    if (ok) { showToast(`${nama} dihapus`); fetchDetail() }
  }

  const handleTambahSparepart = async () => {
    if (!selSp || jumlahSp < 1) return
    const sp = spOpts.find(s => s.id_sparepart === Number(selSp))
    if (!sp) return
    if (jumlahSp > sp.stok) { showToast(`Stok ${sp.nama_sparepart} hanya ${sp.stok} ${sp.satuan}`, 'error'); return }
    setAddingSp(true)
    const ok = await doAction('tambah_sparepart', { id_sparepart: sp.id_sparepart, jumlah: jumlahSp, harga_jual: sp.harga_jual })
    if (ok) { showToast(`${sp.nama_sparepart} ditambahkan`); setSelSp(''); setJumlahSp(1); fetchDetail() }
    setAddingSp(false)
  }

  const handleHapusSparepart = async (item: DetailSparepart) => {
    const ok = await doAction('hapus_sparepart', { id_detail_sparepart: item.id_detail_sparepart, id_sparepart: item.id_sparepart, jumlah: item.jumlah })
    if (ok) { showToast(`${item.nama_sparepart} dihapus`); fetchDetail() }
  }

  const handleSimpanCatatan = async () => {
    setSavingCatatan(true)
    const ok = await doAction('update_catatan', { catatan_servis: catatan })
    if (ok) showToast('Catatan berhasil disimpan ✓')
    setSavingCatatan(false)
  }

  const handleSelesai = async () => {
    setSavingSelesai(true)
    const res = await doAction('selesai')
    if (res) {
      showToast(`Servis selesai! Nota ${res.nomor_nota} dibuat`)
      setShowSelesai(false)
      setTimeout(() => router.push('/mekanik/tugas'), 1800)
    }
    setSavingSelesai(false)
  }

  const jasaSelectOpts: SelectOption[] = jasaOpts.map(j => ({
    value: j.id_jasa, label: j.nama_jasa,
    sub: `${j.kode_jasa ? j.kode_jasa + ' · ' : ''}${fmtRupiah(j.harga_jasa)}`,
  }))

  const spSelectOpts: SelectOption[] = spOpts.map(s => ({
    value: s.id_sparepart, label: s.nama_sparepart,
    sub: `Stok: ${s.stok} ${s.satuan} · ${fmtRupiah(s.harga_jual)}`,
  }))

  const totalJasa      = detail?.jasa.reduce((s, j)  => s + Number(j.harga), 0) ?? 0
  const totalSparepart = detail?.sparepart.reduce((s, sp) => s + Number(sp.subtotal), 0) ?? 0
  const totalBiaya     = totalJasa + totalSparepart
  const isSelesai      = detail?.servis.status_servis === 'selesai'
  const selectedSpInfo = spOpts.find(s => s.id_sparepart === Number(selSp))

  if (loading) return <div className="flex items-center justify-center py-24 text-stone-400 text-sm">Memuat detail servis...</div>

  if (!detail) return (
    <div className="text-center py-24 text-stone-400">
      <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p>Data tidak ditemukan</p>
      <button onClick={() => router.back()} className="mt-4 text-sm text-orange-600 hover:underline">Kembali</button>
    </div>
  )

  const { servis, jasa, sparepart, logs } = detail
  const cfg = statusConfig[servis.status_servis] ?? statusConfig.menunggu_konfirmasi
  const StatusIcon = cfg.icon

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Back + header */}
      <div>
        <button onClick={() => router.push('/mekanik/tugas')}
          className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors mb-3">
          <ChevronLeft className="w-4 h-4" /> Kembali ke daftar tugas
        </button>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-stone-900">Detail Servis</h2>
            <p className="text-stone-500 text-sm mt-0.5">{servis.merk} {servis.tahun} · {servis.nomor_polisi}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full ${cfg.bg} ${cfg.color}`}>
            <StatusIcon className="w-4 h-4" /> {cfg.label}
          </span>
        </div>
      </div>

      {/* Info kendaraan + pelanggan */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-100 bg-stone-50">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest">Informasi Kendaraan</p>
        </div>
        <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
          {([
            { label: 'Kendaraan',  value: `${servis.merk} ${servis.tahun}` },
            { label: 'Warna',      value: servis.warna },
            { label: 'No. Polisi', value: servis.nomor_polisi },
            servis.kilometer     ? { label: 'Kilometer',  value: `${Number(servis.kilometer).toLocaleString('id-ID')} km` } : null,
            servis.kategori_mobil ? { label: 'Kategori', value: servis.kategori_mobil } : null,
            servis.no_mesin      ? { label: 'No. Mesin',  value: servis.no_mesin  } : null,
            servis.no_rangka     ? { label: 'No. Rangka', value: servis.no_rangka } : null,
          ] as ({ label: string; value: string } | null)[]).filter(Boolean).map(item => (
            <div key={item!.label}>
              <p className="text-xs text-stone-400 mb-0.5">{item!.label}</p>
              <p className="text-sm font-semibold text-stone-800">{item!.value}</p>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-stone-100 bg-stone-50">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest">Informasi Pelanggan</p>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 text-stone-400 mt-0.5 flex-shrink-0" />
            <div><p className="text-xs text-stone-400">Nama</p><p className="text-sm font-semibold text-stone-800">{servis.nama_pelanggan}</p></div>
          </div>
          <div className="flex items-start gap-2">
            <Phone className="w-4 h-4 text-stone-400 mt-0.5 flex-shrink-0" />
            <div><p className="text-xs text-stone-400">No. Telepon</p><p className="text-sm font-semibold text-stone-800">{servis.no_telp}</p></div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-stone-400 mt-0.5 flex-shrink-0" />
            <div><p className="text-xs text-stone-400">Tanggal Booking</p><p className="text-sm font-semibold text-stone-800">{fmtTgl(servis.tanggal_booking)}</p></div>
          </div>
        </div>
        <div className="px-5 pb-5">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-700 mb-1">Keluhan Pelanggan</p>
            <p className="text-sm text-amber-900">{servis.keluhan || 'Tidak ada keluhan dicatat'}</p>
          </div>
        </div>
      </div>

      {/* Tombol update status */}
      {!isSelesai && (
        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-stone-700 mb-3">Perbarui Status Pengerjaan</p>
          <div className="flex gap-2 flex-wrap">
            {servis.status_servis === 'menunggu_konfirmasi' && (
              <button onClick={() => handleUpdateStatus('dikonfirmasi')}
                className="flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 font-medium">
                <Check className="w-4 h-4" /> Konfirmasi Tugas
              </button>
            )}
            {servis.status_servis === 'dikonfirmasi' && (
              <button onClick={() => handleUpdateStatus('dalam_pengerjaan')}
                className="flex items-center gap-2 text-sm bg-orange-600 text-white px-4 py-2.5 rounded-xl hover:bg-orange-700 font-medium">
                <Wrench className="w-4 h-4" /> Mulai Pengerjaan
              </button>
            )}
            {servis.status_servis === 'dalam_pengerjaan' && (
              <button onClick={() => handleUpdateStatus('test_drive')}
                className="flex items-center gap-2 text-sm bg-purple-600 text-white px-4 py-2.5 rounded-xl hover:bg-purple-700 font-medium">
                <Car className="w-4 h-4" /> Test Drive
              </button>
            )}
            {['dalam_pengerjaan', 'test_drive'].includes(servis.status_servis) && (
              <button onClick={() => setShowSelesai(true)}
                className="flex items-center gap-2 text-sm bg-green-600 text-white px-4 py-2.5 rounded-xl hover:bg-green-700 font-medium">
                <CheckCircle className="w-4 h-4" /> Tandai Selesai
              </button>
            )}
          </div>
        </div>
      )}

      {/* Jasa servis */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-visible">
        <div className="px-5 py-3 border-b border-stone-100 bg-stone-50 flex items-center justify-between rounded-t-xl">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest">Jasa Servis</p>
          {jasa.length > 0 && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">{jasa.length} item</span>}
        </div>
        <div className="p-5">
          {jasa.length === 0 ? (
            <p className="text-stone-400 text-sm mb-4">Belum ada jasa ditambahkan</p>
          ) : (
            <div className="mb-4">
              {jasa.map((j, i) => (
                <div key={j.id_detail_jasa} className={`flex items-center justify-between gap-4 py-3 ${i < jasa.length - 1 ? 'border-b border-stone-100' : ''}`}>
                  <div>
                    <span className="text-sm font-medium text-stone-800">{j.nama_jasa}</span>
                    {j.kode_jasa && <span className="text-xs text-stone-400 ml-2 font-mono">{j.kode_jasa}</span>}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-semibold text-stone-700">{fmtRupiah(j.harga)}</span>
                    {!isSelesai && (
                      <button onClick={() => handleHapusJasa(j.id_detail_jasa, j.nama_jasa)} className="text-stone-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex justify-between pt-3 text-sm font-bold text-stone-800 border-t border-stone-200">
                <span>Total Jasa</span><span>{fmtRupiah(totalJasa)}</span>
              </div>
            </div>
          )}
          {!isSelesai && (
            <div className="flex gap-2">
              <SearchableSelect
                options={jasaSelectOpts}
                value={selJasa}
                onChange={setSelJasa}
                placeholder={optsLoading ? 'Memuat...' : 'Pilih atau cari jasa servis'}
                disabled={optsLoading}
                className="flex-1"
              />
              <button onClick={handleTambahJasa} disabled={!selJasa || addingJasa}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 disabled:opacity-50 flex-shrink-0">
                <Plus className="w-4 h-4" /> {addingJasa ? 'Menambah...' : 'Tambah'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sparepart */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-visible">
        <div className="px-5 py-3 border-b border-stone-100 bg-stone-50 flex items-center justify-between rounded-t-xl">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest">Sparepart Digunakan</p>
          {sparepart.length > 0 && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">{sparepart.length} item</span>}
        </div>
        <div className="p-5">
          {sparepart.length === 0 ? (
            <p className="text-stone-400 text-sm mb-4">Belum ada sparepart ditambahkan</p>
          ) : (
            <div className="mb-4">
              {sparepart.map((sp, i) => (
                <div key={sp.id_detail_sparepart} className={`flex items-center justify-between gap-4 py-3 ${i < sparepart.length - 1 ? 'border-b border-stone-100' : ''}`}>
                  <div>
                    <span className="text-sm font-medium text-stone-800">{sp.nama_sparepart}</span>
                    <span className="text-xs text-stone-400 ml-2">{sp.jumlah} {sp.satuan}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-semibold text-stone-700">{fmtRupiah(sp.subtotal)}</span>
                    {!isSelesai && (
                      <button onClick={() => handleHapusSparepart(sp)} className="text-stone-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex justify-between pt-3 text-sm font-bold text-stone-800 border-t border-stone-200">
                <span>Total Sparepart</span><span>{fmtRupiah(totalSparepart)}</span>
              </div>
            </div>
          )}
          {!isSelesai && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <SearchableSelect
                  options={spSelectOpts}
                  value={selSp}
                  onChange={v => { setSelSp(v); setJumlahSp(1) }}
                  placeholder={optsLoading ? 'Memuat...' : 'Pilih atau cari sparepart'}
                  disabled={optsLoading}
                  className="flex-1"
                />
                <input type="number" value={jumlahSp}
                  onChange={e => setJumlahSp(Math.max(1, Number(e.target.value)))}
                  min={1} max={selectedSpInfo?.stok ?? 999}
                  className="w-16 px-3 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-center flex-shrink-0" />
                <button onClick={handleTambahSparepart} disabled={!selSp || addingSp}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 disabled:opacity-50 flex-shrink-0">
                  <Plus className="w-4 h-4" /> {addingSp ? 'Menambah...' : 'Tambah'}
                </button>
              </div>
              {selectedSpInfo && (
                <p className="text-xs text-stone-500 px-1">
                  Stok: <strong>{selectedSpInfo.stok} {selectedSpInfo.satuan}</strong>
                  {' · '}{fmtRupiah(selectedSpInfo.harga_jual)} / {selectedSpInfo.satuan}
                  {jumlahSp > 1 && <> · Subtotal: <strong>{fmtRupiah(selectedSpInfo.harga_jual * jumlahSp)}</strong></>}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Estimasi total */}
      <div className="bg-stone-900 text-white rounded-xl p-5 flex items-center justify-between">
        <div>
          <p className="text-stone-400 text-sm">Estimasi Total Biaya</p>
          <p className="text-xs text-stone-500 mt-0.5">Jasa + Sparepart</p>
        </div>
        <p className="text-2xl font-bold">{fmtRupiah(totalBiaya)}</p>
      </div>

      {/* Catatan servis */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-100 bg-stone-50">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest">Catatan Servis</p>
        </div>
        <div className="p-5">
          <textarea value={catatan} onChange={e => setCatatan(e.target.value)} disabled={isSelesai}
            rows={4} placeholder="Tuliskan catatan hasil pengecekan dan pengerjaan..."
            className="w-full px-4 py-3 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none disabled:bg-stone-50 disabled:text-stone-400" />
          {!isSelesai && (
            <button onClick={handleSimpanCatatan} disabled={savingCatatan}
              className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-stone-800 text-white rounded-xl text-sm font-medium hover:bg-stone-900 disabled:opacity-60">
              <FileText className="w-4 h-4" />
              {savingCatatan ? 'Menyimpan...' : 'Simpan Catatan'}
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      {logs.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-stone-100 bg-stone-50">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest">Riwayat Status</p>
          </div>
          <div className="p-5">
            {logs.map((log, i) => {
              const c = statusConfig[log.status]; const Icon = c?.icon ?? Check
              return (
                <div key={log.id_log} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${c?.bg ?? 'bg-stone-100'}`}>
                      <Icon className={`w-4 h-4 ${c?.color ?? 'text-stone-500'}`} />
                    </div>
                    {i < logs.length - 1 && <div className="w-0.5 flex-1 bg-stone-200 my-1" />}
                  </div>
                  <div className={`${i < logs.length - 1 ? 'pb-5' : ''}`}>
                    <p className="text-sm font-semibold text-stone-800">{c?.label ?? log.status}</p>
                    {log.keterangan && <p className="text-xs text-stone-500 mt-0.5">{log.keterangan}</p>}
                    <p className="text-xs text-stone-400 mt-0.5">
                      {format(parseISO(log.waktu_perubahan), 'dd MMM yyyy · HH:mm', { locale: id })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal selesai */}
      {showSelesai && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-stone-900 text-center mb-1">Tandai Servis Selesai?</h3>
            <p className="text-stone-500 text-sm text-center mb-4">
              Nota akan dibuat otomatis untuk <strong>{servis.merk} {servis.tahun} — {servis.nomor_polisi}</strong>
            </p>
            <div className="bg-stone-50 rounded-xl p-4 mb-5 space-y-1.5">
              <div className="flex justify-between text-sm"><span className="text-stone-500">Total Jasa</span><span className="font-medium">{fmtRupiah(totalJasa)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-stone-500">Total Sparepart</span><span className="font-medium">{fmtRupiah(totalSparepart)}</span></div>
              <div className="flex justify-between text-sm font-bold border-t border-stone-200 pt-2"><span>Total</span><span>{fmtRupiah(totalBiaya)}</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowSelesai(false)} className="flex-1 py-2.5 border border-stone-300 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50">Batal</button>
              <button onClick={handleSelesai} disabled={savingSelesai} className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-60">
                {savingSelesai ? 'Memproses...' : 'Ya, Selesai'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
