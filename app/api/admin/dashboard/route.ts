// app/api/admin/dashboard/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import pool from '@/lib/db'
import { RowDataPacket } from 'mysql2'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const today = new Date(Date.now() + 7 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    // Booking hari ini (bukan ditolak/dibatalkan)
    const [[{ total_booking_hari_ini }]] = await pool.query<RowDataPacket[]>(`
      SELECT COUNT(*) AS total_booking_hari_ini FROM booking
      WHERE tanggal_booking = ? AND status_booking NOT IN ('ditolak','dibatalkan')
    `, [today])

    // Booking menunggu konfirmasi
    const [[{ booking_menunggu }]] = await pool.query<RowDataPacket[]>(`
      SELECT COUNT(*) AS booking_menunggu FROM booking
      WHERE status_booking = 'menunggu'
    `)

    // Servis sedang berjalan
    const [[{ servis_berjalan }]] = await pool.query<RowDataPacket[]>(`
      SELECT COUNT(*) AS servis_berjalan FROM servis
      WHERE status_servis IN ('dikonfirmasi','dalam_pengerjaan','test_drive')
    `)

    // Selesai hari ini
    const [[{ selesai_hari_ini }]] = await pool.query<RowDataPacket[]>(`
      SELECT COUNT(*) AS selesai_hari_ini FROM servis
      WHERE status_servis = 'selesai' AND tanggal_servis = ?
    `, [today])

    // Nota belum lunas
    const [[{ nota_belum_lunas }]] = await pool.query<RowDataPacket[]>(`
      SELECT COUNT(*) AS nota_belum_lunas FROM nota
      WHERE status_pembayaran = 'belum_lunas'
    `)

    // Booking hari ini (detail untuk tabel)
    const [bookings] = await pool.query<RowDataPacket[]>(`
      SELECT
        b.id_booking,
        b.tanggal_booking,
        b.waktu_booking,
        b.keluhan,
        b.status_booking,
        k.nomor_polisi,
        k.merk,
        k.tahun,
        u.nama AS nama_pelanggan,
        p.no_telp,
        CONCAT(k.merk, ' ', ' ', k.tahun) AS info_kendaraan
      FROM booking b
      JOIN kendaraan k ON b.id_kendaraan = k.id_kendaraan
      JOIN pelanggan p ON k.id_pelanggan = p.id_pelanggan
      JOIN users u ON p.id_user = u.id_user
      WHERE b.tanggal_booking = ?
        AND b.status_booking NOT IN ('ditolak','dibatalkan')
      ORDER BY b.waktu_booking ASC
      LIMIT 10
    `, [today])

    // Status mekanik
    const [mekaniks] = await pool.query<RowDataPacket[]>(`
      SELECT
        m.id_mekanik,
        m.spesialisasi,
        m.status,
        u.nama
      FROM mekanik m
      JOIN users u ON m.id_user = u.id_user
      ORDER BY u.nama ASC
    `)

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          total_booking_hari_ini,
          booking_menunggu,
          servis_berjalan,
          selesai_hari_ini,
          nota_belum_lunas,
        },
        bookings,
        mekaniks,
      }
    })

  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Gagal memuat data dashboard' }, { status: 500 })
  }
}
