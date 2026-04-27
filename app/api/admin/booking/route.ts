// app/api/admin/booking/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db'
import { RowDataPacket, ResultSetHeader } from 'mysql2'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const search  = searchParams.get('search')  ?? ''
  const status  = searchParams.get('status')  ?? ''
  const tanggal = searchParams.get('tanggal') ?? ''

  try {
    let query = `
      SELECT
        b.id_booking,
        b.tanggal_booking,
        b.waktu_booking,
        b.keluhan,
        b.status_booking,
        b.created_at,
        k.id_kendaraan,
        k.nomor_polisi,
        k.merk,
        k.tahun,
        k.warna,
        u.nama AS nama_pelanggan,
        p.no_telp,
        p.id_pelanggan,
        s.id_servis,
        s.id_mekanik,
        um.nama AS nama_mekanik
      FROM booking b
      JOIN kendaraan k ON b.id_kendaraan = k.id_kendaraan
      JOIN pelanggan p ON k.id_pelanggan = p.id_pelanggan
      JOIN users u ON p.id_user = u.id_user
      LEFT JOIN servis s ON s.id_booking = b.id_booking
      LEFT JOIN mekanik m ON s.id_mekanik = m.id_mekanik
      LEFT JOIN users um ON m.id_user = um.id_user
      WHERE 1=1
    `
    const params: unknown[] = []

    if (search) {
      query += ` AND (u.nama LIKE ? OR k.nomor_polisi LIKE ?)`
      params.push(`%${search}%`, `%${search}%`)
    }
    if (status) {
      query += ` AND b.status_booking = ?`
      params.push(status)
    }
    if (tanggal) {
      query += ` AND b.tanggal_booking = ?`
      params.push(tanggal)
    }

    query += ` ORDER BY b.created_at DESC`

    const [rows] = await pool.query<RowDataPacket[]>(query, params)
    return NextResponse.json({ success: true, data: rows })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal memuat data booking' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id_kendaraan, keluhan, tanggal_booking, waktu_booking } = await req.json()

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO booking (id_kendaraan, keluhan, tanggal_booking, waktu_booking, status_booking, created_at)
       VALUES (?, ?, ?, ?, 'dikonfirmasi', NOW())`,
      [id_kendaraan, keluhan, tanggal_booking, waktu_booking]
    )

    return NextResponse.json({
      success: true,
      message: 'Booking berhasil ditambahkan',
      id_booking: result.insertId
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal menambahkan booking' }, { status: 500 })
  }
}
