// app/api/pelanggan/nota/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db'
import { RowDataPacket } from 'mysql2'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'pelanggan') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const id_nota = Number(params.id)

    // Verifikasi nota milik pelanggan ini
    const [[pelanggan]] = await pool.query<RowDataPacket[]>(
      `SELECT p.id_pelanggan FROM pelanggan p
       JOIN users u ON p.id_user = u.id_user
       WHERE u.id_user = ? AND p.is_deleted = 0`,
      [session.user.id]
    )
    if (!pelanggan) return NextResponse.json({ error: 'Pelanggan tidak ditemukan' }, { status: 404 })

    const [[nota]] = await pool.query<RowDataPacket[]>(`
      SELECT
        n.id_nota,
        n.id_servis,
        n.total_biaya,
        n.metode_pembayaran,
        n.status_pembayaran,
        DATE_FORMAT(n.tanggal_pembayaran, '%Y-%m-%d') AS tanggal_pembayaran,
        DATE_FORMAT(n.jatuh_tempo, '%Y-%m-%d') AS jatuh_tempo,
        n.diskon_jasa,
        n.diskon_sparepart,
        DATE_FORMAT(n.tanggal_nota, '%Y-%m-%d') AS tanggal_nota,
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
          LPAD(
            ROW_NUMBER() OVER (PARTITION BY DATE(n.tanggal_nota) ORDER BY n.id_nota),
            3,
            '0'
          )
        ) AS nomor_nota

      FROM nota n
      JOIN servis s ON n.id_servis = s.id_servis
      JOIN booking b ON s.id_booking = b.id_booking
      JOIN kendaraan k ON b.id_kendaraan = k.id_kendaraan
      JOIN pelanggan p ON k.id_pelanggan = p.id_pelanggan
      JOIN users u ON p.id_user = u.id_user
      JOIN mekanik m ON s.id_mekanik = m.id_mekanik
      JOIN users um ON m.id_user = um.id_user
      WHERE n.id_nota = ? AND p.id_pelanggan = ?
    `, [id_nota, pelanggan.id_pelanggan])

    if (!nota) return NextResponse.json({ error: 'Nota tidak ditemukan' }, { status: 404 })

    const [detail] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM detail_nota WHERE id_nota = ? ORDER BY jenis_item, id_detail_nota`,
      [id_nota]
    )

    return NextResponse.json({ success: true, data: { nota, detail } })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal memuat nota' }, { status: 500 })
  }
}
