// app/api/admin/booking/search-pelanggan/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db'
import { RowDataPacket } from 'mysql2'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') ?? ''

  if (q.length < 2) {
    return NextResponse.json({ success: true, data: [] })
  }

  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        p.id_pelanggan,
        p.no_telp,
        p.jenis_pelanggan,
        p.nama_perusahaan,
        u.nama,
        u.email,
        COUNT(k.id_kendaraan) AS jumlah_kendaraan
      FROM pelanggan p
      JOIN users u ON p.id_user = u.id_user
      LEFT JOIN kendaraan k ON k.id_pelanggan = p.id_pelanggan
      WHERE p.is_deleted = 0
        AND (u.nama LIKE ? OR p.no_telp LIKE ? OR u.email LIKE ?)
      GROUP BY p.id_pelanggan
      LIMIT 10
    `, [`%${q}%`, `%${q}%`, `%${q}%`])

    return NextResponse.json({ success: true, data: rows })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal mencari pelanggan' }, { status: 500 })
  }
}
