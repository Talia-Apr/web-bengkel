// app/api/pemilik/dashboard/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db'
import { RowDataPacket } from 'mysql2'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'pemilik') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Total booking bulan ini
    const [[{ total_booking_bulan }]] = await pool.query<RowDataPacket[]>(`
      SELECT COUNT(*) AS total_booking_bulan
      FROM booking
      WHERE YEAR(tanggal_booking) = YEAR(CURDATE())
        AND MONTH(tanggal_booking) = MONTH(CURDATE())
    `)

    // 2. Kendaraan selesai (servis selesai)
    const [[{ total_selesai }]] = await pool.query<RowDataPacket[]>(`
      SELECT COUNT(*) AS total_selesai
      FROM servis
      WHERE status_servis = 'selesai'
    `)

    // 3. Total pendapatan (semua nota lunas)
    const [[{ total_pendapatan }]] = await pool.query<RowDataPacket[]>(`
      SELECT COALESCE(SUM(total_biaya), 0) AS total_pendapatan
      FROM nota
      WHERE status_pembayaran = 'lunas'
    `)

    // 4. Pendapatan bulan ini
    const [[{ pendapatan_bulan }]] = await pool.query<RowDataPacket[]>(`
      SELECT COALESCE(SUM(total_biaya), 0) AS pendapatan_bulan
      FROM nota
      WHERE status_pembayaran = 'lunas'
        AND YEAR(tanggal_pembayaran) = YEAR(CURDATE())
        AND MONTH(tanggal_pembayaran) = MONTH(CURDATE())
    `)

    // 5. Booking 6 hari terakhir
    const [weeklyData] = await pool.query<RowDataPacket[]>(`
      SELECT
        DATE(tanggal_booking) AS tanggal,
        COUNT(*) AS total
      FROM booking
      WHERE tanggal_booking >= DATE_SUB(CURDATE(), INTERVAL 8 DAY)
        AND status_booking != 'dibatalkan'
        AND DAYOFWEEK(tanggal_booking) != 1
      GROUP BY DATE(tanggal_booking)
      ORDER BY tanggal ASC
    `)

    // 6. Jasa terpopuler
    const [jasaPopuler] = await pool.query<RowDataPacket[]>(`
      SELECT
        js.nama_jasa,
        COUNT(dsj.id_detail_jasa) AS total
      FROM detail_servis_jasa dsj
      JOIN jasa_servis js ON dsj.id_jasa = js.id_jasa
      GROUP BY js.id_jasa, js.nama_jasa
      ORDER BY total DESC
      LIMIT 5
    `)

    // 7. Booking terbaru
    const [bookingTerbaru] = await pool.query<RowDataPacket[]>(`
      SELECT
        b.id_booking,
        b.tanggal_booking,
        b.keluhan,
        b.status_booking,
        k.nomor_polisi,
        k.merk,
        k.tahun,
        u.nama AS nama_pelanggan
      FROM booking b
      JOIN kendaraan k ON b.id_kendaraan = k.id_kendaraan
      JOIN pelanggan p ON k.id_pelanggan = p.id_pelanggan
      JOIN users u ON p.id_user = u.id_user
      ORDER BY b.created_at DESC
      LIMIT 5
    `)

    // 8. Booking hari ini
    const [[{ booking_hari_ini }]] = await pool.query<RowDataPacket[]>(`
      SELECT COUNT(*) AS booking_hari_ini
      FROM booking
      WHERE tanggal_booking = CURDATE()
        AND status_booking != 'dibatalkan'
    `)

    // 9. Menunggu konfirmasi
    const [[{ menunggu_konfirmasi }]] = await pool.query<RowDataPacket[]>(`
      SELECT COUNT(*) AS menunggu_konfirmasi
      FROM booking
      WHERE status_booking = 'menunggu'
    `)

    return NextResponse.json({
      success: true,
      data: {
        total_booking_bulan:  Number(total_booking_bulan),
        total_selesai:        Number(total_selesai),
        total_pendapatan:     Number(total_pendapatan),
        pendapatan_bulan:     Number(pendapatan_bulan),
        booking_hari_ini:     Number(booking_hari_ini),
        menunggu_konfirmasi:  Number(menunggu_konfirmasi),
        weekly:               weeklyData,
        jasa_populer:         jasaPopuler,
        booking_terbaru:      bookingTerbaru,
      }
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal memuat dashboard' }, { status: 500 })
  }
}