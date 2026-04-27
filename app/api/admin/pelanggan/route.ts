// app/api/admin/pelanggan/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db'
import { RowDataPacket, ResultSetHeader } from 'mysql2'
import bcrypt from 'bcryptjs'

// GET — ambil semua pelanggan
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const jenis  = searchParams.get('jenis')  ?? ''  // individu | perusahaan | ''

  try {
    let query = `
      SELECT
        p.id_pelanggan,
        p.no_telp,
        p.alamat,
        p.jenis_pelanggan,
        p.nama_perusahaan,
        p.term_of_payment,
        p.created_at,
        u.id_user,
        u.nama,
        u.email,
        COUNT(k.id_kendaraan) AS jumlah_kendaraan
      FROM pelanggan p
      JOIN users u ON p.id_user = u.id_user
      LEFT JOIN kendaraan k ON k.id_pelanggan = p.id_pelanggan
      WHERE p.is_deleted = 0
    `
    const params: unknown[] = []

    if (search) {
      query += ` AND (u.nama LIKE ? OR u.email LIKE ? OR p.no_telp LIKE ?)`
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }
    if (jenis) {
      query += ` AND p.jenis_pelanggan = ?`
      params.push(jenis)
    }

    query += ` GROUP BY p.id_pelanggan ORDER BY p.created_at DESC`

    const [rows] = await pool.query<RowDataPacket[]>(query, params)

    // Ambil kendaraan per pelanggan
    const ids = rows.map(r => r.id_pelanggan)
    let kendaraanMap: Record<number, RowDataPacket[]> = {}

    if (ids.length > 0) {
      const [kendaraan] = await pool.query<RowDataPacket[]>(
        `SELECT id_kendaraan, id_pelanggan, nomor_polisi, merk, tahun, warna
         FROM kendaraan WHERE id_pelanggan IN (?)`,
        [ids]
      )
      kendaraan.forEach(k => {
        if (!kendaraanMap[k.id_pelanggan]) kendaraanMap[k.id_pelanggan] = []
        kendaraanMap[k.id_pelanggan].push(k)
      })
    }

    const data = rows.map(r => ({
      ...r,
      kendaraan: kendaraanMap[r.id_pelanggan] ?? [],
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal memuat data pelanggan' }, { status: 500 })
  }
}

// POST — tambah pelanggan baru
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { nama, email, password, no_telp, alamat, jenis_pelanggan, nama_perusahaan, term_of_payment } = body

    // Cek email duplikat
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id_user FROM users WHERE email = ?', [email]
    )
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const conn = await pool.getConnection()

    try {
      await conn.beginTransaction()

      const [userResult] = await conn.query<ResultSetHeader>(
        `INSERT INTO users (nama, email, password, role, created_at, updated_at)
         VALUES (?, ?, ?, 'pelanggan', NOW(), NOW())`,
        [nama, email, hashedPassword]
      )
      const id_user = userResult.insertId

      await conn.query(
        `INSERT INTO pelanggan (id_user, no_telp, alamat, jenis_pelanggan, nama_perusahaan, term_of_payment, is_deleted, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, NOW())`,
        [
          id_user, no_telp, alamat, jenis_pelanggan,
          jenis_pelanggan === 'perusahaan' ? nama_perusahaan : null,
          jenis_pelanggan === 'perusahaan' ? term_of_payment : null,
        ]
      )

      await conn.commit()
      return NextResponse.json({ success: true, message: 'Pelanggan berhasil ditambahkan' })
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal menambahkan pelanggan' }, { status: 500 })
  }
}
