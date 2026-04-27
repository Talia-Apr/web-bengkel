// app/api/pelanggan/booking/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db'
import { RowDataPacket } from 'mysql2'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'pelanggan') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const id   = Number(params.id)
    const { action } = await req.json()

    // Verifikasi booking milik pelanggan ini
    const [[booking]] = await pool.query<RowDataPacket[]>(`
      SELECT b.id_booking, b.status_booking
      FROM booking b
      JOIN kendaraan k ON b.id_kendaraan = k.id_kendaraan
      JOIN pelanggan p ON k.id_pelanggan = p.id_pelanggan
      JOIN users u ON p.id_user = u.id_user
      WHERE b.id_booking = ? AND u.id_user = ?
    `, [id, session.user.id])

    if (!booking) {
      return NextResponse.json({ error: 'Booking tidak ditemukan' }, { status: 404 })
    }

    if (action === 'batal') {
      if (booking.status_booking !== 'menunggu') {
        return NextResponse.json(
          { error: 'Booking hanya bisa dibatalkan saat masih menunggu konfirmasi' },
          { status: 400 }
        )
      }
      await pool.query(
        `UPDATE booking SET status_booking = 'dibatalkan' WHERE id_booking = ?`, [id]
      )
      return NextResponse.json({ success: true, message: 'Booking berhasil dibatalkan' })
    }

    return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal memperbarui booking' }, { status: 500 })
  }
}
