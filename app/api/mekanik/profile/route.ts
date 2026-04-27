// app/api/mekanik/profile/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import pool from '@/lib/db'
import { RowDataPacket } from 'mysql2'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'mekanik') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [[data]] = await pool.query<RowDataPacket[]>(
      `SELECT
         m.id_mekanik,
         m.spesialisasi,
         m.status,
         u.nama,
         u.email
       FROM mekanik m
       JOIN users u ON m.id_user = u.id_user
       WHERE u.id_user = ?`,
      [session.user.id]
    )

    if (!data) {
      return NextResponse.json({ error: 'Mekanik tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[mekanik/profile]', error)
    return NextResponse.json({ error: 'Gagal memuat profil' }, { status: 500 })
  }
}
