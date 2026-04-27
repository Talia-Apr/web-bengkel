// ============================================================
// types/index.ts 
// ============================================================

// ── Role ─────────────────────────────────────────────────────
export type UserRole = 'admin' | 'mekanik' | 'pelanggan' | 'pemilik'

// ── Users ────────────────────────────────────────────────────
export interface User {
  id_user: number
  nama: string
  email: string
  password?: string         
  role: UserRole
  created_at: string
  updated_at: string
}

// ── Pelanggan ────────────────────────────────────────────────
export type JenisPelanggan = 'individu' | 'perusahaan'

export interface Pelanggan {
  id_pelanggan: number
  id_user: number
  no_telp: string
  alamat: string
  jenis_pelanggan: JenisPelanggan
  nama_perusahaan: string | null  // hanya jika perusahaan
  term_of_payment: number | null  // hari: 14 atau 30, null jika individu
  is_deleted: boolean
  created_at: string
  // join fields
  nama?: string
  email?: string
}

// ── Kendaraan ────────────────────────────────────────────────
export interface Kendaraan {
  id_kendaraan: number
  id_pelanggan: number
  nomor_polisi: string
  merk: string
  tahun: number
  warna: string
  kilometer: number
  stnk: string
  no_mesin: string
  no_rangka: string
  kategori_mobil: string
  // join fields
  nama_pelanggan?: string
}

// ── Mekanik ──────────────────────────────────────────────────
export type StatusMekanik = 'tersedia' | 'sibuk' | 'tidak_aktif'

export interface Mekanik {
  id_mekanik: number
  id_user: number
  spesialisasi: string
  status: StatusMekanik
  // join fields
  nama?: string
  email?: string
}

// ── Booking ──────────────────────────────────────────────────
export type StatusBooking =
  | 'menunggu'      // pelanggan baru submit
  | 'dikonfirmasi'  // admin sudah assign mekanik
  | 'ditolak'       // admin tolak
  | 'dibatalkan'    // pelanggan batalkan
  | 'selesai'       // servis selesai

export interface Booking {
  id_booking: number
  id_kendaraan: number
  keluhan: string
  tanggal_booking: string   // YYYY-MM-DD
  waktu_booking: string     // HH:mm:ss
  status_booking: StatusBooking
  created_at: string
  // join fields
  id_pelanggan?: number
  nama_pelanggan?: string
  no_telp?: string
  nomor_polisi?: string
  merk?: string
  tahun?: number
  id_mekanik?: number
  nama_mekanik?: string
}

// ── Servis ───────────────────────────────────────────────────
export type StatusServis =
  | 'menunggu_konfirmasi'   // mekanik belum konfirmasi
  | 'dikonfirmasi'          // mekanik konfirmasi, belum mulai
  | 'dalam_pengerjaan'      // sedang dikerjakan
  | 'test_drive'            // tahap test drive
  | 'selesai'               // mekanik tandai selesai

export interface Servis {
  id_servis: number
  id_booking: number
  id_mekanik: number
  tanggal_servis: string    // YYYY-MM-DD
  waktu_servis: string      // HH:mm:ss
  catatan_servis: string
  status_servis: StatusServis
  // join fields
  nama_mekanik?: string
  keluhan?: string
  nomor_polisi?: string
  merk?: string
  nama_pelanggan?: string
}

// ── Jasa Servis ──────────────────────────────────────────────
export interface JasaServis {
  id_jasa: number
  kode_jasa: string
  nama_jasa: string
  harga_jasa: number
}

// ── Sparepart ────────────────────────────────────────────────
export interface Sparepart {
  id_sparepart: number
  kode_sparepart: string
  nama_sparepart: string
  mobil: string
  kategori: string
  harga_beli: number
  harga_jual: number  
  stok: number
  satuan: string
  is_deleted: boolean
}

// ── Detail Servis Jasa ────────────────────────────────────────
export interface DetailServisJasa {
  id_detail_jasa: number
  id_servis: number
  id_jasa: number
  harga: number
  // join fields
  kode_jasa?: string
  nama_jasa?: string
}

// ── Detail Sparepart ──────────────────────────────────────────
export interface DetailSparepart {
  id_detail_sparepart: number
  id_servis: number
  id_sparepart: number
  jumlah: number
  subtotal: number
  // join fields
  kode_sparepart?: string
  nama_sparepart?: string
  harga_jual?: number
  satuan?: string
}

// ── Nota ─────────────────────────────────────────────────────
export type MetodePembayaran = 'tunai' | 'transfer' | 'tempo'
export type StatusPembayaran = 'belum_lunas' | 'lunas'

export interface Nota {
  id_nota: number
  id_servis: number
  total_biaya: number
  metode_pembayaran: MetodePembayaran
  status_pembayaran: StatusPembayaran
  tanggal_pembayaran: string | null
  jatuh_tempo: string | null          // untuk pelanggan perusahaan
  diskon_jasa: number
  diskon_sparepart: number
  tanggal_nota: string
  // join fields
  nama_pelanggan?: string
  nomor_polisi?: string
  merk?: string
  nama_mekanik?: string
  detail_jasa?: DetailServisJasa[]
  detail_sparepart?: DetailSparepart[]
}

// ── Detail Nota ───────────────────────────────────────────────
export type JenisItem = 'jasa' | 'sparepart'

export interface DetailNota {
  id_detail_nota: number
  id_nota: number
  nama_item: string
  jenis_item: JenisItem
  harga: number
  qty: number
  subtotal: number
}

// ── Follow Up ─────────────────────────────────────────────────
export type JenisFollowUp = '3_hari' | '3_bulan' | '6_bulan'
export type StatusFollowUp = 'perlu_followup' | 'sudah_dihubungi'

export interface FollowUp {
  id_followup: number
  id_pelanggan: number
  jenis_followup: JenisFollowUp
  tanggal_followup: string
  status: StatusFollowUp
  // join fields
  nama_pelanggan?: string
  no_telp?: string
  nomor_polisi?: string
  merk?: string
  tanggal_servis_terakhir?: string
}

// ── Status Log (timeline servis) ──────────────────────────────
export interface StatusLog {
  id_log: number
  id_servis: number
  status: StatusServis
  keterangan: string
  waktu_perubahan: string
}

// ── Query Cache (Text-to-SQL) ─────────────────────────────────
export interface QueryCache {
  id_cache: number
  pertanyaan: string
  sql_query: string
  hasil_query: string
  created_at: string
  updated_at: string
}

// ============================================================
// Response API
// ============================================================

// Dashboard pemilik
export interface DashboardPemilikStats {
  total_booking_hari_ini: number
  total_mobil_masuk: number
  total_pelanggan: number
  estimasi_pendapatan: number
  booking_menunggu: number
  servis_berjalan: number
  selesai_hari_ini: number
}

// Dashboard admin
export interface DashboardAdminStats {
  booking_menunggu: number
  servis_berjalan: number
  selesai_hari_ini: number
  nota_belum_lunas: number
}

// Dashboard mekanik
export interface DashboardMekanikStats {
  tugas_aktif: number
  selesai_hari_ini: number
  total_servis: number
}

// Untuk kalkulasi nota
export interface KalkulasiNota {
  subtotal_jasa: number
  subtotal_sparepart: number
  diskon_jasa: number
  diskon_sparepart: number
  total_biaya: number
}

// Response API generik
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// Untuk Text-to-SQL (analytics pemilik)
export interface QueryResult {
  sql: string
  columns: string[]
  rows: Record<string, unknown>[]
  cached: boolean
}