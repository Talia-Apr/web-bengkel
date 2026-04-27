// app/api/auth/check-email/route.ts  ← file BARU
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { RowDataPacket } from 'mysql2'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ exists: false })

  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id_user FROM users WHERE email = ?', [email]
  )
  return NextResponse.json({ exists: rows.length > 0 })
}