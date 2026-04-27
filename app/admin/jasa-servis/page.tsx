'use client'

import { useState, useEffect, useCallback } from 'react'
import { Wrench, Search, Plus, Pencil, Trash2, X } from 'lucide-react'

interface JasaServis {
  id_jasa: number
  kode_jasa: string
  nama_jasa: string
  keterangan: string
  harga_jasa: number
}

const emptyForm = { kode_jasa: '', nama_jasa: '', keterangan: '', harga_jasa: 0 }

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

export default function AdminJasaServisPage() {
  const [jasa, setJasa]                   = useState<JasaServis[]>([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [modalOpen, setModalOpen]         = useState(false)
  const [editData, setEditData]           = useState<JasaServis | null>(null)
  const [form, setForm]                   = useState(emptyForm)
  const [saving, setSaving]               = useState(false)
  const [error, setError]                 = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<JasaServis | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    const res  = await fetch(`/api/admin/jasa-servis?${params}`)
    const json = await res.json()
    if (json.success) setJasa(json.data)
    setLoading(false)
  }, [search])

  useEffect(() => { fetchData() }, [fetchData])

  const openAdd = () => {
    setEditData(null)
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  const openEdit = (j: JasaServis) => {
    setEditData(j)
    setForm({
      kode_jasa: j.kode_jasa,
      nama_jasa: j.nama_jasa,
      keterangan: j.keterangan || '',
      harga_jasa: j.harga_jasa
    })
    setError('')
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    const url    = editData ? `/api/admin/jasa-servis/${editData.id_jasa}` : '/api/admin/jasa-servis'
    const method = editData ? 'PUT' : 'POST'

    const res  = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()

    if (!res.ok) { setError(json.error ?? 'Terjadi kesalahan'); setSaving(false); return }
    setModalOpen(false)
    fetchData()
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    const res  = await fetch(`/api/admin/jasa-servis/${deleteConfirm.id_jasa}`, { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok) { alert(json.error); return }
    setDeleteConfirm(null)
    fetchData()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-display text-2xl font-bold text-stone-900">Kelola Jasa Servis</h2>
          <p className="text-stone-500 text-sm mt-1">{jasa.length} jasa servis terdaftar</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-700 transition-colors">
          <Plus className="w-4 h-4" /> Tambah Jasa
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input
          placeholder="Cari kode atau nama jasa servis..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Tabel */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-800">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-stone-100 uppercase tracking-wide w-1/4">Kode</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-stone-100 uppercase tracking-wide w-1/4">Nama Jasa Servis</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-stone-100 uppercase tracking-wide w-1/4">Keterangan</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-stone-100 uppercase tracking-wide w-1/4">Harga Jasa</th>
                <th className="text-center px-5 py-3.5 text-xs font-semibold text-stone-100 uppercase tracking-wide w-1/4">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr><td colSpan={4} className="text-center py-12 text-stone-400 text-sm">Memuat data...</td></tr>
              ) : jasa.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-12 text-stone-400">
                  <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>Tidak ada jasa servis ditemukan</p>
                </td></tr>
              ) : (
                jasa.map(j => (
                  <tr key={j.id_jasa} className="hover:bg-stone-50 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-lg">
                        {j.kode_jasa}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-stone-900">{j.nama_jasa}</td>
                    <td className="px-5 py-4 text-stone-600">
                      {j.keterangan || '-'}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-red-500">
                      {formatRupiah(j.harga_jasa)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEdit(j)}
                          className="p-1.5 rounded-lg bg-yellow-500 text-white hover:bg-yellow-700 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteConfirm(j)}
                          className="p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-700 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-semibold text-stone-900 text-lg">
                {editData ? 'Edit Jasa Servis' : 'Tambah Jasa Servis'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Kode Jasa <span className="text-red-500">*</span>
                </label>
                <input required value={form.kode_jasa}
                  onChange={e => setForm(f => ({ ...f, kode_jasa: e.target.value.toUpperCase() }))}
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                  placeholder="Contoh: JS001" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Nama Jasa Servis <span className="text-red-500">*</span>
                </label>
                <input required value={form.nama_jasa}
                  onChange={e => setForm(f => ({ ...f, nama_jasa: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Contoh: Ganti Oli Mesin" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Keterangan
                </label>
                <textarea
                  value={form.keterangan}
                  onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Contoh: Oli mesin 10.000 km"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Harga <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-sm">Rp</span>
                  <input required type="number" min={0} value={form.harga_jasa}
                    onChange={e => setForm(f => ({ ...f, harga_jasa: Number(e.target.value) }))}
                    className="w-full pl-10 pr-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="0" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 border border-stone-300 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50">
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 disabled:opacity-60">
                  {saving ? 'Menyimpan...' : editData ? 'Simpan Perubahan' : 'Tambah Jasa'}
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
            <h3 className="font-semibold text-stone-900 text-center mb-1">Hapus Jasa Servis?</h3>
            <p className="text-stone-500 text-sm text-center mb-6">
              <strong>{deleteConfirm.nama_jasa}</strong> akan dihapus dari sistem.
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
