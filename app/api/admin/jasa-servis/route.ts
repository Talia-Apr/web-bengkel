// app/api/admin/jasa-servis/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db'
import { RowDataPacket, ResultSetHeader } from 'mysql2'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''

  try {
    let query = `
      SELECT id_jasa, kode_jasa, nama_jasa, keterangan, harga_jasa 
      FROM jasa_servis WHERE 1=1
    `
    const params: unknown[] = []

    if (search) {
      query += ` AND (nama_jasa LIKE ? OR kode_jasa LIKE ?)`
      params.push(`%${search}%`, `%${search}%`)
    }

    query += ` ORDER BY kode_jasa ASC`

    const [rows] = await pool.query<RowDataPacket[]>(query, params)
    return NextResponse.json({ success: true, data: rows })
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memuat data jasa servis' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { kode_jasa, nama_jasa, harga_jasa, keterangan } = await req.json()

    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id_jasa FROM jasa_servis WHERE kode_jasa = ?', [kode_jasa]
    )
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Kode jasa sudah digunakan' }, { status: 400 })
    }

    await pool.query(
      `INSERT INTO jasa_servis (kode_jasa, nama_jasa, keterangan, harga_jasa)
       VALUES (?, ?, ?, ?)`,
      [kode_jasa, nama_jasa, keterangan, harga_jasa]
    )

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Gagal menambahkan jasa servis' }, { status: 500 })
  }
}
