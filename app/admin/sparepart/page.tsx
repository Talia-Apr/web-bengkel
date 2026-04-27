'use client'

import { useState, useEffect, useCallback } from 'react'
import { Package, Search, Plus, Pencil, Trash2, X, ChevronDown, TrendingDown, Info } from 'lucide-react'

interface Sparepart {
  id_sparepart: number
  kode_sparepart: string
  nama_sparepart: string
  mobil: string
  harga_beli: number
  harga_jual: number
  stok: number
  satuan: string
}

const SATUAN_OPTIONS = ['Pcs', 'Set', 'Liter', 'Botol', 'Meter', 'Roll', 'Kg', 'Gram']
const MIN_STOK = 5

const emptyForm = {
  kode_sparepart: '', nama_sparepart: '', mobil: '', 
  harga_beli: 0, harga_jual: 0, stok: 0, satuan: 'Pcs',
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

export default function AdminSparepartPage() {
  const [spareparts, setSpareparts]         = useState<Sparepart[]>([])
  const [loading, setLoading]               = useState(true)
  const [search, setSearch]                 = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [modalOpen, setModalOpen]           = useState(false)
  const [editData, setEditData]             = useState<Sparepart | null>(null)
  const [form, setForm]                     = useState(emptyForm)
  const [saving, setSaving]                 = useState(false)
  const [error, setError]                   = useState('')
  const [deleteConfirm, setDeleteConfirm]   = useState<Sparepart | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search)         params.set('search', search)
    if (filterStatus) params.set('status', filterStatus)
    const res  = await fetch(`/api/admin/sparepart?${params}`)
    const json = await res.json()
    if (json.success) {
      setSpareparts(json.data)
    }
    setLoading(false)
  }, [search, filterStatus])

  useEffect(() => { fetchData() }, [fetchData])

  const openAdd = () => {
    setEditData(null)
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  const openEdit = (s: Sparepart) => {
    setEditData(s)
    setForm({
      kode_sparepart: s.kode_sparepart,
      nama_sparepart: s.nama_sparepart,
      mobil:          s.mobil,
      harga_beli:     s.harga_beli,
      harga_jual:     s.harga_jual,
      stok:           s.stok,
      satuan:         s.satuan,
    })
    setError('')
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    const url    = editData ? `/api/admin/sparepart/${editData.id_sparepart}` : '/api/admin/sparepart'
    const method = editData ? 'PUT' : 'POST'

    const res  = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Terjadi kesalahan')
      setSaving(false)
      return
    }

    setModalOpen(false)
    fetchData()
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    const res  = await fetch(`/api/admin/sparepart/${deleteConfirm.id_sparepart}`, { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok) { alert(json.error); return }
    setDeleteConfirm(null)
    fetchData()
  }

  const lowStock  = spareparts.filter(s => s.stok <= MIN_STOK)
  const amanCount = spareparts.filter(s => s.stok > MIN_STOK).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="font-display text-2xl font-bold text-stone-900">Stok Sparepart</h2>
          <p className="text-stone-500 text-sm mt-1">Kelola inventaris suku cadang bengkel</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-700 transition-colors">
          <Plus className="w-4 h-4" /> Tambah Sparepart
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
          <div className="text-3xl font-bold font-display text-stone-900">{spareparts.length}</div>
          <div className="text-sm text-stone-500 mt-1">Total Item</div>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
          <div className="text-3xl font-bold font-display text-green-600">{amanCount}</div>
          <div className="text-sm text-stone-500 mt-1">Stok Aman</div>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
          <div className="text-3xl font-bold font-display text-red-600">{lowStock.length}</div>
          <div className="text-sm text-stone-500 mt-1">Stok Rendah</div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            placeholder="Cari nama atau kode sparepart..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="relative">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="appearance-none pl-4 pr-9 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-stone-700"
          >
            <option value="">Semua Status</option>
            <option value="aman">Stok Aman</option>
            <option value="rendah">Stok Rendah</option>
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
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-stone-100 uppercase tracking-wide whitespace-nowrap">Kode</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-stone-100 uppercase tracking-wide">Nama Sparepart</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-stone-100 uppercase tracking-wide whitespace-nowrap">Mobil</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-stone-100 uppercase tracking-wide whitespace-nowrap">Harga Beli</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-stone-100 uppercase tracking-wide whitespace-nowrap">Harga Jual</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-stone-100 uppercase tracking-wide">Stok</th>
                <th className="text-center px-5 py-3.5 text-xs font-semibold text-stone-100 uppercase tracking-wide">Status</th>
                <th className="text-center px-5 py-3.5 text-xs font-semibold text-stone-100 uppercase tracking-wide">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-stone-400 text-sm">Memuat data...</td>
                </tr>
              ) : spareparts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-stone-400">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>Tidak ada sparepart ditemukan</p>
                  </td>
                </tr>
              ) : (
                spareparts.map(s => {
                  const isLow = s.stok <= MIN_STOK
                  return (
                    <tr key={s.id_sparepart} className="hover:bg-stone-50 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-mono text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-lg">
                          {s.kode_sparepart}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-medium text-stone-900">{s.nama_sparepart}</td>
                      <td className="px-5 py-4 text-stone-600 text-xs whitespace-nowrap">{s.mobil}</td>
                      <td className="px-5 py-4 text-right text-blue-500 whitespace-nowrap text-xs">
                        {formatRupiah(s.harga_beli)}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-red-500 whitespace-nowrap">
                        {formatRupiah(s.harga_jual)}
                      </td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <span className={`font-semibold ${isLow ? 'text-red-600' : 'text-stone-900'}`}>
                          {s.stok}
                        </span>
                        <span className="text-stone-400 text-xs ml-1">{s.satuan}</span>
                      </td>
                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600 font-semibold bg-red-50 px-2.5 py-1 rounded-full">
                            <TrendingDown className="w-3 h-3" /> Rendah
                          </span>
                        ) : (
                          <span className="text-xs text-green-700 font-semibold bg-green-50 px-2.5 py-1 rounded-full">
                            Aman
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEdit(s)}
                            className="p-1.5 rounded-lg bg-yellow-500 text-white hover:bg-yellow-700 transition-colors"
                            title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteConfirm(s)}
                            className="p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-700 transition-colors"
                            title="Hapus">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal Tambah / Edit ─────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-semibold text-stone-900 text-lg">
                {editData ? 'Edit Sparepart' : 'Tambah Sparepart'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              {/* Kode + Satuan */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Kode <span className="text-red-500">*</span>
                  </label>
                  <input required value={form.kode_sparepart}
                    onChange={e => setForm(f => ({ ...f, kode_sparepart: e.target.value.toUpperCase() }))}
                    className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                    placeholder="SP001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Satuan <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select required value={form.satuan}
                      onChange={e => setForm(f => ({ ...f, satuan: e.target.value }))}
                      className="w-full appearance-none px-4 py-2.5 pr-9 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white">
                      {SATUAN_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Nama */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Nama Sparepart <span className="text-red-500">*</span>
                </label>
                <input required value={form.nama_sparepart}
                  onChange={e => setForm(f => ({ ...f, nama_sparepart: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Contoh: Oli Mesin Shell Helix 1L" />
              </div>

              {/* Mobil */}
              <div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Mobil <span className="text-red-500">*</span>
                  </label>
                  <input required value={form.mobil}
                    onChange={e => setForm(f => ({ ...f, mobil: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Contoh: Semua / Toyota" />
                </div>
              </div>

              {/* Harga beli + jual */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Harga Beli <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-sm">Rp</span>
                    <input required type="number" min={0} value={form.harga_beli}
                      onChange={e => setForm(f => ({ ...f, harga_beli: Number(e.target.value) }))}
                      className="w-full pl-10 pr-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="0" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Harga Jual <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-sm">Rp</span>
                    <input required type="number" min={0} value={form.harga_jual}
                      onChange={e => setForm(f => ({ ...f, harga_jual: Number(e.target.value) }))}
                      className="w-full pl-10 pr-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="0" />
                  </div>
                </div>
              </div>

              {/* Stok */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  {editData ? 'Tambah Stok' : 'Stok Awal'} <span className="text-red-500">*</span>
                </label>
                {editData && (
                  <div className="flex items-center gap-2 mb-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg">
                    <Info className="w-3.5 h-3.5 flex-shrink-0" />
                    Stok saat ini: <strong>{editData.stok} {editData.satuan}</strong>. Masukkan jumlah yang ingin ditambahkan.
                  </div>
                )}
                <input
                  required
                  type="number"
                  min={editData ? editData.stok : 0}
                  value={form.stok}
                  onChange={e => {
                    const val = Number(e.target.value)
                    if (editData && val < editData.stok) return
                    setForm(f => ({ ...f, stok: val }))
                  }}
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="0"
                />
                {editData && (
                  <p className="text-xs text-stone-400 mt-1">Nilai minimum: {editData.stok} (stok tidak boleh dikurangi)</p>
                )}
              </div>

              {/* Tombol */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 border border-stone-300 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors">
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 disabled:opacity-60 transition-colors">
                  {saving ? 'Menyimpan...' : editData ? 'Simpan Perubahan' : 'Tambah Sparepart'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Konfirmasi Hapus ──────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="font-semibold text-stone-900 text-center mb-1">Hapus Sparepart?</h3>
            <p className="text-stone-500 text-sm text-center mb-6">
              <strong>{deleteConfirm.nama_sparepart}</strong> akan dihapus dari sistem.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 border border-stone-300 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50">
                Batal
              </button>
              <button onClick={handleDelete}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700">
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
