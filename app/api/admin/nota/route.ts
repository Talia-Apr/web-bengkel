// app/api/admin/nota/route.ts
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
  const search = searchParams.get('search') ?? ''
  const status = searchParams.get('status') ?? ''

  try {
    let query = `
      SELECT
        n.id_nota,
        n.id_servis,
        n.total_biaya,
        n.metode_pembayaran,
        n.status_pembayaran,
        n.tanggal_pembayaran,
        n.jatuh_tempo,
        n.diskon_jasa,
        n.diskon_sparepart,
        n.tanggal_nota,
        u.nama AS nama_pelanggan,
        p.jenis_pelanggan,
        p.no_telp,
        k.nomor_polisi,
        k.merk,
        k.tahun,
        um.nama AS nama_mekanik,
        CONCAT(
          'NJ/',
          YEAR(n.tanggal_nota), '/',
          DATE_FORMAT(n.tanggal_nota, '%m%d'), '/',
          LPAD(ROW_NUMBER() OVER (PARTITION BY n.tanggal_nota ORDER BY n.id_nota), 3, '0')
        ) AS nomor_nota
      FROM nota n
      JOIN servis s ON n.id_servis = s.id_servis
      JOIN booking b ON s.id_booking = b.id_booking
      JOIN kendaraan k ON b.id_kendaraan = k.id_kendaraan
      JOIN pelanggan p ON k.id_pelanggan = p.id_pelanggan
      JOIN users u ON p.id_user = u.id_user
      JOIN mekanik m ON s.id_mekanik = m.id_mekanik
      JOIN users um ON m.id_user = um.id_user
      WHERE 1=1
    `
    const params: unknown[] = []

    if (search) {
      query += ` AND (u.nama LIKE ? OR k.nomor_polisi LIKE ?)`
      params.push(`%${search}%`, `%${search}%`)
    }
    if (status) {
      query += ` AND n.status_pembayaran = ?`
      params.push(status)
    }

    // Urutkan: nota asli dulu, duplikasi langsung setelah aslinya
    query += ` ORDER BY n.id_nota DESC`

    const [rows] = await pool.query<RowDataPacket[]>(query, params)
    return NextResponse.json({ success: true, data: rows })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal memuat nota' }, { status: 500 })
  }
}