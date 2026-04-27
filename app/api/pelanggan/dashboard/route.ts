// app/api/pelanggan/dashboard/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import pool from '@/lib/db'
import { RowDataPacket } from 'mysql2'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'pelanggan') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [[pelanggan]] = await pool.query<RowDataPacket[]>(
      `SELECT p.id_pelanggan, p.no_telp, p.jenis_pelanggan, p.nama_perusahaan,
              u.nama, u.email
       FROM pelanggan p JOIN users u ON p.id_user = u.id_user
       WHERE u.id_user = ? AND p.is_deleted = 0`,
      [session.user.id]
    )
    if (!pelanggan) return NextResponse.json({ error: 'Pelanggan tidak ditemukan' }, { status: 404 })

    // Servis sedang dikerjakan (dalam_pengerjaan, test_drive)
    const [berjalan] = await pool.query<RowDataPacket[]>(`
      SELECT
        b.id_booking, b.tanggal_booking, b.keluhan,
        k.nomor_polisi, k.merk, k.tahun,
        s.id_servis, s.status_servis, s.catatan_servis,
        um.nama AS nama_mekanik
      FROM booking b
      JOIN kendaraan k ON b.id_kendaraan = k.id_kendaraan
      JOIN servis s ON s.id_booking = b.id_booking
      LEFT JOIN mekanik m ON s.id_mekanik = m.id_mekanik
      LEFT JOIN users um ON m.id_user = um.id_user
      WHERE k.id_pelanggan = ?
        AND s.status_servis IN ('dalam_pengerjaan','test_drive')
      ORDER BY b.tanggal_booking ASC
    `, [pelanggan.id_pelanggan])

    // Statistik
    const [[stats]] = await pool.query<RowDataPacket[]>(`
      SELECT
        COUNT(*) AS total_booking,
        SUM(CASE WHEN b.status_booking IN ('menunggu','dikonfirmasi') THEN 1 ELSE 0 END) AS menunggu,
        SUM(CASE WHEN b.status_booking = 'selesai' THEN 1 ELSE 0 END) AS selesai
      FROM booking b
      JOIN kendaraan k ON b.id_kendaraan = k.id_kendaraan
      WHERE k.id_pelanggan = ?
    `, [pelanggan.id_pelanggan])

    return NextResponse.json({ success: true, data: { pelanggan, berjalan, stats } })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal memuat dashboard' }, { status: 500 })
  }
}
