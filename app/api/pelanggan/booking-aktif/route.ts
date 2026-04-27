// app/api/pelanggan/booking-aktif/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db'
import { RowDataPacket } from 'mysql2'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'pelanggan') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const status = searchParams.get('status') ?? ''

  try {
    const [[pelanggan]] = await pool.query<RowDataPacket[]>(
      `SELECT p.id_pelanggan FROM pelanggan p
       JOIN users u ON p.id_user = u.id_user
       WHERE u.id_user = ? AND p.is_deleted = 0`,
      [session.user.id]
    )

    if (!pelanggan) {
      return NextResponse.json({ error: 'Pelanggan tidak ditemukan' }, { status: 404 })
    }

    let query = `
      SELECT
        b.id_booking,
        b.id_kendaraan,
        b.tanggal_booking,
        b.waktu_booking,
        b.keluhan,
        b.status_booking,
        b.created_at,
        k.nomor_polisi,
        k.merk,
        k.tahun,
        k.warna,
        s.id_servis,
        s.status_servis,
        um.nama AS nama_mekanik
      FROM booking b
      JOIN kendaraan k ON b.id_kendaraan = k.id_kendaraan
      LEFT JOIN servis s ON s.id_booking = b.id_booking
      LEFT JOIN mekanik m ON s.id_mekanik = m.id_mekanik
      LEFT JOIN users um ON m.id_user = um.id_user
      WHERE k.id_pelanggan = ?
        AND b.status_booking IN ('menunggu','dikonfirmasi')
    `

    const params: unknown[] = [pelanggan.id_pelanggan]

    if (search) {
      query += ` AND (k.nomor_polisi LIKE ? OR k.merk LIKE ?)`
      params.push(`%${search}%`, `%${search}%`)
    }

    if (status) {
      query += ` AND b.status_booking = ?`
      params.push(status)
    }

    query += ` ORDER BY b.created_at DESC, b.tanggal_booking DESC, b.waktu_booking DESC`

    const [rows] = await pool.query<RowDataPacket[]>(query, params)
    return NextResponse.json({ success: true, data: rows })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal memuat booking' }, { status: 500 })
  }
}