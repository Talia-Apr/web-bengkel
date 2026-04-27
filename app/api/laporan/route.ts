// app/api/laporan/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db'
import { RowDataPacket } from 'mysql2'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['admin', 'pemilik'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const periode = searchParams.get('periode') ?? '' // format: YYYY-MM

  if (!periode) {
    return NextResponse.json({ error: 'Periode wajib diisi' }, { status: 400 })
  }

  const [tahun, bulan] = periode.split('-')

  try {
    // Data laporan utama — satu baris = satu servis
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        s.id_servis,
        b.id_booking,
        n.id_nota,
        -- Pelanggan
        u.nama AS nama_pelanggan,
        p.jenis_pelanggan,
        p.nama_perusahaan,
        p.no_telp,
        p.term_of_payment,
        -- Kendaraan
        k.nomor_polisi,
        k.merk,
        k.tahun,
        k.warna,
        -- Mekanik
        um.nama AS nama_mekanik,
        -- Tanggal
        b.tanggal_booking,
        s.tanggal_servis AS tanggal_selesai,
        n.tanggal_nota,
        n.tanggal_pembayaran,
        n.jatuh_tempo,
        -- Keuangan
        n.total_biaya,
        n.diskon_jasa,
        n.diskon_sparepart,
        n.metode_pembayaran,
        n.status_pembayaran,
        -- Kategori pembayaran
        CASE
          WHEN p.jenis_pelanggan = 'perusahaan' THEN 'Piutang'
          ELSE 'Tunai'
        END AS kategori_pembayaran,
        -- Jasa servis (digabung)
        (
          SELECT GROUP_CONCAT(CONCAT(js.nama_jasa, ' (', FORMAT(dsj.harga, 0), ')') SEPARATOR ' | ')
          FROM detail_servis_jasa dsj
          JOIN jasa_servis js ON dsj.id_jasa = js.id_jasa
          WHERE dsj.id_servis = s.id_servis
        ) AS detail_jasa,
        (
          SELECT COALESCE(SUM(dsj.harga), 0)
          FROM detail_servis_jasa dsj
          WHERE dsj.id_servis = s.id_servis
        ) AS subtotal_jasa,
        -- Sparepart (digabung)
        (
          SELECT GROUP_CONCAT(CONCAT(sp.nama_sparepart, ' x', ds.jumlah, ' (', FORMAT(ds.subtotal, 0), ')') SEPARATOR ' | ')
          FROM detail_sparepart ds
          JOIN sparepart sp ON ds.id_sparepart = sp.id_sparepart
          WHERE ds.id_servis = s.id_servis
        ) AS detail_sparepart,
        (
          SELECT COALESCE(SUM(ds.subtotal), 0)
          FROM detail_sparepart ds
          WHERE ds.id_servis = s.id_servis
        ) AS subtotal_sparepart
      FROM servis s
      JOIN booking b ON s.id_booking = b.id_booking
      JOIN kendaraan k ON b.id_kendaraan = k.id_kendaraan
      JOIN pelanggan p ON k.id_pelanggan = p.id_pelanggan
      JOIN users u ON p.id_user = u.id_user
      LEFT JOIN nota n ON n.id_servis = s.id_servis
      LEFT JOIN mekanik m ON s.id_mekanik = m.id_mekanik
      LEFT JOIN users um ON m.id_user = um.id_user
      WHERE s.status_servis = 'selesai'
        AND YEAR(s.tanggal_servis) = ?
        AND MONTH(s.tanggal_servis) = ?
      ORDER BY s.tanggal_servis ASC, s.id_servis ASC
    `, [tahun, bulan])

    // Summary
    const [[summary]] = await pool.query<RowDataPacket[]>(`
      SELECT
        COUNT(DISTINCT s.id_servis) AS total_servis,
        COUNT(DISTINCT CASE WHEN n.status_pembayaran = 'lunas' THEN s.id_servis END) AS total_lunas,
        COUNT(DISTINCT CASE WHEN n.status_pembayaran = 'belum_lunas' THEN s.id_servis END) AS total_piutang,
        COALESCE(SUM(CASE WHEN n.status_pembayaran = 'lunas' THEN n.total_biaya END), 0) AS total_pendapatan_lunas,
        COALESCE(SUM(CASE WHEN n.status_pembayaran = 'belum_lunas' THEN n.total_biaya END), 0) AS total_piutang_amount,
        COALESCE(SUM(n.total_biaya), 0) AS total_keseluruhan
      FROM servis s
      JOIN booking b ON s.id_booking = b.id_booking
      JOIN kendaraan k ON b.id_kendaraan = k.id_kendaraan
      LEFT JOIN nota n ON n.id_servis = s.id_servis
      WHERE s.status_servis = 'selesai'
        AND YEAR(s.tanggal_servis) = ?
        AND MONTH(s.tanggal_servis) = ?
    `, [tahun, bulan])

    return NextResponse.json({ success: true, data: rows, summary })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal memuat laporan' }, { status: 500 })
  }
}
