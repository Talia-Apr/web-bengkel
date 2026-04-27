// app/api/admin/follow-up/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db'
import { RowDataPacket, ResultSetHeader } from 'mysql2'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const kategori = searchParams.get('kategori') ?? ''
  const search   = searchParams.get('search')   ?? ''

  try {
    const kategoriExpr = `
      CASE
        WHEN DATEDIFF(CURDATE(), s.tanggal_servis) BETWEEN 2 AND 4    THEN '3_hari'
        WHEN DATEDIFF(CURDATE(), s.tanggal_servis) BETWEEN 88 AND 95  THEN '3_bulan'
        WHEN DATEDIFF(CURDATE(), s.tanggal_servis) BETWEEN 178 AND 185 THEN '6_bulan'
        ELSE NULL
      END
    `

    const whereConditions: string[] = [
      `s.status_servis = 'selesai'`,
      `(
        DATEDIFF(CURDATE(), s.tanggal_servis) BETWEEN 2 AND 4
        OR DATEDIFF(CURDATE(), s.tanggal_servis) BETWEEN 88 AND 95
        OR DATEDIFF(CURDATE(), s.tanggal_servis) BETWEEN 178 AND 185
      )`,
    ]
    const params: unknown[] = []

    if (kategori) {
      const ranges: Record<string, string> = {
        '3_hari':  'DATEDIFF(CURDATE(), s.tanggal_servis) BETWEEN 2 AND 4',
        '3_bulan': 'DATEDIFF(CURDATE(), s.tanggal_servis) BETWEEN 88 AND 95',
        '6_bulan': 'DATEDIFF(CURDATE(), s.tanggal_servis) BETWEEN 178 AND 185',
      }
      if (ranges[kategori]) whereConditions.push(ranges[kategori])
    }

    if (search) {
      whereConditions.push(`(u.nama LIKE ? OR k.nomor_polisi LIKE ?)`)
      params.push(`%${search}%`, `%${search}%`)
    }

    const whereClause = whereConditions.join(' AND ')

    const query = `
      SELECT
        p.id_pelanggan,
        u.nama              AS nama_pelanggan,
        p.jenis_pelanggan,
        p.nama_perusahaan,
        p.no_telp,
        k.nomor_polisi,
        k.merk,
        s.id_servis,
        s.tanggal_servis    AS tanggal_selesai,
        b.keluhan,
        DATEDIFF(CURDATE(), s.tanggal_servis) AS hari_sejak_selesai,
        b.id_booking,
        n.id_nota,
        n.total_biaya,
        n.status_pembayaran,
        ${kategoriExpr}     AS kategori_followup,
        (
          SELECT GROUP_CONCAT(js2.nama_jasa SEPARATOR ', ')
          FROM detail_servis_jasa dsj2
          JOIN jasa_servis js2 ON dsj2.id_jasa = js2.id_jasa
          WHERE dsj2.id_servis = s.id_servis
        ) AS jasa_servis,
        (
          SELECT GROUP_CONCAT(CONCAT(sp2.nama_sparepart, ' x', ds2.jumlah) SEPARATOR ', ')
          FROM detail_sparepart ds2
          JOIN sparepart sp2 ON ds2.id_sparepart = sp2.id_sparepart
          WHERE ds2.id_servis = s.id_servis
        ) AS sparepart_digunakan,
        fu.status           AS status_followup,
        fu.id_followup,
        fu.tanggal_followup
      FROM servis s
      JOIN booking b   ON s.id_booking   = b.id_booking
      JOIN kendaraan k ON b.id_kendaraan = k.id_kendaraan
      JOIN pelanggan p ON k.id_pelanggan = p.id_pelanggan
      JOIN users u     ON p.id_user      = u.id_user
      LEFT JOIN nota n ON n.id_servis    = s.id_servis
      LEFT JOIN follow_up fu
        ON  fu.id_pelanggan  = p.id_pelanggan
        AND fu.jenis_followup = ${kategoriExpr}
        AND fu.tanggal_followup >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      WHERE ${whereClause}
      ORDER BY
        FIELD(${kategoriExpr}, '3_hari', '3_bulan', '6_bulan'),
        hari_sejak_selesai ASC
    `

    const [rows] = await pool.query<RowDataPacket[]>(query, params)

    const [[summary]] = await pool.query<RowDataPacket[]>(`
      SELECT
        SUM(CASE WHEN DATEDIFF(CURDATE(), s.tanggal_servis) BETWEEN 2 AND 4    THEN 1 ELSE 0 END) AS tiga_hari,
        SUM(CASE WHEN DATEDIFF(CURDATE(), s.tanggal_servis) BETWEEN 88 AND 95  THEN 1 ELSE 0 END) AS tiga_bulan,
        SUM(CASE WHEN DATEDIFF(CURDATE(), s.tanggal_servis) BETWEEN 178 AND 185 THEN 1 ELSE 0 END) AS enam_bulan
      FROM servis s
      WHERE s.status_servis = 'selesai'
    `)

    return NextResponse.json({ success: true, data: rows, summary })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal memuat data follow-up' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id_pelanggan, jenis_followup, id_followup } = await req.json()

    if (id_followup) {
      await pool.query(
        `UPDATE follow_up SET status = 'sudah_dihubungi', tanggal_followup = CURDATE()
         WHERE id_followup = ?`,
        [id_followup]
      )
    } else {
      await pool.query<ResultSetHeader>(
        `INSERT INTO follow_up (id_pelanggan, jenis_followup, tanggal_followup, status)
         VALUES (?, ?, CURDATE(), 'sudah_dihubungi')
         ON DUPLICATE KEY UPDATE status = 'sudah_dihubungi', tanggal_followup = CURDATE()`,
        [id_pelanggan, jenis_followup]
      )
    }

    return NextResponse.json({ success: true, message: 'Follow-up berhasil dicatat' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal mencatat follow-up' }, { status: 500 })
  }
}