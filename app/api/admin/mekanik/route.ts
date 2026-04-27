// app/api/admin/mekanik/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import pool from '@/lib/db'
import { RowDataPacket, ResultSetHeader } from 'mysql2'
import bcrypt from 'bcryptjs'

// GET — ambil semua mekanik
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // GET — tambah u.email dan u.id_user di SELECT + GROUP BY
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        m.id_mekanik,
        m.id_user,
        u.nama,
        u.email,
        m.spesialisasi,
        m.status,
        COUNT(s.id_servis) AS jumlah_tugas
      FROM mekanik m
      JOIN users u ON m.id_user = u.id_user
      LEFT JOIN servis s ON s.id_mekanik = m.id_mekanik
        AND s.status_servis IN ('dalam_pengerjaan', 'test_drive')
      GROUP BY m.id_mekanik, m.id_user, u.nama, u.email, m.spesialisasi, m.status
      ORDER BY u.nama ASC
    `)
    return NextResponse.json({ success: true, data: rows })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal memuat data mekanik' }, { status: 500 })
  }
}

// POST — tambah mekanik baru
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { nama, email, password, spesialisasi } = await req.json()

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
         VALUES (?, ?, ?, 'mekanik', NOW(), NOW())`,
        [nama, email, hashedPassword]
      )

      // POST — ganti 'tersedia' jadi 'aktif'
      await conn.query(
        `INSERT INTO mekanik (id_user, spesialisasi, status) VALUES (?, ?, 'aktif')`,
        [userResult.insertId, spesialisasi]
      )

      await conn.commit()
      return NextResponse.json({ success: true, message: 'Mekanik berhasil ditambahkan' })
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal menambahkan mekanik' }, { status: 500 })
  }
}
