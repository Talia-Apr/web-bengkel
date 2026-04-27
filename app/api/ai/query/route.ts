// app/api/ai/query/route.ts
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import {
  ollamaGenerate,
  validateSQL,
  cleanSQL,
  checkOllamaHealth,
  isSmallModel,
} from '@/lib/groq'
import {
  DB_SCHEMA_CONTEXT_SMALL,
  DB_SCHEMA_CONTEXT_FULL,
  VALID_TABLE_NAMES,
} from '@/lib/schema-context'

export const maxDuration = 120
export const dynamic     = 'force-dynamic'

// ─────────────────────────────────────────────────────────────────────────────
// QUERY CACHE — query teruji, bypass Ollama sepenuhnya
// Nama tabel sesuai skema app_bengkel
// ─────────────────────────────────────────────────────────────────────────────
 
const QUERY_CACHE: Array<{ pattern: RegExp; sql: string }> = [
 
  // ══════════════════════════════════════════════════════════════════════════
  // LABA & ESTIMASI PENDAPATAN (tambahan baru)
  // ══════════════════════════════════════════════════════════════════════════
 
  // "laba per bulan" / "tren laba"
  {
    pattern: /laba.*per.*bulan|tren.*laba|laba.*bulan/i,
    sql: `
      SELECT
        DATE_FORMAT(n.tanggal_nota,'%M %Y') AS bulan,
        SUM(dsj.harga)                       AS pendapatan_jasa,
        SUM(ds.subtotal)                     AS pendapatan_sparepart,
        SUM(
          ds.subtotal - (sp.harga_beli * ds.jumlah)
        )                                    AS laba_sparepart,
        SUM(dsj.harga) + SUM(
          ds.subtotal - (sp.harga_beli * ds.jumlah)
        )                                    AS estimasi_laba_total
      FROM nota n
      JOIN servis s         ON n.id_servis      = s.id_servis
      LEFT JOIN detail_servis_jasa dsj ON dsj.id_servis = s.id_servis
      LEFT JOIN detail_sparepart ds    ON ds.id_servis  = s.id_servis
      LEFT JOIN sparepart sp           ON ds.id_sparepart = sp.id_sparepart
      WHERE n.status_pembayaran = 'lunas'
        AND YEAR(n.tanggal_nota) = YEAR(NOW())
      GROUP BY bulan
      ORDER BY YEAR(tanggal_booking), MONTH(tanggal_booking)`,
  },
 
  // "total laba" / "laba keseluruhan"
  {
    pattern: /total.*laba|laba.*total|laba.*keseluruhan|keuntungan.*total|total.*keuntungan/i,
    sql: `
      SELECT
        SUM(dsj.harga)                                      AS total_pendapatan_jasa,
        SUM(ds.subtotal)                                    AS total_pendapatan_sparepart,
        SUM(ds.subtotal - (sp.harga_beli * ds.jumlah))      AS laba_sparepart,
        SUM(dsj.harga) + SUM(
          ds.subtotal - (sp.harga_beli * ds.jumlah)
        )                                                   AS estimasi_laba_total
      FROM nota n
      JOIN servis s                ON n.id_servis       = s.id_servis
      LEFT JOIN detail_servis_jasa dsj ON dsj.id_servis = s.id_servis
      LEFT JOIN detail_sparepart ds    ON ds.id_servis  = s.id_servis
      LEFT JOIN sparepart sp           ON ds.id_sparepart = sp.id_sparepart
      WHERE n.status_pembayaran = 'lunas'`,
  },
 
  // "estimasi pendapatan belum lunas" / "potensi pendapatan"
  {
    pattern: /estimasi.*pendapatan|potensi.*pendapatan|pendapatan.*belum.*lunas|belum.*lunas.*pendapatan/i,
    sql: `
      SELECT
        COUNT(n.id_nota)          AS jumlah_nota_belum_lunas,
        SUM(n.total_biaya)        AS estimasi_pendapatan,
        MIN(n.jatuh_tempo)        AS jatuh_tempo_terdekat,
        MAX(n.jatuh_tempo)        AS jatuh_tempo_terjauh
      FROM nota n
      WHERE n.status_pembayaran = 'belum_lunas'`,
  },
 
  // "ringkasan pendapatan" / "summary pendapatan" — lunas vs belum lunas
  {
    pattern: /ringkasan.*pendapatan|summary.*pendapatan|pendapatan.*lunas.*belum|lunas.*vs.*belum/i,
    sql: `
      SELECT
        status_pembayaran,
        COUNT(*)           AS jumlah_nota,
        SUM(total_biaya)   AS total_biaya
      FROM nota
      GROUP BY status_pembayaran`,
  },
 
  // ══════════════════════════════════════════════════════════════════════════
  // PENDAPATAN / NOTA — HARUS di atas pattern BOOKING
  // ══════════════════════════════════════════════════════════════════════════
 
  // "tren pendapatan per bulan" — HARUS sebelum pattern booking per bulan
  {
    pattern: /tren.*pendapatan|pendapatan.*per.*bulan|per.*bulan.*pendapatan|pendapatan.*tren/i,
    sql: `
      SELECT
        DATE_FORMAT(tanggal_nota,'%M %Y') AS bulan,
        SUM(total_biaya)                  AS pendapatan,
        COUNT(*)                          AS jumlah_nota
      FROM nota
      WHERE status_pembayaran = 'lunas'
        AND YEAR(tanggal_nota) = YEAR(NOW())
      GROUP BY bulan
      ORDER BY MIN(tanggal_nota)`,
  },
 
  // "pendapatan bulan ini"
  {
    pattern: /pendapatan.*bulan ini|bulan ini.*pendapatan/i,
    sql: `
      SELECT SUM(total_biaya) AS total_pendapatan, COUNT(*) AS jumlah_nota
      FROM nota
      WHERE status_pembayaran = 'lunas'
        AND DATE_FORMAT(tanggal_nota,'%M %Y') = DATE_FORMAT(NOW(),'%M %Y')`,
  },
 
  // "total pendapatan"
  {
    pattern: /total.*pendapatan|pendapatan.*total|pendapatan.*keseluruhan|revenue|pemasukan/i,
    sql: `
      SELECT
        SUM(CASE WHEN status_pembayaran='lunas'       THEN total_biaya ELSE 0 END) AS pendapatan_lunas,
        SUM(CASE WHEN status_pembayaran='belum_lunas' THEN total_biaya ELSE 0 END) AS estimasi_belum_lunas,
        SUM(total_biaya)                                                            AS total_seluruh
      FROM nota`,
  },
 
  // "metode pembayaran"
  {
    pattern: /metode.*pembayaran|pembayaran.*metode|cara.*bayar/i,
    sql: `
      SELECT metode_pembayaran, COUNT(*) AS jumlah, SUM(total_biaya) AS total
      FROM nota
      GROUP BY metode_pembayaran
      ORDER BY jumlah DESC`,
  },
 
  // "nota belum lunas"
  {
    pattern: /nota.*belum.*lunas|belum.*lunas|belum.*bayar|hutang.*pelanggan/i,
    sql: `
      SELECT
        u.nama,
        p.nama_perusahaan,
        p.term_of_payment,
        n.total_biaya,
        n.jatuh_tempo,
        DATEDIFF(n.jatuh_tempo, CURDATE()) AS sisa_hari
      FROM nota n
      JOIN servis s   ON n.id_servis        = s.id_servis
      JOIN booking b  ON s.id_booking       = b.id_booking
      JOIN kendaraan k ON b.id_kendaraan    = k.id_kendaraan
      JOIN pelanggan p ON k.id_pelanggan    = p.id_pelanggan
      JOIN users u     ON p.id_user         = u.id_user
      WHERE n.status_pembayaran = 'belum_lunas'
      ORDER BY n.jatuh_tempo ASC`,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PERUSAHAAN
  // ══════════════════════════════════════════════════════════════════════════
  {
    pattern: /perusahaan.*bekerja|kerja sama|rekanan|klien.*perusahaan|term.*of.*payment|tempo.*pembayaran|perusahaan.*term/i,
    sql: `
      SELECT
        u.nama            AS nama_pelanggan,
        p.nama_perusahaan,
        p.term_of_payment,
        p.no_telp,
        p.alamat,
        COUNT(b.id_booking) AS total_booking
      FROM pelanggan p
      JOIN users u      ON p.id_user       = u.id_user
      LEFT JOIN kendaraan k ON k.id_pelanggan = p.id_pelanggan
      LEFT JOIN booking b   ON b.id_kendaraan = k.id_kendaraan
      WHERE p.jenis_pelanggan = 'perusahaan'
        AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
      GROUP BY p.id_pelanggan, u.nama, p.nama_perusahaan, p.term_of_payment, p.no_telp, p.alamat
      ORDER BY p.nama_perusahaan`,
  },

  
  // "Perusahaan yang sering servis"
  {
    pattern: /perusahaan.*servis|servis.*perusahaan|perusahaan.*bekerja|kerja sama|rekanan|klien.*perusahaan|perusahaan.*berapa.*kali|term.*of.*payment/i,
    sql: `
      SELECT
        p.nama_perusahaan,
        u.nama              AS nama_kontak,
        p.term_of_payment,
        p.no_telp,
        COUNT(DISTINCT b.id_booking)  AS total_booking,
        COUNT(DISTINCT s.id_servis)   AS total_servis,
        COALESCE(SUM(n.total_biaya), 0) AS total_transaksi
      FROM pelanggan p
      JOIN users u       ON p.id_user      = u.id_user
      LEFT JOIN kendaraan k ON k.id_pelanggan = p.id_pelanggan
      LEFT JOIN booking b   ON b.id_kendaraan = k.id_kendaraan
        AND b.status_booking NOT IN ('dibatalkan', 'ditolak')
      LEFT JOIN servis s ON s.id_booking   = b.id_booking
      LEFT JOIN nota n   ON n.id_servis    = s.id_servis
      WHERE p.jenis_pelanggan = 'perusahaan'
        AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
      GROUP BY p.id_pelanggan, p.nama_perusahaan, u.nama, p.term_of_payment, p.no_telp
      ORDER BY total_booking DESC`,
  },
 
  // ══════════════════════════════════════════════════════════════════════════
  // BOOKING
  // ══════════════════════════════════════════════════════════════════════════
 
  // "booking hari ini per status"
  {
    pattern: /booking.*hari ini.*status|status.*booking.*hari ini|per.*status.*hari ini|hari ini.*per.*status/i,
    sql: `
      SELECT status_booking AS status, COUNT(*) AS jumlah
      FROM booking
      WHERE DATE(tanggal_booking) = CURDATE()
      GROUP BY status_booking
      ORDER BY jumlah DESC`,
  },
 
  // "booking hari ini" — daftar detail
  {
    pattern: /booking.*hari ini|hari ini.*booking/i,
    sql: `
      SELECT
        b.id_booking,
        u.nama            AS pelanggan,
        k.merk,
        k.tipe,
        k.nomor_polisi,
        b.waktu_booking,
        b.keluhan,
        b.status_booking
      FROM booking b
      JOIN kendaraan k  ON b.id_kendaraan  = k.id_kendaraan
      JOIN pelanggan p  ON k.id_pelanggan  = p.id_pelanggan
      JOIN users u      ON p.id_user       = u.id_user
      WHERE DATE(b.tanggal_booking) = CURDATE()
      ORDER BY b.waktu_booking`,
  },
 
  // "booking per bulan tahun ini"
  {
    pattern: /booking.*per.*bulan|per.*bulan.*booking/i,
    sql: `
      SELECT
        DATE_FORMAT(tanggal_booking,'%M %Y') AS bulan,
        COUNT(*)                             AS total_booking
      FROM booking
      WHERE YEAR(tanggal_booking) = YEAR(NOW())
        AND status_booking NOT IN ('dibatalkan','ditolak')
      GROUP BY bulan
      ORDER BY YEAR(tanggal_booking), MONTH(tanggal_booking)`,
  },
 
  // "booking bulan ini"
  {
  pattern: /booking.*bulan ini|bulan ini.*booking|total.*booking.*bulan ini/i,
  sql: `
    SELECT 
      DATE_FORMAT(tanggal_booking, '%d %M %Y') AS tanggal,
      COUNT(*) AS total_booking
    FROM booking
    WHERE 
      YEAR(tanggal_booking) = YEAR(CURDATE())
      AND MONTH(tanggal_booking) = MONTH(CURDATE())
      AND status_booking NOT IN ('dibatalkan','ditolak')
    GROUP BY DATE_FORMAT(tanggal_booking, '%d %M %Y')
    ORDER BY MIN(tanggal_booking)
  `,
},

 
  // "booking tahun ini"
  {
    pattern: /booking.*tahun ini|tahun ini.*booking/i,
    sql: `
      SELECT COUNT(*) AS total_booking
      FROM booking
      WHERE YEAR(tanggal_booking) = YEAR(NOW())
        AND status_booking NOT IN ('dibatalkan','ditolak')`,
  },
 
  // "booking per tahun"
  {
    pattern: /per tahun|setiap tahun|tiap tahun/i,
    sql: `
      SELECT YEAR(tanggal_booking) AS tahun, COUNT(*) AS total_booking
      FROM booking
      WHERE status_booking NOT IN ('dibatalkan','ditolak')
      GROUP BY tahun
      ORDER BY tahun`,
  },

  // "total booking detail"
  {
    pattern: /booking.*bulan ini|total.*booking.*bulan ini/i,
    sql: `
      SELECT 
        DATE_FORMAT(tanggal_booking, '%d %M %Y') AS tanggal,
        COUNT(*) AS total_booking
      FROM booking
      WHERE 
        YEAR(tanggal_booking) = YEAR(CURDATE())
        AND MONTH(tanggal_booking) = MONTH(CURDATE())
        AND status_booking NOT IN ('dibatalkan','ditolak')
      GROUP BY DATE(tanggal_booking)
      ORDER BY tanggal_booking
    `,
  },
 
  // "total booking"
  {
    pattern: /total.*booking|jumlah.*booking|berapa.*booking/i,
    sql: `
      SELECT COUNT(*) AS total_booking
      FROM booking
      WHERE status_booking NOT IN ('dibatalkan','ditolak')`,
  },
 
  // "distribusi status booking"
  {
    pattern: /distribusi.*status|status.*booking|booking.*per.*status|per.*status/i,
    sql: `
      SELECT status_booking AS status, COUNT(*) AS jumlah
      FROM booking
      GROUP BY status_booking
      ORDER BY jumlah DESC`,
  },
 
  // ══════════════════════════════════════════════════════════════════════════
  // SERVIS
  // ══════════════════════════════════════════════════════════════════════════
 
  // "jasa servis terpopuler" — HARUS sebelum pattern sparepart sering
  {
    pattern: /jasa.*sering|jasa.*populer|populer.*jasa|jenis.*servis|tipe.*servis|jasa.*terbanyak|jasa.*terlaris/i,
    sql: `
      SELECT
        js.nama_jasa,
        COUNT(dsj.id_detail_jasa) AS total_pemakaian,
        SUM(dsj.harga)            AS total_pendapatan
      FROM detail_servis_jasa dsj
      JOIN jasa_servis js ON dsj.id_jasa = js.id_jasa
      GROUP BY js.id_jasa, js.nama_jasa
      ORDER BY total_pemakaian DESC
      LIMIT 10`,
  },
 
  // "servis per bulan"
  {
    pattern: /servis.*per.*bulan|tren.*servis/i,
    sql: `
      SELECT
        DATE_FORMAT(tanggal_servis,'%M %Y') AS bulan,
        COUNT(*) AS total_servis
      FROM servis
      WHERE status_servis = 'selesai'
        AND YEAR(tanggal_servis) = YEAR(NOW())
      GROUP BY bulan
      ORDER BY MIN(tanggal_servis)`,
  },
 
  // ══════════════════════════════════════════════════════════════════════════
  // MEKANIK
  // ══════════════════════════════════════════════════════════════════════════
 
  {
    pattern: /mekanik.*produktif|mekanik.*terbanyak|mekanik.*servis|servis.*mekanik|performa.*mekanik/i,
    sql: `
      SELECT
        u.nama           AS mekanik,
        m.spesialisasi,
        COUNT(s.id_servis) AS total_servis,
        SUM(CASE WHEN s.status_servis='selesai' THEN 1 ELSE 0 END) AS selesai
      FROM servis s
      JOIN mekanik m ON s.id_mekanik = m.id_mekanik
      JOIN users u   ON m.id_user    = u.id_user
      GROUP BY m.id_mekanik, u.nama, m.spesialisasi
      ORDER BY total_servis DESC
      LIMIT 10`,
  },

  // total mekanik 
  {
    pattern: /total.*mekanik|jumlah.*mekanik|berapa.*mekanik/i,
    sql: `
      SELECT
        COUNT(*) AS total_mekanik,
        SUM(CASE WHEN status = 'aktif'       THEN 1 ELSE 0 END) AS aktif,
        SUM(CASE WHEN status = 'tidak_aktif' THEN 1 ELSE 0 END) AS tidak_aktif
      FROM mekanik`,
  },
 
  // ══════════════════════════════════════════════════════════════════════════
  // PELANGGAN
  // ══════════════════════════════════════════════════════════════════════════
 
  // "top 10 pelanggan"
  {
    pattern: /pelanggan.*terbanyak|pelanggan.*paling.*sering|paling.*sering.*servis|top.*pelanggan|10.*pelanggan|pelanggan.*booking.*terbanyak/i,
    sql: `
      SELECT
        u.nama              AS pelanggan,
        p.jenis_pelanggan,
        COUNT(b.id_booking) AS total_booking,
        COALESCE(SUM(n.total_biaya), 0) AS total_pendapatan
      FROM pelanggan p
      JOIN users u       ON p.id_user      = u.id_user
      JOIN kendaraan k   ON k.id_pelanggan = p.id_pelanggan
      JOIN booking b     ON b.id_kendaraan = k.id_kendaraan
      LEFT JOIN servis s ON s.id_booking   = b.id_booking
      LEFT JOIN nota n   ON n.id_servis    = s.id_servis
      WHERE (p.is_deleted = 0 OR p.is_deleted IS NULL)
        AND b.status_booking NOT IN ('dibatalkan', 'ditolak')
      GROUP BY p.id_pelanggan, u.nama, p.jenis_pelanggan
      ORDER BY total_booking DESC
      LIMIT 10`,
  },
 
  // "Jumlah Pelanggan Keseluruhan"
  {
    pattern: /total.*pelanggan|jumlah.*pelanggan|berapa.*pelanggan/i,
    sql: `
      SELECT COUNT(*) AS total_pelanggan
      FROM pelanggan
      WHERE is_deleted = 0 OR is_deleted IS NULL`,
  },

  // "Jumlah Pelanggan Perusahaan dan Individu"
  {
    pattern: /jumlah.*pelanggan.*individu|pelanggan.*individu.*perusahaan|distribusi.*pelanggan|pelanggan.*per.*jenis|jenis.*pelanggan/i,
    sql: `
      SELECT
        jenis_pelanggan,
        COUNT(*) AS jumlah
      FROM pelanggan
      WHERE is_deleted = 0 OR is_deleted IS NULL
      GROUP BY jenis_pelanggan`,
  },
 
  // ══════════════════════════════════════════════════════════════════════════
  // KENDARAAN
  // ══════════════════════════════════════════════════════════════════════════
 
  // "merk kendaraan paling sering masuk servis" — join ke booking agar relevan
  {
    pattern: /merk|merek|brand.*kendaraan|kendaraan.*merk|kendaraan.*sering|sering.*masuk/i,
    sql: `
      SELECT
        k.merk,
        COUNT(b.id_booking) AS jumlah_booking
      FROM kendaraan k
      JOIN booking b ON b.id_kendaraan = k.id_kendaraan
      WHERE b.status_booking NOT IN ('dibatalkan','ditolak')
      GROUP BY k.merk
      ORDER BY jumlah_booking DESC
      LIMIT 15`,
  },
 
  {
    pattern: /tipe.*kendaraan|model.*kendaraan|kendaraan.*tipe/i,
    sql: `
      SELECT
        CONCAT(k.merk,' ',k.tipe) AS kendaraan,
        COUNT(b.id_booking)        AS jumlah_booking
      FROM kendaraan k
      JOIN booking b ON b.id_kendaraan = k.id_kendaraan
      WHERE b.status_booking NOT IN ('dibatalkan','ditolak')
      GROUP BY k.merk, k.tipe
      ORDER BY jumlah_booking DESC
      LIMIT 20`,
  },
 
  {
    pattern: /total.*kendaraan|jumlah.*kendaraan|berapa.*kendaraan/i,
    sql: `SELECT COUNT(*) AS total_kendaraan FROM kendaraan`,
  },
 
  // ══════════════════════════════════════════════════════════════════════════
  // SPAREPART — pattern "sering" HARUS lebih spesifik dari jasa
  // ══════════════════════════════════════════════════════════════════════════
 
  // 1. FIX: sparepart hampir habis — hanya tampilkan yang stok <= 10
  {
    pattern: /stok.*habis|hampir.*habis|stok.*kritis|stok.*minim|sparepart.*habis/i,
    sql: `
      SELECT
        nama_sparepart,
        kategori,
        mobil,
        stok,
        satuan,
        harga_jual,
        CASE
          WHEN stok = 0   THEN 'Habis'
          WHEN stok <= 3  THEN 'Kritis'
          ELSE 'Menipis'
        END AS status_stok
      FROM sparepart
      WHERE stok <= 10
        AND (is_deleted = 0 OR is_deleted IS NULL)
      ORDER BY stok ASC`,
  },
 
  // "sparepart paling sering dipakai" — pattern lebih spesifik
  {
    pattern: /sparepart.*sering|sparepart.*populer|sparepart.*terlaris|sering.*dipakai.*sparepart|paling.*sering.*sparepart/i,
    sql: `
      SELECT
        sp.nama_sparepart,
        sp.kategori,
        SUM(ds.jumlah)   AS total_dipakai,
        SUM(ds.subtotal) AS total_pendapatan
      FROM detail_sparepart ds
      JOIN sparepart sp ON ds.id_sparepart = sp.id_sparepart
      GROUP BY sp.id_sparepart, sp.nama_sparepart, sp.kategori
      ORDER BY total_dipakai DESC
      LIMIT 10`,
  },
 
  // "daftar / semua sparepart"
  {
    pattern: /stok.*sparepart|daftar.*sparepart|semua.*sparepart|list.*sparepart/i,
    sql: `
      SELECT
        nama_sparepart,
        kode_sparepart,
        kategori,
        stok,
        satuan,
        harga_beli,
        harga_jual
      FROM sparepart
      WHERE is_deleted = 0 OR is_deleted IS NULL
      ORDER BY kategori, nama_sparepart
      LIMIT 500`,
  },

  // "total pendapatan"
  {
    pattern: /pendapatan.*sparepart|total.*sparepart|semua.*sparepart|penjualan.*sparepart/i,
    sql: `
      SELECT 
        SUM(harga_jual) 
          AS total_pendapatan 
          FROM sparepart 
        WHERE is_deleted = 0 
          OR is_deleted IS NULL
      LIMIT 500`,
  },

]

function getPatternQuery(question: string): string | null {
  const q = question.toLowerCase();

  if (q.includes('pelanggan') && q.includes('sering')) {
    return `SELECT ANY_VALUE(u.nama) AS 'Pelanggan', COUNT(b.id_booking) AS 'Total Servis' 
            FROM pelanggan p 
            JOIN users u ON p.id_user = u.id_user 
            JOIN kendaraan k ON k.id_pelanggan = p.id_pelanggan 
            JOIN booking b ON b.id_kendaraan = k.id_kendaraan 
            GROUP BY p.id_pelanggan 
            ORDER BY COUNT(b.id_booking) DESC LIMIT 10`;
  }

  if (q.includes('sparepart') && (q.includes('sering') || q.includes('banyak'))) {
    return `SELECT ANY_VALUE(s.nama_sparepart) AS 'Sparepart', SUM(d.jumlah) AS 'Total Dipakai' 
            FROM detail_sparepart d 
            JOIN sparepart s ON d.id_sparepart = s.id_sparepart 
            GROUP BY d.id_sparepart 
            ORDER BY SUM(d.jumlah) DESC LIMIT 10`;
  }

  if (q.includes('pendapatan') && q.includes('bulan ini')) {
    return `SELECT SUM(total_biaya) AS 'Total Pendapatan' FROM nota 
            WHERE DATE_FORMAT(tanggal_nota,'%Y-%m') = DATE_FORMAT(NOW(),'%Y-%m') 
            AND status_pembayaran = 'lunas'`;
  }

  return null; // Jika tidak ada pola yang cocok, baru tanya Groq
}

// ─────────────────────────────────────────────────────────────────────────────
// TIME FILTER
// ─────────────────────────────────────────────────────────────────────────────

const BULAN_ID: Record<string, string> = {
  januari:'01', februari:'02', maret:'03', april:'04', mei:'05', juni:'06',
  juli:'07', agustus:'08', september:'09', oktober:'10', november:'11', desember:'12',
  jan:'01', feb:'02', mar:'03', apr:'04', jun:'06', jul:'07',
  agt:'08', aug:'08', sep:'09', okt:'10', nov:'11', des:'12',
}

interface TimeFilter { type: 'year' | 'yearmonth'; year: string; month?: string }

function extractTimeFilter(q: string): TimeFilter | null {
  const lower = q.toLowerCase()
  const ymNum = lower.match(/(\d{4})[\/\-](\d{1,2})\b|\b(\d{1,2})[\/\-](\d{4})/)
  if (ymNum) {
    const year  = ymNum[1] || ymNum[4]
    const month = (ymNum[2] || ymNum[3]).padStart(2, '0')
    return { type: 'yearmonth', year, month }
  }
  const yearInQ = lower.match(/\b(20\d{2})\b/)
  const sorted  = Object.entries(BULAN_ID).sort((a, b) => b[0].length - a[0].length)
  for (const [name, num] of sorted) {
    if (new RegExp('(?:^|[^a-z])' + name + '(?:[^a-z]|$)').test(lower)) {
      return { type: 'yearmonth', year: yearInQ?.[1] ?? String(new Date().getFullYear()), month: num }
    }
  }
  if (yearInQ) return { type: 'year', year: yearInQ[1] }
  return null
}

function injectTimeFilter(sql: string, tf: TimeFilter): string {
  // Temukan kolom tanggal pertama yang dipakai di SQL
  const match = sql.match(/(?:DATE_FORMAT|YEAR|DATE)\(([a-z_.]+)\b/i)
  const col   = match?.[1] ?? 'tanggal_booking'

  const filter =
  tf.type === 'yearmonth' && tf.month
    ? `YEAR(${col}) = ${tf.year} AND MONTH(${col}) = ${Number(tf.month)}`
    : `YEAR(${col}) = ${tf.year}`

  // Ganti kondisi waktu generik yang sudah ada di SQL cache
  return sql
    .replace(/YEAR\([a-z_.]+\)\s*=\s*YEAR\(NOW\(\)\)/gi, filter)
    .replace(/DATE_FORMAT\([a-z_.]+,'%M %Y'\)\s*=\s*DATE_FORMAT\(NOW\(\),'%M %Y'\)/gi, filter)
}

function matchCache(q: string): string | null {
  const lower = q.toLowerCase().trim()
  for (const entry of QUERY_CACHE) {
    if (entry.pattern.test(lower)) {
      const tf = extractTimeFilter(lower)
      return tf ? injectTimeFilter(entry.sql, tf) : entry.sql
    }
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function detectColumnType(key: string, samples: any[]): 'number' | 'string' | 'date' {
  const k = key.toLowerCase()
  if (/^id_/.test(k)) return 'string'
  if (k === 'bulan' || k === 'tahun' || k.includes('tanggal') || k.includes('waktu')) return 'date'

  const nonNull = samples.filter(v => v !== null && v !== undefined)
  if (!nonNull.length) {
    if (/total|jumlah|harga|biaya|pendapatan|stok|qty|subtotal|count/.test(k)) return 'number'
    return 'string'
  }
  const first = nonNull[0]
  if (first instanceof Date) return 'date'
  if (typeof first === 'string' && /^\d{4}-\d{2}(-\d{2})?$/.test(first)) return 'date'
  if (typeof first === 'number' || typeof first === 'bigint') return 'number'
  if (typeof first === 'string' && !isNaN(Number(first)) && first.trim() !== '') return 'number'
  return 'string'
}

function serializeRow(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(row)) {
    if (v === null || v === undefined) out[k] = null
    else if (typeof v === 'bigint') out[k] = Number(v)
    else if (v instanceof Date) out[k] = v.toISOString().slice(0, 10)
    else if (typeof v === 'object' && v.constructor?.name === 'Decimal') out[k] = Number(v)
    else out[k] = v
  }
  return out
}

function makeLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function autoChartType(
  columns: { key: string; type: 'number' | 'string' | 'date' }[],
  data: Record<string, any>[],
  question: string
): 'bar' | 'line' | 'pie' | 'table' {
  const q       = question.toLowerCase()
  const numCols = columns.filter(c => c.type === 'number')
  const strCols = columns.filter(c => c.type === 'string')
  const dateCols = columns.filter(c => c.type === 'date')

  if (columns.length === 1 && numCols.length === 1) return 'table'
  if (dateCols.length >= 1 && numCols.length >= 1) return 'line'
  if (/tren|per bulan|per hari|bulanan/.test(q) && numCols.length >= 1) return 'line'
  if (strCols.length === 1 && numCols.length === 1 && data.length <= 8 &&
      /jenis|tipe|distribusi|status|merk|merek/.test(q)) return 'pie'
  if (strCols.length >= 1 && numCols.length >= 1 && data.length <= 20) return 'bar'
  return 'table'
}

function buildSummary(
  columns: { key: string; label: string; type: 'number' | 'string' | 'date' }[],
  data: Record<string, any>[]
): string {
  if (!data.length) return 'Tidak ada data ditemukan.'
  const numCols = columns.filter(c => c.type === 'number')
  const strCols = columns.filter(c => c.type === 'string')

  if (data.length === 1 && numCols.length === 1) {
    const v = data[0][numCols[0].key]
    const isRupiah = /biaya|harga|pendapatan|bayar|total/.test(numCols[0].key.toLowerCase())
    return `${numCols[0].label}: ${isRupiah ? 'Rp ' + Number(v).toLocaleString('id-ID') : Number(v).toLocaleString('id-ID')}`
  }
  if (numCols.length >= 2 && data.length > 1) {
    return `${data.length} baris · ${numCols.map(c => c.label).join(', ')}`
  }
  if (strCols.length >= 1 && numCols.length === 1 && data.length > 0) {
    const top = data[0]
    return `${data.length} data · Tertinggi: ${top[strCols[0].key]} (${Number(top[numCols[0].key]).toLocaleString('id-ID')})`
  }
  return `${data.length} baris data.`
}

function validateTables(sql: string): { valid: boolean; reason?: string } {
  const matches = sql.match(/(?:FROM|JOIN)\s+(\w+)/gi) ?? []
  for (const m of matches) {
    const table = m.replace(/^(?:FROM|JOIN)\s+/i, '').toLowerCase()
    if (!(VALID_TABLE_NAMES as readonly string[]).includes(table)) {
      return { valid: false, reason: `Tabel '${table}' tidak ada di skema` }
    }
  }
  return { valid: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — health check
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  const health = await checkOllamaHealth()
  return NextResponse.json({
    ollama:    health.online ? 'online' : 'offline',
    model:     process.env.OLLAMA_MODEL || 'gemma3:1b',
    ollamaUrl: process.env.OLLAMA_URL   || 'http://127.0.0.1:11434',
    isSmallModel,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — text → SQL → data → chart
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body     = await req.json();
    const question = (body.question ?? '').trim() as string;

    

    // ── 1. Validasi Input (Frontend-Backend Guard) ──────────────────────────
    if (!question || question.length < 3) {
      return NextResponse.json({ error: 'Pertanyaan terlalu pendek.' }, { status: 400 });
    }
    if (question.length > 500) {
      return NextResponse.json({ error: 'Pertanyaan terlalu panjang (maks 500 karakter).' }, { status: 400 });
    }

    // Filter kata kunci tidak relevan (Opsional tapi bagus buat UX)
    const blacklist = ['cuaca', 'politik', 'makanan', 'berita'];
    if (blacklist.some(word => question.toLowerCase().includes(word))) {
      return NextResponse.json({ 
        error: 'Topik tidak relevan.', 
        hint: 'Mohon tanyakan hal seputar operasional bengkel seperti mekanik, servis, atau sparepart.' 
      }, { status: 400 });
    }

    // ── 2. Cek Cache (Efisiensi) ──────────────────────────────────────────
    let sql       = matchCache(question) ?? '';
    let fromCache = !!sql;

    if (!sql) {
      // ── 3. Cek Koneksi AI (Groq) ────────────────────────────────────────
      if (!process.env.GROQ_API_KEY) {
        return NextResponse.json(
          { error: 'Konfigurasi AI (Groq) belum terpasang.', hint: 'Cek environment variables di Vercel/Aiven.' },
          { status: 500 }
        );
      }

      // ── 4. Generate SQL via Groq ──────────────────────────────────────
      const systemPrompt = isSmallModel ? DB_SCHEMA_CONTEXT_SMALL : DB_SCHEMA_CONTEXT_FULL;
      let rawSQL: string;
      let sql = getPatternQuery(question);
      let fromAI = false;
      
      try {
        // Ganti ollamaGenerate menjadi fungsi Groq kamu
        rawSQL = await ollamaGenerate(
          systemPrompt,
          `User Question: ${question}\nSQL:`,
          { temperature: 0 } 
        );
      } catch (err: any) {
        console.error('[ai/groq] Error:', err.message);
        return NextResponse.json(
          { error: 'Gagal menghubungi server AI.', hint: 'Periksa koneksi internet atau limit API Groq kamu.' },
          { status: 504 }
        );
      }
      if (!sql) {
      // Jika tidak ada di pola, baru panggil AI
      fromAI = true;
      const rawSQL = await ollamaGenerate(DB_SCHEMA_CONTEXT_SMALL, question, { temperature: 0 });
      sql = cleanSQL(rawSQL);
    }

      if (!rawSQL || rawSQL.toUpperCase().includes('INVALID_QUERY')) {
        return NextResponse.json(
          { error: 'AI tidak memahami perintah tersebut.', hint: 'Coba gunakan bahasa yang lebih baku (misal: "tampilkan total pendapatan bulan ini").' },
          { status: 422 }
        );
      }
      sql = cleanSQL(rawSQL);
    }

    // ── 5. Keamanan SQL (Anti-Modifikasi Database) ─────────────────────────
    const forbiddenWords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'TRUNCATE', 'ALTER', 'GRANT'];
    if (forbiddenWords.some(word => sql.toUpperCase().includes(word))) {
      return NextResponse.json({ 
        error: 'Keamanan: Perintah tidak diizinkan.', 
        hint: 'Sistem hanya mengizinkan pengambilan data (SELECT).' 
      }, { status: 403 });
    }

    const sqlCheck = validateSQL(sql);
    if (!sqlCheck.valid)
      return NextResponse.json({ error: `SQL tidak valid: ${sqlCheck.reason}`, sql }, { status: 422 });

    const tableCheck = validateTables(sql);
    if (!tableCheck.valid)
      return NextResponse.json({ error: `SQL tidak valid: ${tableCheck.reason}`, sql }, { status: 422 });

    // ── 6. Eksekusi MySQL (Aiven) ───────────────────────────────────────────
    let rows: Record<string, any>[];

    try {
      await pool.execute(`SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))`);
      // Set bahasa Indonesia untuk nama bulan/hari
      await pool.execute(`SET lc_time_names = 'id_ID'`);

      const [result] = await pool.execute(sql);
      rows = (result as any[]).map(serializeRow);
    } catch (dbErr: any) {
      console.error('[ai/query] MySQL Error:', dbErr.message);
      return NextResponse.json(
        { error: `Database Error: ${dbErr.message}`, sql, hint: 'Terjadi kesalahan saat mengambil data dari Aiven.' },
        { status: 422 }
      );
    }

    // ── 7. Penanganan Data Kosong ───────────────────────────────────────────
    if (!rows.length) {
      return NextResponse.json({
        question, sql, fromCache,
        data: [], columns: [], chartType: 'table' as const,
        summary: 'Data yang Anda cari tidak ditemukan di database.', rowCount: 0,
      });
    }

    // ── 8. Metadata & Output ────────────────────────────────────────────────
    const columns = Object.keys(rows[0]).map(key => ({
      key,
      label: makeLabel(key),
      type:  detectColumnType(key, rows.slice(0, 5).map(r => r[key])),
    }));

    const chartType = autoChartType(columns, rows, question);
    const summary   = buildSummary(columns, rows);

    // Cache hasil (Best-effort)
    pool.execute(
      `INSERT INTO query_cache (pertanyaan, sql_query, hasil_query) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE sql_query = VALUES(sql_query), updated_at = NOW()`,
      [question, sql, JSON.stringify(rows.slice(0, 5))]
    ).catch(() => {});

    return NextResponse.json({
      question, sql, data: rows, columns,
      chartType, summary, rowCount: rows.length, fromCache,
    });

  } catch (err: any) {
    console.error('[ai/query] Global Error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan internal pada server.' }, { status: 500 });
  }
}