// app/api/admin/sparepart/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db'
import { RowDataPacket, ResultSetHeader } from 'mysql2'

const MIN_STOK = 5

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const status = searchParams.get('status') ?? '' 

  try {
    let query = `
      SELECT id_sparepart, kode_sparepart, nama_sparepart, mobil,
             harga_beli, harga_jual, stok, satuan
      FROM sparepart 
      WHERE is_deleted = 0
    `
    const params: unknown[] = []

    if (search) {
      query += ` AND (nama_sparepart LIKE ? OR kode_sparepart LIKE ?)`
      params.push(`%${search}%`, `%${search}%`)
    }

    // filter status
    if (status === 'rendah') {
      query += ` AND stok <= ?`
      params.push(MIN_STOK)
    } else if (status === 'aman') {
      query += ` AND stok > ?`
      params.push(MIN_STOK)
    }

    query += ` ORDER BY kode_sparepart ASC`

    const [rows] = await pool.query<RowDataPacket[]>(query, params)

    const dataWithStatus = rows.map((item) => ({
      ...item,
      status: item.stok <= MIN_STOK ? 'rendah' : 'aman',
    }))

    return NextResponse.json({
      success: true,
      data: dataWithStatus,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal memuat data sparepart' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { kode_sparepart, nama_sparepart, mobil, harga_beli, harga_jual, stok, satuan } = await req.json()

    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id_sparepart FROM sparepart WHERE kode_sparepart = ? AND is_deleted = 0', 
      [kode_sparepart]
    )

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Kode sparepart sudah digunakan' }, { status: 400 })
    }

    await pool.query<ResultSetHeader>(
      `INSERT INTO sparepart 
       (kode_sparepart, nama_sparepart, mobil, harga_beli, harga_jual, stok, satuan, is_deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [kode_sparepart, nama_sparepart, mobil, harga_beli, harga_jual, stok, satuan]
    )

    return NextResponse.json({ success: true, message: 'Sparepart berhasil ditambahkan' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal menambahkan sparepart' }, { status: 500 })
  }
}