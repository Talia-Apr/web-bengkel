// app/api/admin/sparepart/[id]/route.ts
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
    const { kode_sparepart, nama_sparepart, mobil, harga_beli, harga_jual, stok, satuan } = await req.json()

    // Cek kode duplikat selain record ini
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id_sparepart FROM sparepart WHERE kode_sparepart = ? AND id_sparepart != ? AND is_deleted = 0',
      [kode_sparepart, id]
    )
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Kode sparepart sudah digunakan' }, { status: 400 })
    }

    // Ambil stok saat ini — stok tidak boleh dikurangi
    const [[current]] = await pool.query<RowDataPacket[]>(
      'SELECT stok FROM sparepart WHERE id_sparepart = ?', [id]
    )
    if (!current) {
      return NextResponse.json({ error: 'Sparepart tidak ditemukan' }, { status: 404 })
    }

    if (Number(stok) < Number(current.stok)) {
      return NextResponse.json(
        { error: `Stok tidak boleh dikurangi. Stok saat ini: ${current.stok}` },
        { status: 400 }
      )
    }

    await pool.query(
      `UPDATE sparepart SET kode_sparepart = ?, nama_sparepart = ?, mobil = ?,
       harga_beli = ?, harga_jual = ?, stok = ?, satuan = ? WHERE id_sparepart = ?`,
      [kode_sparepart, nama_sparepart, mobil, harga_beli, harga_jual, stok, satuan, id]
    )

    return NextResponse.json({ success: true, message: 'Sparepart berhasil diperbarui' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal memperbarui sparepart' }, { status: 500 })
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
      `SELECT COUNT(*) AS total FROM detail_sparepart WHERE id_sparepart = ?`, [id]
    )
    if (dipakai[0].total > 0) {
      return NextResponse.json(
        { error: 'Sparepart sudah pernah digunakan, tidak dapat dihapus' },
        { status: 400 }
      )
    }

    await pool.query(`UPDATE sparepart SET is_deleted = 1 WHERE id_sparepart = ?`, [id])
    return NextResponse.json({ success: true, message: 'Sparepart berhasil dihapus' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal menghapus sparepart' }, { status: 500 })
  }
}
