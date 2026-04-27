// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { RowDataPacket, ResultSetHeader } from 'mysql2'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const {
      nama, email, password, no_telp, alamat,
      jenis_pelanggan, nama_perusahaan, term_of_payment
    } = await req.json()

    // Validasi field wajib
    if (!nama || !email || !password || !no_telp) {
      return NextResponse.json({ error: 'Field wajib tidak lengkap' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })
    }

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
          id_user, no_telp, alamat ?? '', jenis_pelanggan,
          jenis_pelanggan === 'perusahaan' ? nama_perusahaan : null,
          jenis_pelanggan === 'perusahaan' ? term_of_payment : null,
        ]
      )

      await conn.commit()
      return NextResponse.json({ success: true, message: 'Akun berhasil dibuat' })
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal membuat akun' }, { status: 500 })
  }
}