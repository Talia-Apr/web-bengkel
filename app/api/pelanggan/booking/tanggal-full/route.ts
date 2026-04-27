import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import pool from '@/lib/db'
import { RowDataPacket } from 'mysql2'

const ALL_SLOTS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00']

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'pelanggan') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const tanggalList = searchParams.get('tanggal')?.split(',') ?? []

  if (tanggalList.length === 0) {
    return NextResponse.json({ error: 'Tanggal kosong' }, { status: 400 })
  }

  try {
    const placeholders = tanggalList.map(() => '?').join(',')

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
         tanggal_booking,
         COUNT(*) as jumlah
       FROM booking
       WHERE tanggal_booking IN (${placeholders})
         AND status_booking NOT IN ('dibatalkan','ditolak')
       GROUP BY tanggal_booking`,
      tanggalList
    )

    const result = tanggalList.map(tgl => {
      const found = rows.find(r => r.tanggal_booking === tgl)
      const jumlah = found ? found.jumlah : 0

      return {
        tanggal: tgl,
        penuh: jumlah >= ALL_SLOTS.length // semua jam terisi
      }
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal cek tanggal' }, { status: 500 })
  }
}