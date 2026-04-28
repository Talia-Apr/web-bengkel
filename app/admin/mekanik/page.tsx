'use client'

import { useState, useEffect, useCallback } from 'react'
import { UserCog, Wrench, Mail, Plus, Pencil, Trash2, X, Eye, EyeOff, KeyRound } from 'lucide-react'

interface Mekanik {
  id_mekanik: number
  id_user: number
  nama: string
  email: string
  spesialisasi: string
  status: 'aktif' | 'tidak_aktif'
}

const emptyForm = {
  nama: '', email: '', password: '', spesialisasi: '',
  status: 'aktif' as Mekanik['status'],
  password_baru: '', show_password_baru: false, ganti_password: false,
}

const statusConfig: Record<Mekanik['status'], { label: string; color: string; dot: string }> = {
  aktif: {
    label: 'Aktif',
    color: 'bg-green-100 text-green-700',
    dot: 'bg-green-500'
  },
  tidak_aktif: {
    label: 'Tidak Aktif',
    color: 'bg-stone-100 text-stone-500',
    dot: 'bg-stone-400'
  },
}

export default function AdminMekanikPage() {
  const [mekaniks, setMekaniks]           = useState<Mekanik[]>([])
  const [loading, setLoading]             = useState(true)
  const [modalOpen, setModalOpen]         = useState(false)
  const [editData, setEditData]           = useState<Mekanik | null>(null)
  const [form, setForm]                   = useState(emptyForm)
  const [saving, setSaving]               = useState(false)
  const [error, setError]                 = useState('')
  const [showPassword, setShowPassword]   = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Mekanik | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/admin/mekanik')
    const json = await res.json()
    if (json.success) setMekaniks(json.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openAdd = () => {
    setEditData(null)
    setForm(emptyForm)
    setShowPassword(false)
    setError('')
    setModalOpen(true)
  }

  const openEdit = (m: Mekanik) => {
    setEditData(m)
    setForm({
      nama: m.nama, email: m.email, password: '',
      spesialisasi: m.spesialisasi, status: m.status,
      password_baru: '', show_password_baru: false, ganti_password: false,
    })
    setShowPassword(false)
    setError('')
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    const url    = editData ? `/api/admin/mekanik/${editData.id_mekanik}` : '/api/admin/mekanik'
    const method = editData ? 'PUT' : 'POST'

    const body = editData
      ? { nama: form.nama, email: form.email, spesialisasi: form.spesialisasi, status: form.status, password_baru: form.ganti_password ? form.password_baru : '' }
      : { nama: form.nama, email: form.email, password: form.password, spesialisasi: form.spesialisasi }

    const res  = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
    const res  = await fetch(`/api/admin/mekanik/${deleteConfirm.id_mekanik}`, { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok) { alert(json.error); return }
    setDeleteConfirm(null)
    fetchData()
  }

  const aktif      = mekaniks.filter(m => m.status?.trim().toLowerCase() === 'aktif').length
  const tidakAktif = mekaniks.filter(m => m.status?.trim().toLowerCase() === 'tidak_aktif').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-display text-2xl font-bold text-stone-900">Data Mekanik</h2>
          <p className="text-stone-500 text-sm mt-1">
            {mekaniks.length} mekanik · {aktif} aktif · {tidakAktif} tidak aktif
          </p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-700 transition-colors">
          <Plus className="w-4 h-4" /> Tambah Mekanik
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-stone-400 text-sm">Memuat data...</div>
        ) : mekaniks.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-stone-400">
            <UserCog className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Belum ada mekanik terdaftar</p>
          </div>
        ) : (
          mekaniks.map(m => {
            const normalStatus = (m.status?.trim().toLowerCase() ?? 'tidak_aktif') as Mekanik['status']
            const cfg = statusConfig[normalStatus] ?? statusConfig['tidak_aktif']
            return (
              <div key={m.id_mekanik} className="bg-white border border-stone-200 rounded-xl p-6 hover:border-stone-300 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-stone-900 rounded-xl flex items-center justify-center font-bold text-white font-display text-xl">
                    {m.nama.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${cfg.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>
                </div>
                <h3 className="font-semibold text-stone-900 text-lg leading-tight">{m.nama}</h3>
                <div className="flex items-center gap-2 mt-1 mb-4">
                  <Wrench className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  <span className="text-sm text-stone-600">{m.spesialisasi}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{m.email}</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => openEdit(m)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm bg-yellow-500 text-white hover:bg-yellow-700 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>

                  <button
                    onClick={() => setDeleteConfirm(m)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm bg-red-500 text-white hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Hapus
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── Modal Tambah / Edit ─────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-semibold text-stone-900 text-lg">
                {editData ? 'Edit Mekanik' : 'Tambah Mekanik'}
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
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input required value={form.nama}
                  onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Masukkan nama lengkap" />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <input required type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="email@bengkel.com" />
              </div>

              {/* Password — hanya saat tambah */}
              {!editData && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input required type={showPassword ? 'text' : 'password'} value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      className="w-full px-4 py-2.5 pr-11 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Minimal 6 karakter" minLength={6} />
                    <button type="button" onClick={() => setShowPassword(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                      {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Spesialisasi */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Spesialisasi <span className="text-red-500">*</span>
                </label>
                <input required value={form.spesialisasi}
                  onChange={e => setForm(f => ({ ...f, spesialisasi: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Contoh: Mesin & Tune Up" />
              </div>

              {/* Status — hanya saat edit */}
              {editData && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Status</label>
                  <div className="flex gap-2">
                    {(Object.entries(statusConfig) as [Mekanik['status'], { label: string; color: string; dot: string }][]).map(([val, cfg]) => (
                      <button key={val} type="button"
                        onClick={() => setForm(f => ({ ...f, status: val }))}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-medium transition-colors
                          ${form.status === val
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-stone-300 text-stone-600 hover:border-stone-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Reset password — hanya saat edit */}
              {editData && (
                <div className="border border-stone-200 rounded-xl overflow-hidden">
                  {/* Toggle ganti password */}
                  <button type="button"
                    onClick={() => setForm(f => ({ ...f, ganti_password: !f.ganti_password, password_baru: '' }))}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors
                      ${form.ganti_password ? 'bg-orange-50 text-orange-700' : 'text-stone-600 hover:bg-stone-50'}`}>
                    <KeyRound className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-left">Ganti Password</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${form.ganti_password ? 'bg-orange-100 text-orange-600' : 'bg-stone-100 text-stone-500'}`}>
                      {form.ganti_password ? 'Aktif' : 'Kosongkan jika tidak ingin ganti'}
                    </span>
                  </button>

                  {/* Input password baru */}
                  {form.ganti_password && (
                    <div className="px-4 pb-4 pt-2 border-t border-stone-100">
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">
                        Password Baru <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          required={form.ganti_password}
                          type={form.show_password_baru ? 'text' : 'password'}
                          value={form.password_baru}
                          onChange={e => setForm(f => ({ ...f, password_baru: e.target.value }))}
                          className="w-full px-4 py-2.5 pr-11 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="Minimal 6 karakter"
                          minLength={6}
                        />
                        <button type="button"
                          onClick={() => setForm(f => ({ ...f, show_password_baru: !f.show_password_baru }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                          {form.show_password_baru ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tombol aksi */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 border border-stone-300 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors">
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 disabled:opacity-60 transition-colors">
                  {saving ? 'Menyimpan...' : editData ? 'Simpan Perubahan' : 'Tambah Mekanik'}
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
            <h3 className="font-semibold text-stone-900 text-center mb-1">Hapus Mekanik?</h3>
            <p className="text-stone-500 text-sm text-center mb-6">
              <strong>{deleteConfirm.nama}</strong> akan dihapus dari sistem beserta akun loginnya.
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
