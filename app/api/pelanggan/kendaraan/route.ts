// app/api/pelanggan/kendaraan/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import pool from '@/lib/db'
import { RowDataPacket, ResultSetHeader } from 'mysql2'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'pelanggan') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { nomor_polisi, merk, tahun, warna, kilometer, stnk, no_mesin, no_rangka } = await req.json()

    if (!nomor_polisi || !merk || !tahun) {
      return NextResponse.json({ error: 'Field wajib tidak lengkap' }, { status: 400 })
    }

    const [[pelanggan]] = await pool.query<RowDataPacket[]>(
      `SELECT p.id_pelanggan FROM pelanggan p
       JOIN users u ON p.id_user = u.id_user
       WHERE u.id_user = ? AND p.is_deleted = 0`,
      [session.user.id]
    )
    if (!pelanggan) return NextResponse.json({ error: 'Pelanggan tidak ditemukan' }, { status: 404 })

    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id_kendaraan FROM kendaraan WHERE nomor_polisi = ?', [nomor_polisi]
    )
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Nomor polisi sudah terdaftar' }, { status: 400 })
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO kendaraan (id_pelanggan, nomor_polisi, merk, tahun, warna, kilometer, stnk, no_mesin, no_rangka)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [pelanggan.id_pelanggan, nomor_polisi, merk, tahun, warna ?? '', kilometer ?? 0, stnk ?? 'ada', no_mesin ?? '', no_rangka ?? '']
    )

    return NextResponse.json({ success: true, message: 'Kendaraan berhasil ditambahkan', id_kendaraan: result.insertId })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal menambahkan kendaraan' }, { status: 500 })
  }
}
