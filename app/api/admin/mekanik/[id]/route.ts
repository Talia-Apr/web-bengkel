// app/api/admin/mekanik/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db'
import { RowDataPacket } from 'mysql2'
import bcrypt from 'bcryptjs'

// PUT — edit mekanik (+ opsional reset password)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const id = Number(params.id)
    const { nama, email, spesialisasi, status, password_baru } = await req.json()

    const [[mekanik]] = await pool.query<RowDataPacket[]>(
      'SELECT id_user FROM mekanik WHERE id_mekanik = ?', [id]
    )
    if (!mekanik) return NextResponse.json({ error: 'Mekanik tidak ditemukan' }, { status: 404 })

    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id_user FROM users WHERE email = ? AND id_user != ?',
      [email, mekanik.id_user]
    )
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Email sudah digunakan' }, { status: 400 })
    }

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()

      if (password_baru && password_baru.trim() !== '') {
        if (password_baru.length < 6) {
          await conn.rollback()
          conn.release()
          return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })
        }
        const hashed = await bcrypt.hash(password_baru, 10)
        await conn.query(
          `UPDATE users SET nama = ?, email = ?, password = ?, updated_at = NOW() WHERE id_user = ?`,
          [nama, email, hashed, mekanik.id_user]
        )
      } else {
        await conn.query(
          `UPDATE users SET nama = ?, email = ?, updated_at = NOW() WHERE id_user = ?`,
          [nama, email, mekanik.id_user]
        )
      }
      if (!['aktif', 'tidak_aktif'].includes(status)) {
        return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 })
      }
      await conn.query(
        `UPDATE mekanik SET spesialisasi = ?, status = ? WHERE id_mekanik = ?`,
        [spesialisasi, status, id]
      )

      await conn.commit()
      return NextResponse.json({ success: true, message: 'Data mekanik berhasil diperbarui' })
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal memperbarui mekanik' }, { status: 500 })
  }
}

// DELETE — hapus mekanik
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const id = Number(params.id)

    const [aktif] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM servis
       WHERE id_mekanik = ? AND status_servis NOT IN ('selesai')`,
      [id]
    )
    if (aktif[0].total > 0) {
      return NextResponse.json(
        { error: 'Mekanik masih memiliki servis aktif, tidak dapat dihapus' },
        { status: 400 }
      )
    }

    const [[mekanik]] = await pool.query<RowDataPacket[]>(
      'SELECT id_user FROM mekanik WHERE id_mekanik = ?', [id]
    )
    if (!mekanik) return NextResponse.json({ error: 'Mekanik tidak ditemukan' }, { status: 404 })

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      await conn.query('DELETE FROM mekanik WHERE id_mekanik = ?', [id])
      await conn.query('DELETE FROM users WHERE id_user = ?', [mekanik.id_user])
      await conn.commit()
      return NextResponse.json({ success: true, message: 'Mekanik berhasil dihapus' })
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal menghapus mekanik' }, { status: 500 })
  }
}
