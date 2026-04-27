// app/api/admin/nota/[id]/detail/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import pool from '@/lib/db'
import { RowDataPacket, ResultSetHeader } from 'mysql2'

// Helper: recalculate total nota setelah perubahan detail
async function recalcTotal(conn: Awaited<ReturnType<typeof pool.getConnection>>, id_nota: number) {
  const [tjRows] = await conn.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(subtotal),0) AS t FROM detail_nota WHERE id_nota = ? AND jenis_item='jasa'`, [id_nota]
  )
  const tj = (tjRows as RowDataPacket[])[0]

  const [tsRows] = await conn.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(subtotal),0) AS t FROM detail_nota WHERE id_nota = ? AND jenis_item='sparepart'`, [id_nota]
  )
  const ts = (tsRows as RowDataPacket[])[0]

  const [nRows] = await conn.query<RowDataPacket[]>(
    `SELECT diskon_jasa, diskon_sparepart FROM nota WHERE id_nota = ?`, [id_nota]
  )
  const n = (nRows as RowDataPacket[])[0]

  const total = (Number(tj.t) - Number(n.diskon_jasa)) + (Number(ts.t) - Number(n.diskon_sparepart))
  await conn.query(`UPDATE nota SET total_biaya = ? WHERE id_nota = ?`, [total, id_nota])
}

// POST — tambah item baru
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const id_nota = Number(params.id)
    const { nama_item, jenis_item, harga, qty } = await req.json()

    if (!nama_item || !jenis_item || !harga || !qty) {
      return NextResponse.json({ error: 'Field tidak lengkap' }, { status: 400 })
    }

    const subtotal = Number(harga) * Number(qty)
    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO detail_nota (id_nota, nama_item, jenis_item, harga, qty, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id_nota, nama_item, jenis_item, harga, qty, subtotal]
      )
      await recalcTotal(conn, id_nota)
      await conn.commit()
      return NextResponse.json({ success: true, id_detail_nota: result.insertId })
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal menambah item' }, { status: 500 })
  }
}

// PUT - Edit Item
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const id_nota = Number(params.id)
    const { id_detail_nota, qty } = await req.json()

    // Ambil harga dari database — tidak boleh diubah dari frontend
    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()

      const [[item]] = await conn.query<RowDataPacket[]>(
        `SELECT harga FROM detail_nota WHERE id_detail_nota = ? AND id_nota = ?`,
        [id_detail_nota, id_nota]
      )
      if (!item) {
        await conn.rollback()
        conn.release()
        return NextResponse.json({ error: 'Item tidak ditemukan' }, { status: 404 })
      }

      const subtotal = Number(item.harga) * Number(qty)

      await conn.query(
        `UPDATE detail_nota SET qty = ?, subtotal = ? WHERE id_detail_nota = ? AND id_nota = ?`,
        [item.qty, subtotal, item.id_detail_nota, id_nota]  
      )
      await recalcTotal(conn, id_nota)
      await conn.commit()
      return NextResponse.json({ success: true })
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal mengedit item' }, { status: 500 })
  }
}

// DELETE — hapus item
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const id_nota = Number(params.id)
    const { id_detail_nota } = await req.json()

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      await conn.query(
        `DELETE FROM detail_nota WHERE id_detail_nota = ? AND id_nota = ?`,
        [id_detail_nota, id_nota]
      )
      await recalcTotal(conn, id_nota)
      await conn.commit()
      return NextResponse.json({ success: true })
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal menghapus item' }, { status: 500 })
  }
}