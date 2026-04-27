// app/api/mekanik/tugas/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import pool from '@/lib/db'
import { RowDataPacket } from 'mysql2'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'mekanik') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [[mekanik]] = await pool.query<RowDataPacket[]>(
      `SELECT m.id_mekanik, m.spesialisasi, m.status, u.nama
       FROM mekanik m
       JOIN users u ON m.id_user = u.id_user
       WHERE u.id_user = ?`,
      [session.user.id]
    )
    if (!mekanik) {
      return NextResponse.json({ error: 'Mekanik tidak ditemukan' }, { status: 404 })
    }

    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        s.id_servis,
        s.id_booking,
        s.tanggal_servis,
        s.waktu_servis,
        s.catatan_servis,
        s.status_servis,
        b.keluhan,
        b.tanggal_booking,
        b.waktu_booking,
        k.nomor_polisi,
        k.merk,
        k.tahun,
        k.warna,
        k.kilometer,
        u.nama        AS nama_pelanggan,
        p.no_telp,
        p.jenis_pelanggan
      FROM servis s
      JOIN booking b    ON s.id_booking    = b.id_booking
      JOIN kendaraan k  ON b.id_kendaraan  = k.id_kendaraan
      JOIN pelanggan p  ON k.id_pelanggan  = p.id_pelanggan
      JOIN users u      ON p.id_user       = u.id_user
      WHERE s.id_mekanik = ?
      ORDER BY
        FIELD(s.status_servis,
          'dikonfirmasi','dalam_pengerjaan','test_drive',
          'menunggu_konfirmasi','selesai'),
        s.tanggal_servis DESC
    `, [mekanik.id_mekanik])

    return NextResponse.json({
      success:    true,
      data:       rows,
      mekanik,
      id_mekanik: mekanik.id_mekanik,
    })
  } catch (error) {
    console.error('[mekanik/tugas GET]', error)
    return NextResponse.json({ error: 'Gagal memuat tugas' }, { status: 500 })
  }
}
