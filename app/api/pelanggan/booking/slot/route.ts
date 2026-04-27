import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db'
import { RowDataPacket } from 'mysql2'

const ALL_SLOTS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00']

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'pelanggan') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const tanggal = searchParams.get('tanggal')

  if (!tanggal) {
    return NextResponse.json({ error: 'Tanggal wajib diisi' }, { status: 400 })
  }

  try {
    const [booked] = await pool.query<RowDataPacket[]>(
      `SELECT TIME_FORMAT(waktu_booking, '%H:%i') AS waktu
       FROM booking
       WHERE tanggal_booking = ?
         AND status_booking NOT IN ('dibatalkan','ditolak')`,
      [tanggal]
    )

    const bookedSlots = booked.map(b => b.waktu)

    const slots = ALL_SLOTS.map(slot => {
      const terpakai = bookedSlots.includes(slot) ? 1 : 0
      const total = 1
      const sisa = total - terpakai

      return {
        waktu: slot,
        tersedia: sisa > 0,
        total,
        terpakai,
        sisa,
      }
    })

    return NextResponse.json({ success: true, data: slots })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal memuat slot' }, { status: 500 })
  }
}