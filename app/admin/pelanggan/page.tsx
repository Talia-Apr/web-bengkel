'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, Car, Phone, Mail, Search, Plus, Pencil, Trash2, X, Building2, User, ChevronDown, EyeOff, Eye } from 'lucide-react'

interface Kendaraan {
  id_kendaraan: number
  nomor_polisi: string
  merk: string
  tahun: number
  warna: string
}

interface Pelanggan {
  id_pelanggan: number
  id_user: number
  nama: string
  email: string
  no_telp: string
  alamat: string
  jenis_pelanggan: 'individu' | 'perusahaan'
  nama_perusahaan: string | null
  term_of_payment: number | null
  jumlah_kendaraan: number
  kendaraan: Kendaraan[]
  created_at: string
}

const emptyForm = {
  nama: '', email: '', password: '', no_telp: '', alamat: '',
  jenis_pelanggan: 'individu' as 'individu' | 'perusahaan',
  nama_perusahaan: '', term_of_payment: 14,
}

export default function AdminPelangganPage() {
  const [pelanggan, setPelanggan]   = useState<Pelanggan[]>([])
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterJenis, setFilterJenis] = useState('')
  const [modalOpen, setModalOpen]   = useState(false)
  const [editData, setEditData]     = useState<Pelanggan | null>(null)
  const [form, setForm]             = useState(emptyForm)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<Pelanggan | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search)      params.set('search', search)
    if (filterJenis) params.set('jenis', filterJenis)

    const res  = await fetch(`/api/admin/pelanggan?${params}`)
    const json = await res.json()
    if (json.success) {
      setPelanggan(json.data)
      setTotal(json.data.length)
    }
    setLoading(false)
  }, [search, filterJenis])

  useEffect(() => { fetchData() }, [fetchData])

  const openAdd = () => {
    setEditData(null)
    setForm(emptyForm)
    setShowPassword(false)
    setError('')
    setModalOpen(true)
  }

  const openEdit = (p: Pelanggan) => {
    setEditData(p)
    setForm({
      nama: p.nama,
      email: p.email,
      password: '',
      no_telp: p.no_telp,
      alamat: p.alamat,
      jenis_pelanggan: p.jenis_pelanggan,
      nama_perusahaan: p.nama_perusahaan ?? '',
      term_of_payment: p.term_of_payment ?? 14,
    })
    setShowPassword(false)
    setError('')
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    const url    = editData ? `/api/admin/pelanggan/${editData.id_pelanggan}` : '/api/admin/pelanggan'
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
    const res = await fetch(`/api/admin/pelanggan/${deleteConfirm.id_pelanggan}`, { method: 'DELETE' })
    if (res.ok) {
      setDeleteConfirm(null)
      fetchData()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-display text-2xl font-bold text-stone-900">Data Pelanggan</h2>
          <p className="text-stone-500 text-sm mt-1">{total} pelanggan terdaftar</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-700 transition-colors">
          <Plus className="w-4 h-4" /> Tambah Pelanggan
        </button>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            placeholder="Cari nama, email, atau nomor telepon..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="relative">
          <select
            value={filterJenis}
            onChange={e => setFilterJenis(e.target.value)}
            className="appearance-none pl-4 pr-9 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-stone-700"
          >
            <option value="">Semua Jenis</option>
            <option value="individu">Individu</option>
            <option value="perusahaan">Perusahaan</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
        </div>
      </div>

      {/* List pelanggan */}
      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-12 text-stone-400 text-sm">Memuat data...</div>
        ) : pelanggan.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Tidak ada pelanggan ditemukan</p>
          </div>
        ) : (
          pelanggan.map(p => (
            <div key={p.id_pelanggan} className="bg-white border border-stone-200 rounded-xl p-5 hover:border-stone-300 transition-colors">
              <div className="flex items-start justify-between gap-4">
                {/* Avatar + info */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center font-bold text-orange-700 font-display text-lg flex-shrink-0">
                    {p.nama.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-stone-900">{p.nama}</span>
                      {/* Badge jenis pelanggan */}
                      {p.jenis_pelanggan === 'perusahaan' ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          <Building2 className="w-3 h-3" /> Perusahaan
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          <User className="w-3 h-3" /> Individu
                        </span>
                      )}
                    </div>
                    {p.jenis_pelanggan === 'perusahaan' && p.nama_perusahaan && (
                      <div className="text-xs text-blue-600 font-medium mt-0.5">{p.nama_perusahaan} · Tempo {p.term_of_payment} hari</div>
                    )}
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-stone-500">
                        <Phone className="w-3 h-3" /> {p.no_telp}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-stone-500">
                        <Mail className="w-3 h-3" /> {p.email}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Kanan: badge kendaraan + tombol aksi */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  
                  <button
                    onClick={() => openEdit(p)}
                    className="p-2 rounded-lg bg-yellow-500 text-white hover:bg-yellow-700 transition-colors"
                    title="Edit pelanggan"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setDeleteConfirm(p)}
                    className="p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                    title="Hapus pelanggan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {p.kendaraan.length > 0 && (
                <div className="mt-4 pt-4 border-t border-stone-100 flex items-start justify-between gap-4">
                  
                  {/* Kiri: daftar kendaraan */}
                  <div className="flex flex-wrap gap-2">
                    {p.kendaraan.map(k => (
                      <div
                        key={k.id_kendaraan}
                        className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs"
                      >
                        <Car className="w-3.5 h-3.5 text-stone-400" />
                        <span className="font-medium">{k.merk} {k.tahun}</span>
                        <span className="text-stone-400">{k.nomor_polisi}</span>
                      </div>
                    ))}
                  </div>

                  {/* Kanan: jumlah kendaraan */}
                  <span className="text-xs bg-stone-100 text-stone-600 px-2.5 py-1 rounded-full whitespace-nowrap">
                    {p.jumlah_kendaraan} kendaraan
                  </span>

                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Modal Tambah / Edit ─────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-semibold text-stone-900 text-lg">
                {editData ? 'Edit Pelanggan' : 'Tambah Pelanggan'}
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

              {/* Nama */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Nama Lengkap <span className="text-red-500">*</span></label>
                <input required value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Masukkan nama lengkap" />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Email <span className="text-red-500">*</span></label>
                <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="email@contoh.com" />
              </div>

              {/* Password — hanya saat tambah, dengan toggle show/hide */}
              {!editData && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      className="w-full px-4 py-2.5 pr-11 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Minimal 6 karakter"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword
                        ? <EyeOff className="w-4 h-4" />
                        : <Eye    className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* No. Telepon */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">No. Telepon <span className="text-red-500">*</span></label>
                <input required value={form.no_telp} onChange={e => setForm(f => ({ ...f, no_telp: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="08xxxxxxxxxx" />
              </div>

              {/* Alamat */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Alamat</label>
                <textarea value={form.alamat} onChange={e => setForm(f => ({ ...f, alamat: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  placeholder="Alamat lengkap" />
              </div>

              {/* Jenis pelanggan */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Jenis Pelanggan <span className="text-red-500">*</span></label>
                <div className="flex gap-3">
                  {(['individu', 'perusahaan'] as const).map(j => (
                    <button key={j} type="button"
                      onClick={() => setForm(f => ({ ...f, jenis_pelanggan: j }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors
                        ${form.jenis_pelanggan === j
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-stone-300 text-stone-600 hover:border-stone-400'}`}>
                      {j === 'individu' ? <User className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                      {j === 'individu' ? 'Individu' : 'Perusahaan'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field khusus perusahaan */}
              {form.jenis_pelanggan === 'perusahaan' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Nama Perusahaan <span className="text-red-500">*</span></label>
                    <input required value={form.nama_perusahaan} onChange={e => setForm(f => ({ ...f, nama_perusahaan: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="PT. Contoh Jaya" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Term of Payment <span className="text-red-500">*</span></label>
                    <div className="flex gap-3">
                      {[14, 30].map(hari => (
                        <button key={hari} type="button"
                          onClick={() => setForm(f => ({ ...f, term_of_payment: hari }))}
                          className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors
                            ${form.term_of_payment === hari
                              ? 'border-orange-500 bg-orange-50 text-orange-700'
                              : 'border-stone-300 text-stone-600 hover:border-stone-400'}`}>
                          {hari} Hari
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Tombol aksi */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 border border-stone-300 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors">
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 disabled:opacity-60 transition-colors">
                  {saving ? 'Menyimpan...' : editData ? 'Simpan Perubahan' : 'Tambah Pelanggan'}
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
            <h3 className="font-semibold text-stone-900 text-center mb-1">Hapus Pelanggan?</h3>
            <p className="text-stone-500 text-sm text-center mb-6">
              <strong>{deleteConfirm.nama}</strong> akan dihapus dari sistem. Tindakan ini tidak dapat dibatalkan.
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
