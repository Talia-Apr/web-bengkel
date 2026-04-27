// app/api/admin/operasional/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db'
import { RowDataPacket } from 'mysql2'

// GET — ambil semua jadwal dalam bulan tertentu + jumlah booking per hari
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  // Jadwal bisa diakses pelanggan juga (untuk cek tanggal tutup saat booking)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const bulan = searchParams.get('bulan') // format: YYYY-MM

  if (!bulan) {
    return NextResponse.json({ error: 'Parameter bulan wajib diisi' }, { status: 400 })
  }

  const [tahun, bln] = bulan.split('-')

  try {
    const [jadwal] = await pool.query<RowDataPacket[]>(
      `SELECT 
        DATE_FORMAT(tanggal, '%Y-%m-%d') AS tanggal,
        status,
        keterangan
      FROM operasional
      WHERE YEAR(tanggal) = ? AND MONTH(tanggal) = ?`,
      [tahun, bln]
    )

    const [bookingPerHari] = await pool.query<RowDataPacket[]>(
      `SELECT 
        DATE_FORMAT(tanggal_booking, '%Y-%m-%d') AS tanggal_booking,
        COUNT(*) AS jumlah_booking
      FROM booking
      WHERE YEAR(tanggal_booking) = ? 
        AND MONTH(tanggal_booking) = ?
        AND status_booking NOT IN ('dibatalkan', 'ditolak')
      GROUP BY tanggal_booking`,
      [tahun, bln]
    )

    return NextResponse.json({
      success: true,
      data: {
        jadwal,
        bookingPerHari,
        kuotaPerHari: 7, // maksimal booking per hari
      }
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal memuat jadwal' }, { status: 500 })
  }
}

// POST — set tanggal tutup / buka
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { tanggal, status, keterangan } = await req.json()

    if (!tanggal || !status) {
      return NextResponse.json({ error: 'Tanggal dan status wajib diisi' }, { status: 400 })
    }

    // ← Validasi tanggal lampau di sini, SEBELUM query
    const today     = new Date()
    today.setHours(0, 0, 0, 0)

    // Gunakan substring agar tidak kena timezone conversion
    const dateOnly  = String(tanggal).substring(0, 10) // pastikan "YYYY-MM-DD"
    const [y, m, d] = dateOnly.split('-').map(Number)
    const inputDate = new Date(y, m - 1, d) // konstruktor lokal, bukan UTC
    inputDate.setHours(0, 0, 0, 0)

    if (inputDate < today) {
      return NextResponse.json(
        { error: 'Tidak bisa mengubah tanggal yang sudah lewat' },
        { status: 400 }
      )
    }

    // Gunakan dateOnly untuk query, bukan tanggal langsung dari request
    if (status === 'buka') {
      await pool.query(`DELETE FROM operasional WHERE tanggal = ?`, [dateOnly])
    } else {
      await pool.query(
        `INSERT INTO operasional (tanggal, status, keterangan)
        VALUES (?, 'tutup', ?)
        ON DUPLICATE KEY UPDATE status = 'tutup', keterangan = ?, updated_at = NOW()`,
        [dateOnly, keterangan ?? null, keterangan ?? null]
      )
    }

    return NextResponse.json({
      success: true,
      message: status === 'tutup' ? 'Tanggal berhasil ditutup' : 'Tanggal berhasil dibuka kembali'
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Gagal memperbarui jadwal' }, { status: 500 })
  }
}
