// app/api/admin/booking/kendaraan/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db'
import { RowDataPacket, ResultSetHeader } from 'mysql2'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id_pelanggan = searchParams.get('id_pelanggan')

  if (!id_pelanggan) {
    return NextResponse.json({ error: 'id_pelanggan wajib diisi' }, { status: 400 })
  }

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id_kendaraan, nomor_polisi, merk, tahun, warna, kilometer, stnk
       FROM kendaraan WHERE id_pelanggan = ? ORDER BY id_kendaraan DESC`,
      [id_pelanggan]
    )
    return NextResponse.json({ success: true, data: rows })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal memuat kendaraan' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id_pelanggan, nomor_polisi, merk, tahun, warna, kilometer, stnk, no_mesin, no_rangka } = await req.json()

    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id_kendaraan FROM kendaraan WHERE nomor_polisi = ?', [nomor_polisi]
    )
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Nomor polisi sudah terdaftar' }, { status: 400 })
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO kendaraan (id_pelanggan, nomor_polisi, merk, tahun, warna, kilometer, stnk, no_mesin, no_rangka)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id_pelanggan, nomor_polisi, merk, tahun, warna ?? '', kilometer ?? 0, stnk ?? 'ada', no_mesin ?? '', no_rangka ?? '']
    )

    return NextResponse.json({ success: true, message: 'Kendaraan berhasil ditambahkan', id_kendaraan: result.insertId })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal menambahkan kendaraan' }, { status: 500 })
  }
}
