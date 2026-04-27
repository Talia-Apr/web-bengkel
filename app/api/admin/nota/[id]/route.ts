// app/api/admin/nota/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db'
import { RowDataPacket, ResultSetHeader } from 'mysql2'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const id = Number(params.id)

    const [[nota]] = await pool.query<RowDataPacket[]>(`
      SELECT
        n.*,
        u.nama AS nama_pelanggan,
        p.jenis_pelanggan,
        p.no_telp,
        p.term_of_payment,
        k.nomor_polisi, k.merk, k.tahun,
        um.nama AS nama_mekanik,
        s.catatan_servis,
        CONCAT(
          'NJ/',
          YEAR(n.tanggal_nota), '/',
          DATE_FORMAT(n.tanggal_nota, '%m%d'), '/',
          LPAD(ROW_NUMBER() OVER (PARTITION BY n.tanggal_nota ORDER BY n.id_nota), 3, '0')
        ) AS nomor_nota
      FROM nota n
      JOIN servis s ON n.id_servis = s.id_servis
      JOIN booking b ON s.id_booking = b.id_booking
      JOIN kendaraan k ON b.id_kendaraan = k.id_kendaraan
      JOIN pelanggan p ON k.id_pelanggan = p.id_pelanggan
      JOIN users u ON p.id_user = u.id_user
      JOIN mekanik m ON s.id_mekanik = m.id_mekanik
      JOIN users um ON m.id_user = um.id_user
      WHERE n.id_nota = ?
    `, [id])

    if (!nota) return NextResponse.json({ error: 'Nota tidak ditemukan' }, { status: 404 })

    const [detail] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM detail_nota WHERE id_nota = ? ORDER BY jenis_item, id_detail_nota`,
      [id]
    )

    return NextResponse.json({ success: true, data: { nota, detail } })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal memuat detail nota' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const id   = Number(params.id)
    const body = await req.json()
    const { action } = body

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()

      // ── Tandai lunas ──────────────────────────────────────
      if (action === 'lunas') {
        const { metode_pembayaran } = body
        await conn.query(
          `UPDATE nota SET
            status_pembayaran = 'lunas',
            tanggal_pembayaran = CURDATE(),
            metode_pembayaran = ?
           WHERE id_nota = ?`,
          [metode_pembayaran ?? 'tunai', id]
        )

      // ── Edit nota ─────────────────────────────────────────
      } else if (action === 'edit') {
        const { diskon_jasa, diskon_sparepart, metode_pembayaran, jatuh_tempo, detail } = body

        const jatuhTempoParsed = jatuh_tempo ? String(jatuh_tempo).substring(0, 10) : null

        let totalJasa = 0
        let totalSparepart = 0

        if (detail && Array.isArray(detail)) {
          for (const item of detail) {
            const subtotal = item.harga * item.qty
            await conn.query(
              `UPDATE detail_nota SET harga = ?, qty = ?, subtotal = ? WHERE id_detail_nota = ?`,
              [item.harga, item.qty, subtotal, item.id_detail_nota]
            )
            if (item.jenis_item === 'jasa') totalJasa += subtotal
            else totalSparepart += subtotal
          }
        } else {
          const [[tj]] = await conn.query<RowDataPacket[]>(
            `SELECT COALESCE(SUM(subtotal),0) AS t FROM detail_nota WHERE id_nota = ? AND jenis_item='jasa'`, [id]
          )
          const [[ts]] = await conn.query<RowDataPacket[]>(
            `SELECT COALESCE(SUM(subtotal),0) AS t FROM detail_nota WHERE id_nota = ? AND jenis_item='sparepart'`, [id]
          )
          totalJasa      = Number(tj.t)
          totalSparepart = Number(ts.t)
        }

        const diskonJ    = Number(diskon_jasa ?? 0)
        const diskonS    = Number(diskon_sparepart ?? 0)
        const totalBiaya = (totalJasa - diskonJ) + (totalSparepart - diskonS)

        await conn.query(
          `UPDATE nota SET
            diskon_jasa = ?, diskon_sparepart = ?,
            metode_pembayaran = ?, jatuh_tempo = ?,
            total_biaya = ?
          WHERE id_nota = ?`,
          [diskonJ, diskonS, metode_pembayaran, jatuhTempoParsed, totalBiaya, id]
        )
      } 

      await conn.commit()
      return NextResponse.json({ success: true, message: 'Nota berhasil diperbarui' })
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal memperbarui nota' }, { status: 500 })
  }
}