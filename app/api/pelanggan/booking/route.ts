// app/api/pelanggan/booking/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db'
import { RowDataPacket, ResultSetHeader } from 'mysql2'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'pelanggan') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [[pelanggan]] = await pool.query<RowDataPacket[]>(
      `SELECT p.id_pelanggan FROM pelanggan p
       JOIN users u ON p.id_user = u.id_user
       WHERE u.id_user = ? AND p.is_deleted = 0`,
      [session.user.id]
    )
    if (!pelanggan) return NextResponse.json({ error: 'Pelanggan tidak ditemukan' }, { status: 404 })

    const [kendaraan] = await pool.query<RowDataPacket[]>(
      `SELECT id_kendaraan, nomor_polisi, merk, tahun, warna, stnk
       FROM kendaraan WHERE id_pelanggan = ? ORDER BY id_kendaraan DESC`,
      [pelanggan.id_pelanggan]
    )

    return NextResponse.json({ success: true, data: { kendaraan, id_pelanggan: pelanggan.id_pelanggan } })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal memuat data' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'pelanggan') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id_kendaraan, keluhan, tanggal_booking, waktu_booking, kilometer } = await req.json()

    if (!id_kendaraan || !keluhan || !tanggal_booking || !waktu_booking) {
      return NextResponse.json({ error: 'Semua field wajib diisi' }, { status: 400 })
    }

    const [[pelanggan]] = await pool.query<RowDataPacket[]>(
      `SELECT p.id_pelanggan FROM pelanggan p
       JOIN users u ON p.id_user = u.id_user
       WHERE u.id_user = ? AND p.is_deleted = 0`,
      [session.user.id]
    )

    const [[kendaraan]] = await pool.query<RowDataPacket[]>(
      `SELECT id_kendaraan FROM kendaraan WHERE id_kendaraan = ? AND id_pelanggan = ?`,
      [id_kendaraan, pelanggan.id_pelanggan]
    )
    if (!kendaraan) {
      return NextResponse.json({ error: 'Kendaraan tidak ditemukan' }, { status: 404 })
    }

    // Cek kendaraan masih dalam servis aktif
    const [servisAktif] = await pool.query<RowDataPacket[]>(
      `SELECT s.id_servis FROM servis s
       JOIN booking b ON s.id_booking = b.id_booking
       WHERE b.id_kendaraan = ?
         AND s.status_servis NOT IN ('selesai', 'dibatalkan')`,
      [id_kendaraan]
    )
    if (servisAktif.length > 0) {
      return NextResponse.json(
        { error: 'Kendaraan ini masih dalam proses servis. Tunggu hingga servis selesai sebelum mengajukan yang baru.' },
        { status: 400 }
      )
    }

    // Cek kendaraan sudah ada booking aktif yang belum diproses
    const [bookingAktif] = await pool.query<RowDataPacket[]>(
      `SELECT id_booking FROM booking
       WHERE id_kendaraan = ?
         AND status_booking IN ('menunggu', 'dikonfirmasi')`,
      [id_kendaraan]
    )
    if (bookingAktif.length > 0) {
      return NextResponse.json(
        { error: 'Kendaraan ini sudah memiliki booking yang belum selesai diproses.' },
        { status: 400 }
      )
    }

    // Cek slot waktu masih tersedia
    const [[slotExist]] = await pool.query<RowDataPacket[]>(
      `SELECT id_booking FROM booking
       WHERE tanggal_booking = ?
         AND TIME_FORMAT(waktu_booking, '%H:%i') = ?
         AND status_booking NOT IN ('dibatalkan', 'ditolak')`,
      [tanggal_booking, waktu_booking]
    )
    if (slotExist) {
      return NextResponse.json(
        { error: `Slot jam ${waktu_booking} pada tanggal tersebut sudah penuh. Pilih jam lain.` },
        { status: 400 }
      )
    }

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()

      // Insert booking
      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO booking (id_kendaraan, keluhan, tanggal_booking, waktu_booking, status_booking, created_at)
         VALUES (?, ?, ?, ?, 'menunggu', NOW())`,
        [id_kendaraan, keluhan, tanggal_booking, waktu_booking + ':00']
      )

      // Update kilometer kendaraan jika dikirim
      if (kilometer && Number(kilometer) > 0) {
        await conn.query(
          `UPDATE kendaraan SET kilometer = ? WHERE id_kendaraan = ?`,
          [Number(kilometer), id_kendaraan]
        )
      }

      await conn.commit()
      return NextResponse.json({ success: true, message: 'Booking berhasil dibuat', id_booking: result.insertId })
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal membuat booking' }, { status: 500 })
  }
}
