// app/api/pelanggan/riwayat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
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
    if (!pelanggan) return NextResponse.json({ error: 'Pelanggan tidak ditemukan' }, { status: 404 })

    // Bangun WHERE conditions sebagai array lalu join
    const conditions: string[] = [
      `k.id_pelanggan = ?`,
      `b.status_booking IN ('selesai','ditolak','dibatalkan')`
    ]
    const params: unknown[] = [pelanggan.id_pelanggan]

    if (search) {
      conditions.push(`(k.nomor_polisi LIKE ? OR k.merk LIKE ?)`)
      params.push(`%${search}%`, `%${search}%`)
    }
    if (status) {
      conditions.push(`b.status_booking = ?`)
      params.push(status)
    }

    const whereClause = conditions.join(' AND ')

    const query = `
      SELECT
        b.id_booking,
        DATE_FORMAT(b.tanggal_booking, '%Y-%m-%d') AS tanggal_booking,
        b.keluhan,
        b.status_booking,
        b.created_at,
        k.nomor_polisi,
        k.merk,
        k.tahun,
        MAX(n.id_nota) AS id_nota,
        MAX(n.total_biaya) AS total_biaya,
        MAX(n.status_pembayaran) AS status_pembayaran,
        MAX(DATE_FORMAT(n.jatuh_tempo, '%Y-%m-%d')) AS jatuh_tempo,
        MAX(um.nama) AS nama_mekanik
      FROM booking b
      JOIN kendaraan k  ON b.id_kendaraan = k.id_kendaraan
      LEFT JOIN servis s   ON s.id_booking = b.id_booking
      LEFT JOIN nota n     ON n.id_servis  = s.id_servis
      LEFT JOIN mekanik m  ON s.id_mekanik = m.id_mekanik
      LEFT JOIN users um   ON m.id_user    = um.id_user
      WHERE ${whereClause}
      GROUP BY
        b.id_booking, b.tanggal_booking, b.keluhan,
        b.status_booking, b.created_at,
        k.nomor_polisi, k.merk, k.tahun
      ORDER BY b.created_at DESC
    `
    const [rows] = await pool.query<RowDataPacket[]>(query, params)
    return NextResponse.json({ success: true, data: rows })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal memuat riwayat' }, { status: 500 })
  }
}