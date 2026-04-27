// app/api/mekanik/tugas/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import pool from '@/lib/db'
import { RowDataPacket, ResultSetHeader } from 'mysql2'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'mekanik') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const id = Number(params.id)

    const [[servis]] = await pool.query<RowDataPacket[]>(`
      SELECT s.*, b.keluhan, b.tanggal_booking, b.waktu_booking,
             k.nomor_polisi, k.merk, k.tahun, k.warna, k.kilometer,
             k.no_mesin, k.no_rangka,
             u.nama AS nama_pelanggan, p.no_telp, p.jenis_pelanggan
      FROM servis s
      JOIN booking b ON s.id_booking = b.id_booking
      JOIN kendaraan k ON b.id_kendaraan = k.id_kendaraan
      JOIN pelanggan p ON k.id_pelanggan = p.id_pelanggan
      JOIN users u ON p.id_user = u.id_user
      WHERE s.id_servis = ?
    `, [id])

    const [jasa] = await pool.query<RowDataPacket[]>(`
      SELECT dsj.id_detail_jasa, dsj.id_jasa, dsj.harga, js.nama_jasa, js.kode_jasa
      FROM detail_servis_jasa dsj
      JOIN jasa_servis js ON dsj.id_jasa = js.id_jasa
      WHERE dsj.id_servis = ?
    `, [id])

    const [sparepart] = await pool.query<RowDataPacket[]>(`
      SELECT ds.id_detail_sparepart, ds.id_sparepart, ds.jumlah, ds.subtotal,
             sp.nama_sparepart, sp.kode_sparepart, sp.harga_jual, sp.satuan
      FROM detail_sparepart ds
      JOIN sparepart sp ON ds.id_sparepart = sp.id_sparepart
      WHERE ds.id_servis = ?
    `, [id])

    // Ambil log beserta catatan yang tersimpan per status
    const [logs] = await pool.query<RowDataPacket[]>(`
      SELECT id_log, status, keterangan, catatan, waktu_perubahan
      FROM status_log WHERE id_servis = ? ORDER BY waktu_perubahan ASC
    `, [id])

    return NextResponse.json({ success: true, data: { servis, jasa, sparepart, logs } })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal memuat detail servis' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'mekanik') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const id   = Number(params.id)
    const body = await req.json()
    const { action } = body

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()

      if (action === 'update_status') {
        const { status, keterangan } = body

        // Ambil catatan servis saat ini untuk disimpan ke log
        const [[currentServis]] = await conn.query<RowDataPacket[]>(
          'SELECT catatan_servis FROM servis WHERE id_servis = ?', [id]
        )

        await conn.query(
          `UPDATE servis SET status_servis = ? WHERE id_servis = ?`,
          [status, id]
        )
        // Simpan catatan saat ini ke log agar pelanggan bisa lihat riwayat catatan
        await conn.query(
          `INSERT INTO status_log (id_servis, status, keterangan, catatan, waktu_perubahan)
           VALUES (?, ?, ?, ?, NOW())`,
          [id, status, keterangan ?? '', currentServis?.catatan_servis ?? null]
        )

      } else if (action === 'tambah_jasa') {
        const { id_jasa, harga } = body
        const [existing] = await conn.query<RowDataPacket[]>(
          `SELECT id_detail_jasa FROM detail_servis_jasa WHERE id_servis = ? AND id_jasa = ?`,
          [id, id_jasa]
        )
        if (existing.length > 0) {
          await conn.rollback(); conn.release()
          return NextResponse.json({ error: 'Jasa sudah ditambahkan' }, { status: 400 })
        }
        await conn.query(
          `INSERT INTO detail_servis_jasa (id_servis, id_jasa, harga) VALUES (?, ?, ?)`,
          [id, id_jasa, harga]
        )

      } else if (action === 'hapus_jasa') {
        const { id_detail_jasa } = body
        await conn.query(
          `DELETE FROM detail_servis_jasa WHERE id_detail_jasa = ? AND id_servis = ?`,
          [id_detail_jasa, id]
        )

      } else if (action === 'tambah_sparepart') {
        const { id_sparepart, jumlah, harga_jual } = body
        const subtotal = jumlah * harga_jual

        const [[sp]] = await conn.query<RowDataPacket[]>(
          `SELECT stok FROM sparepart WHERE id_sparepart = ?`, [id_sparepart]
        )
        if (!sp || sp.stok < jumlah) {
          await conn.rollback(); conn.release()
          return NextResponse.json({ error: 'Stok tidak mencukupi' }, { status: 400 })
        }

        const [existingSp] = await conn.query<RowDataPacket[]>(
          `SELECT id_detail_sparepart, jumlah FROM detail_sparepart WHERE id_servis = ? AND id_sparepart = ?`,
          [id, id_sparepart]
        )
        if (existingSp.length > 0) {
          const jumlahBaru = existingSp[0].jumlah + jumlah
          await conn.query(
            `UPDATE detail_sparepart SET jumlah = ?, subtotal = ? WHERE id_detail_sparepart = ?`,
            [jumlahBaru, jumlahBaru * harga_jual, existingSp[0].id_detail_sparepart]
          )
        } else {
          await conn.query(
            `INSERT INTO detail_sparepart (id_servis, id_sparepart, jumlah, subtotal) VALUES (?, ?, ?, ?)`,
            [id, id_sparepart, jumlah, subtotal]
          )
        }
        await conn.query(
          `UPDATE sparepart SET stok = stok - ? WHERE id_sparepart = ?`,
          [jumlah, id_sparepart]
        )

      } else if (action === 'hapus_sparepart') {
        const { id_detail_sparepart, id_sparepart, jumlah } = body
        await conn.query(
          `DELETE FROM detail_sparepart WHERE id_detail_sparepart = ? AND id_servis = ?`,
          [id_detail_sparepart, id]
        )
        await conn.query(
          `UPDATE sparepart SET stok = stok + ? WHERE id_sparepart = ?`,
          [jumlah, id_sparepart]
        )

      } else if (action === 'update_catatan') {
        const { catatan_servis } = body
        await conn.query(
          `UPDATE servis SET catatan_servis = ? WHERE id_servis = ?`,
          [catatan_servis, id]
        )

      } else if (action === 'selesai') {
        // Ambil catatan terakhir untuk disimpan ke log
        const [[currentServis]] = await conn.query<RowDataPacket[]>(
          'SELECT catatan_servis FROM servis WHERE id_servis = ?', [id]
        )

        await conn.query(
          `UPDATE servis SET status_servis = 'selesai' WHERE id_servis = ?`, [id]
        )
        await conn.query(
          `INSERT INTO status_log (id_servis, status, keterangan, catatan, waktu_perubahan)
           VALUES (?, 'selesai', 'Servis selesai dikerjakan', ?, NOW())`,
          [id, currentServis?.catatan_servis ?? null]
        )

        const [[servis]] = await conn.query<RowDataPacket[]>(
          `SELECT s.id_booking, b.id_kendaraan, k.id_pelanggan
           FROM servis s JOIN booking b ON s.id_booking = b.id_booking
           JOIN kendaraan k ON b.id_kendaraan = k.id_kendaraan
           WHERE s.id_servis = ?`, [id]
        )
        await conn.query(
          `UPDATE booking SET status_booking = 'selesai' WHERE id_booking = ?`,
          [servis.id_booking]
        )

        const [[mek]] = await conn.query<RowDataPacket[]>(
          'SELECT id_mekanik FROM servis WHERE id_servis = ?', [id]
        )
        await conn.query(
          `UPDATE mekanik SET status = 'tersedia' WHERE id_mekanik = ?`, [mek.id_mekanik]
        )

        const [[totalJasa]] = await conn.query<RowDataPacket[]>(
          `SELECT COALESCE(SUM(harga), 0) AS total FROM detail_servis_jasa WHERE id_servis = ?`, [id]
        )
        const [[totalSparepart]] = await conn.query<RowDataPacket[]>(
          `SELECT COALESCE(SUM(subtotal), 0) AS total FROM detail_sparepart WHERE id_servis = ?`, [id]
        )
        const totalBiaya = Number(totalJasa.total) + Number(totalSparepart.total)

        const [[pelanggan]] = await conn.query<RowDataPacket[]>(
          `SELECT p.jenis_pelanggan, p.term_of_payment FROM pelanggan p WHERE p.id_pelanggan = ?`,
          [servis.id_pelanggan]
        )

        let jatuhTempo = null
        if (pelanggan.jenis_pelanggan === 'perusahaan' && pelanggan.term_of_payment) {
          const today = new Date()
          today.setDate(today.getDate() + pelanggan.term_of_payment)
          jatuhTempo = today.toISOString().split('T')[0]
        }

        const now     = new Date()
        const tahun   = now.getFullYear()
        const bulan   = String(now.getMonth() + 1).padStart(2, '0')
        const tanggal = String(now.getDate()).padStart(2, '0')
        const prefix  = `NJ/${tahun}/${bulan}${tanggal}`
        const [[lastNota]] = await conn.query<RowDataPacket[]>(
          `SELECT COUNT(*) AS total FROM nota WHERE tanggal_nota = CURDATE()`
        )
        const urutan    = String(Number(lastNota.total) + 1).padStart(3, '0')
        const nomorNota = `${prefix}/${urutan}`

        const [notaResult] = await conn.query<ResultSetHeader>(
          `INSERT INTO nota (
              id_servis, 
              total_biaya, 
              metode_pembayaran, 
              status_pembayaran, 
              tanggal_pembayaran, 
              jatuh_tempo, 
              diskon_jasa, 
              diskon_sparepart, 
              tanggal_nota
          ) 
          VALUES (?, ?, 'tunai', 'belum_lunas', NULL, ?, 0, 0, CURDATE())`,
          [id, totalBiaya, jatuhTempo]
        )
        const id_nota = notaResult.insertId

        const [jasaItems] = await conn.query<RowDataPacket[]>(
          `SELECT dsj.harga, js.nama_jasa FROM detail_servis_jasa dsj
           JOIN jasa_servis js ON dsj.id_jasa = js.id_jasa WHERE dsj.id_servis = ?`, [id]
        )
        for (const item of jasaItems) {
          await conn.query(
            `INSERT INTO detail_nota (id_nota, nama_item, jenis_item, harga, qty, subtotal)
             VALUES (?, ?, 'jasa', ?, 1, ?)`,
            [id_nota, item.nama_jasa, item.harga, item.harga]
          )
        }

        const [spItems] = await conn.query<RowDataPacket[]>(
          `SELECT ds.jumlah, ds.subtotal, sp.nama_sparepart, sp.harga_jual
           FROM detail_sparepart ds JOIN sparepart sp ON ds.id_sparepart = sp.id_sparepart
           WHERE ds.id_servis = ?`, [id]
        )
        for (const item of spItems) {
          await conn.query(
            `INSERT INTO detail_nota (id_nota, nama_item, jenis_item, harga, qty, subtotal)
             VALUES (?, ?, 'sparepart', ?, ?, ?)`,
            [id_nota, item.nama_sparepart, item.harga_jual, item.jumlah, item.subtotal]
          )
        }

        await conn.commit()
        conn.release()
        return NextResponse.json({ success: true, message: 'Servis selesai dan nota berhasil dibuat', nomor_nota: nomorNota })
      }

      await conn.commit()
      return NextResponse.json({ success: true, message: 'Berhasil diperbarui' })
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      if (conn) conn.release()
    }
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal memperbarui servis' }, { status: 500 })
  }
}
