// app/api/admin/jasa-servis/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db'
import { RowDataPacket } from 'mysql2'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const id = Number(params.id)
    const { kode_jasa, nama_jasa, harga_jasa, keterangan } = await req.json()

    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id_jasa FROM jasa_servis WHERE kode_jasa = ? AND id_jasa != ?',
      [kode_jasa, id]
    )
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Kode jasa sudah digunakan' }, { status: 400 })
    }

    await pool.query(
      `UPDATE jasa_servis 
      SET kode_jasa = ?, nama_jasa = ?, keterangan = ?, harga_jasa = ?
      WHERE id_jasa = ?`,
      [kode_jasa, nama_jasa, keterangan, harga_jasa, id]
    )

    return NextResponse.json({ success: true, message: 'Jasa servis berhasil diperbarui' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal memperbarui jasa servis' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const id = Number(params.id)

    const [dipakai] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM detail_servis_jasa WHERE id_jasa = ?`, [id]
    )
    if (dipakai[0].total > 0) {
      return NextResponse.json(
        { error: 'Jasa servis sudah pernah digunakan, tidak dapat dihapus' },
        { status: 400 }
      )
    }

    await pool.query('DELETE FROM jasa_servis WHERE id_jasa = ?', [id])
    return NextResponse.json({ success: true, message: 'Jasa servis berhasil dihapus' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal menghapus jasa servis' }, { status: 500 })
  }
}
