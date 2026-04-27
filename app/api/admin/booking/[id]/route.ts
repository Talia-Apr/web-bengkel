// app/api/admin/booking/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import pool from '@/lib/db'
import { RowDataPacket, ResultSetHeader } from 'mysql2'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const id = Number(params.id)

    const [[booking]] = await pool.query<RowDataPacket[]>(`
      SELECT
        b.id_booking,
        b.tanggal_booking,
        b.waktu_booking,
        b.keluhan,
        b.status_booking,
        b.created_at,
        k.id_kendaraan,
        k.nomor_polisi,
        k.merk,
        k.tahun,
        k.warna,
        k.kilometer,
        k.stnk,
        k.no_mesin,
        k.no_rangka,
        p.id_pelanggan,
        p.jenis_pelanggan,
        p.no_telp,
        p.alamat,
        p.nama_perusahaan,
        u.nama AS nama_pelanggan,
        u.email AS email_pelanggan,
        s.id_servis,
        s.status_servis,
        m.id_mekanik,
        um.nama AS nama_mekanik,
        m.spesialisasi
      FROM booking b
      JOIN kendaraan k  ON b.id_kendaraan  = k.id_kendaraan
      JOIN pelanggan p  ON k.id_pelanggan  = p.id_pelanggan
      JOIN users u      ON p.id_user       = u.id_user
      LEFT JOIN servis s   ON s.id_booking = b.id_booking
      LEFT JOIN mekanik m  ON s.id_mekanik = m.id_mekanik
      LEFT JOIN users um   ON m.id_user    = um.id_user
      WHERE b.id_booking = ?
    `, [id])

    if (!booking) return NextResponse.json({ error: 'Booking tidak ditemukan' }, { status: 404 })

    // Ambil daftar mekanik tersedia
    const [mekaniks] = await pool.query<RowDataPacket[]>(`
      SELECT m.id_mekanik, u.nama, m.spesialisasi, m.status,
        (SELECT COUNT(*) FROM servis s2
          WHERE s2.id_mekanik = m.id_mekanik
          AND s2.status_servis IN ('dalam_pengerjaan', 'test_drive')) AS jumlah_tugas
      FROM mekanik m
      JOIN users u ON m.id_user = u.id_user
      WHERE m.status != 'tidak_aktif'
      ORDER BY m.status ASC, u.nama ASC
    `)

    return NextResponse.json({ success: true, data: { booking, mekaniks } })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal memuat detail booking' }, { status: 500 })
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
    const { action, id_mekanik } = body

    const [[booking]] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM booking WHERE id_booking = ?', [id]
    )
    if (!booking) return NextResponse.json({ error: 'Booking tidak ditemukan' }, { status: 404 })

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()

      if (action === 'tolak') {
        await conn.query(`UPDATE booking SET status_booking = 'ditolak' WHERE id_booking = ?`, [id])

      } else if (action === 'batalkan') {
        await conn.query(`UPDATE booking SET status_booking = 'dibatalkan' WHERE id_booking = ?`, [id])

      } else if (action === 'assign') {
        if (!id_mekanik) {
          await conn.rollback()
          conn.release()
          return NextResponse.json({ error: 'Pilih mekanik terlebih dahulu' }, { status: 400 })
        }
        await conn.query(`UPDATE booking SET status_booking = 'dikonfirmasi' WHERE id_booking = ?`, [id])
        const [existingServis] = await conn.query<RowDataPacket[]>(
          'SELECT id_servis FROM servis WHERE id_booking = ?', [id]
        )
        if (existingServis.length > 0) {
          await conn.query(`UPDATE servis SET id_mekanik = ? WHERE id_booking = ?`, [id_mekanik, id])
        } else {
          await conn.query<ResultSetHeader>(
            `INSERT INTO servis (id_booking, id_mekanik, tanggal_servis, waktu_servis, status_servis)
             VALUES (?, ?, ?, ?, 'menunggu_konfirmasi')`,
            [id, id_mekanik, booking.tanggal_booking, booking.waktu_booking]
          )
        }
        await conn.query(`UPDATE mekanik SET status = 'sibuk' WHERE id_mekanik = ?`, [id_mekanik])
      }

      await conn.commit()
      return NextResponse.json({ success: true, message: 'Booking berhasil diperbarui' })
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal memperbarui booking' }, { status: 500 })
  }
}