// app/api/admin/pelanggan/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db'
import { RowDataPacket } from 'mysql2'

// PUT — edit pelanggan
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const id = Number(params.id)
    const body = await req.json()
    const { nama, email, no_telp, alamat, jenis_pelanggan, nama_perusahaan, term_of_payment } = body

    // Ambil id_user dari pelanggan
    const [[pelanggan]] = await pool.query<RowDataPacket[]>(
      'SELECT id_user FROM pelanggan WHERE id_pelanggan = ?', [id]
    )
    if (!pelanggan) {
      return NextResponse.json({ error: 'Pelanggan tidak ditemukan' }, { status: 404 })
    }

    // Cek email duplikat (selain user ini)
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id_user FROM users WHERE email = ? AND id_user != ?',
      [email, pelanggan.id_user]
    )
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Email sudah digunakan' }, { status: 400 })
    }

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()

      await conn.query(
        `UPDATE users SET nama = ?, email = ?, updated_at = NOW() WHERE id_user = ?`,
        [nama, email, pelanggan.id_user]
      )

      await conn.query(
        `UPDATE pelanggan SET
          no_telp = ?, alamat = ?, jenis_pelanggan = ?,
          nama_perusahaan = ?, term_of_payment = ?
         WHERE id_pelanggan = ?`,
        [
          no_telp, alamat, jenis_pelanggan,
          jenis_pelanggan === 'perusahaan' ? nama_perusahaan : null,
          jenis_pelanggan === 'perusahaan' ? term_of_payment : null,
          id,
        ]
      )

      await conn.commit()
      return NextResponse.json({ success: true, message: 'Pelanggan berhasil diperbarui' })
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal memperbarui pelanggan' }, { status: 500 })
  }
}

// DELETE — soft delete pelanggan
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const id = Number(params.id)
    await pool.query(
      `UPDATE pelanggan SET is_deleted = 1 WHERE id_pelanggan = ?`, [id]
    )
    return NextResponse.json({ success: true, message: 'Pelanggan berhasil dihapus' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal menghapus pelanggan' }, { status: 500 })
  }
}
