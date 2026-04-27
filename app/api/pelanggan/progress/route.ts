import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import pool from '@/lib/db'
import { RowDataPacket } from 'mysql2'
// api/pelanggan/progress/route.ts
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'pelanggan') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [[pelanggan]] = await pool.query<RowDataPacket[]>(
      `SELECT p.id_pelanggan FROM pelanggan p
       JOIN users u ON p.id_user = u.id_user
       WHERE u.id_user = ?`,
      [session.user.id]
    )
    if (!pelanggan) {
      return NextResponse.json({ error: 'Pelanggan tidak ditemukan' }, { status: 404 })
    }

    const [servisList] = await pool.query<RowDataPacket[]>(`
      SELECT
        s.id_servis,
        s.id_booking,
        s.tanggal_servis,
        s.catatan_servis,
        s.status_servis,
        b.keluhan,
        b.tanggal_booking,
        b.waktu_booking,
        k.nomor_polisi,
        k.merk,
        k.tahun,
        k.warna,
        u_mek.nama   AS nama_mekanik,
        m.spesialisasi
      FROM servis s
      JOIN booking b    ON s.id_booking   = b.id_booking
      JOIN kendaraan k  ON b.id_kendaraan = k.id_kendaraan
      JOIN mekanik m    ON s.id_mekanik   = m.id_mekanik
      JOIN users u_mek  ON m.id_user      = u_mek.id_user
      WHERE k.id_pelanggan = ?
        AND (
          s.status_servis != 'selesai'
          OR (
            s.status_servis = 'selesai'
            AND EXISTS (
              SELECT 1 FROM nota n
              WHERE n.id_servis = s.id_servis
                AND n.status_pembayaran != 'lunas'
            )
          )
          OR (
            s.status_servis = 'selesai'
            AND NOT EXISTS (
              SELECT 1 FROM nota n WHERE n.id_servis = s.id_servis
            )
          )
        )
      ORDER BY
        FIELD(s.status_servis,
          'dalam_pengerjaan','test_drive','dikonfirmasi','menunggu_konfirmasi','selesai'),
        s.tanggal_servis DESC
    `, [pelanggan.id_pelanggan])

    const result = await Promise.all(servisList.map(async (s) => {
      const [jasa] = await pool.query<RowDataPacket[]>(`
        SELECT dsj.harga, js.nama_jasa
        FROM detail_servis_jasa dsj
        JOIN jasa_servis js ON dsj.id_jasa = js.id_jasa
        WHERE dsj.id_servis = ?
      `, [s.id_servis])

      const [sparepart] = await pool.query<RowDataPacket[]>(`
        SELECT ds.jumlah, ds.subtotal, sp.nama_sparepart, sp.satuan
        FROM detail_sparepart ds
        JOIN sparepart sp ON ds.id_sparepart = sp.id_sparepart
        WHERE ds.id_servis = ?
      `, [s.id_servis])

      const [logs] = await pool.query<RowDataPacket[]>(`
        SELECT status, keterangan, waktu_perubahan, catatan
        FROM status_log
        WHERE id_servis = ?
        ORDER BY waktu_perubahan ASC
      `, [s.id_servis])

      return { ...s, jasa, sparepart, logs }
    }))

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('[pelanggan/progress]', error)
    return NextResponse.json({ error: 'Gagal memuat progress servis' }, { status: 500 })
  }
}