import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { ollamaGenerate, OllamaTimeoutError, validateSQL, cleanSQL, checkOllamaHealth } from '@/lib/groq'
import { DB_SCHEMA_CONTEXT_FULL, VALID_TABLE_NAMES } from '@/lib/schema-context'

export const maxDuration = 60
export const dynamic     = 'force-dynamic'

// ─────────────────────────────────────────────────────────────────────────────
// QUERY CACHE — SANGAT SEDIKIT, hanya exact match yang 100% pasti benar
// Pertanyaan variatif langsung ke Groq supaya lebih fleksibel
// ─────────────────────────────────────────────────────────────────────────────
const QUERY_CACHE: Array<{ pattern: RegExp; sql: string }> = [
  {
    pattern: /^berapa\s+total\s+booking\s+bulan\s+ini\s*\??$/i,
    sql: `SELECT COUNT(*) AS total_booking FROM booking WHERE DATE_FORMAT(tanggal_booking,'%Y-%m') = DATE_FORMAT(NOW(),'%Y-%m') AND status_booking NOT IN ('dibatalkan','ditolak')`,
  },
  {
    pattern: /^berapa\s+total\s+booking\s+keseluruhan\s*\??$/i,
    sql: `SELECT COUNT(*) AS total_booking FROM booking WHERE status_booking NOT IN ('dibatalkan','ditolak')`,
  },
  {
    pattern: /^berapa\s+(total\s+)?pendapatan\s+bulan\s+ini\s*\??$/i,
    sql: `SELECT SUM(total_biaya) AS total_pendapatan, COUNT(*) AS jumlah_nota FROM nota WHERE status_pembayaran='lunas' AND DATE_FORMAT(tanggal_nota,'%Y-%m') = DATE_FORMAT(NOW(),'%Y-%m')`,
  },
  {
    pattern: /^berapa\s+(total\s+)?pendapatan\s+keseluruhan\s*\??$/i,
    sql: `SELECT SUM(CASE WHEN status_pembayaran='lunas' THEN total_biaya ELSE 0 END) AS pendapatan_lunas, SUM(CASE WHEN status_pembayaran='belum_lunas' THEN total_biaya ELSE 0 END) AS piutang, SUM(total_biaya) AS total_seluruh FROM nota`,
  },
  {
    pattern: /^(sparepart\s+)?(stok\s+)?(hampir\s+)?habis\s*\??$/i,
    sql: `SELECT nama_sparepart, kategori, stok, satuan, harga_jual, CASE WHEN stok=0 THEN 'Habis' WHEN stok<=3 THEN 'Kritis' ELSE 'Menipis' END AS status_stok FROM sparepart WHERE stok<=10 AND (is_deleted=0 OR is_deleted IS NULL) ORDER BY stok ASC`,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// DETEKSI PERTANYAAN TIDAK RELEVAN
// ─────────────────────────────────────────────────────────────────────────────
const IRRELEVANT_PATTERNS = [
  /^(halo|hai|hello|hi|hey)\b/i,
  /^(apa kabar|how are you|good morning|selamat pagi|selamat siang|selamat malam)/i,
  /^(terima kasih|makasih|thanks|thank you)/i,
  /cuaca|weather|hujan|panas|dingin|suhu/i,
  /presiden|gubernur|walikota|menteri|politik|pemilu|pilkada/i,
  /harga\s+(emas|saham|bitcoin|dolar|euro|minyak|beras)/i,
  /resep|masakan|makanan|minuman|restoran|kuliner/i,
  /film|musik|lagu|artis|selebriti|drama|konser/i,
  /puisi|cerpen|novel|cerita|dongeng/i,
  /olahraga|sepak\s*bola|basket|bulu\s*tangkis|renang/i,
  /covid|virus|vaksin|obat|penyakit|dokter|rumah\s*sakit/i,
  /matematika|fisika|kimia|biologi|sejarah|geografi/i,
  /siapa\s+(kamu|anda|claude|ai|bot|chatgpt)/i,
  /apa\s+(itu|ini)\s+(ai|kecerdasan\s+buatan)/i,
  /bisa\s+bantu\s+saya\s*(gak|tidak)?$/i,
  /^(ok|oke|iya|ya|tidak|no|nope)\s*\.?\s*$/i,
  /^.{1,4}$/i, // terlalu pendek
]

const BENGKEL_KEYWORDS = [
  'booking', 'servis', 'service', 'mekanik', 'pelanggan', 'customer',
  'kendaraan', 'mobil', 'sparepart', 'spare part', 'nota', 'invoice',
  'pembayaran', 'bayar', 'pendapatan', 'pemasukan', 'revenue', 'laba',
  'bengkel', 'ganti', 'oli', 'rem', 'ban', 'ac', 'aki', 'filter',
  'tune up', 'overhaul', 'servis rutin', 'total', 'jumlah', 'berapa',
  'tampilkan', 'daftar', 'list', 'data', 'laporan', 'report',
  'tren', 'trend', 'per bulan', 'per tahun', 'bulan ini', 'tahun ini',
  'hari ini', 'selesai', 'aktif', 'lunas', 'piutang', 'hutang',
  'perusahaan', 'individu', 'merk', 'follow up', 'followup',
  'stok', 'stock', 'jasa', 'harga', 'diskon', 'keuntungan',
  'merk kendaraan', 'nomor polisi', 'plat', 'kilometer',
  'tanggal', 'waktu', 'jam', 'jadwal', 'slot', 'kapasitas',
]

function isIrrelevant(q: string): boolean {
  const lower = q.toLowerCase().trim()
  if (IRRELEVANT_PATTERNS.some(p => p.test(lower))) return true
  return !BENGKEL_KEYWORDS.some(kw => lower.includes(kw))
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR MESSAGES — ramah dan informatif
// ─────────────────────────────────────────────────────────────────────────────
const ERR = {
  irrelevant: {
    error: 'Pertanyaan tidak terkait data bengkel',
    hint:  'Tanyakan seputar: booking, servis, mekanik, pelanggan, sparepart, pendapatan, atau nota. Contoh: "Berapa total booking bulan ini?"',
  },
  invalid_query: {
    error: 'AI tidak dapat memahami pertanyaan ini',
    hint:  'Coba formulasikan ulang. Contoh: "Tampilkan 10 pelanggan yang paling sering servis" atau "Berapa pendapatan bulan ini?"',
  },
  sql_invalid: (detail: string) => ({
    error: `Query yang dihasilkan tidak valid`,
    hint:  `${detail}. Coba pertanyaan yang lebih sederhana.`,
  }),
  table_invalid: (detail: string) => ({
    error: `AI mencoba mengakses tabel yang tidak ada`,
    hint:  `${detail}. Coba reformulasi pertanyaan.`,
  }),
  db_error: (detail: string) => ({
    error: `Gagal mengambil data dari database`,
    hint:  detail,
  }),
  groq_offline: {
    error: 'AI Engine (Groq) tidak dapat dihubungi',
    hint:  'Periksa GROQ_API_KEY di environment variables, atau cek status api.groq.com.',
  },
  timeout: {
    error: 'AI terlalu lama memproses',
    hint:  'Coba pertanyaan yang lebih singkat dan spesifik.',
  },
  no_key: {
    error: 'Konfigurasi AI belum lengkap',
    hint:  'GROQ_API_KEY belum diset di environment variables.',
  },
}

// Time filter helpers
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
  const match  = sql.match(/(?:DATE_FORMAT|YEAR|DATE)\(([a-z_.]+)\b/i)
  const col    = match?.[1] ?? 'tanggal_booking'
  const filter = tf.type === 'yearmonth' && tf.month
    ? `YEAR(${col}) = ${tf.year} AND MONTH(${col}) = ${Number(tf.month)}`
    : `YEAR(${col}) = ${tf.year}`
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

// Helpers
function detectColumnType(key: string, samples: any[]): 'number' | 'string' | 'date' {
  const k = key.toLowerCase()
  if (/^id_/.test(k)) return 'string'
  if (k === 'bulan' || k === 'tahun' || k.includes('tanggal') || k.includes('waktu')) return 'date'
  const nonNull = samples.filter(v => v !== null && v !== undefined)
  if (!nonNull.length) {
    if (/total|jumlah|harga|biaya|pendapatan|stok|qty|subtotal|count|laba/.test(k)) return 'number'
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
  const q        = question.toLowerCase()
  const numCols  = columns.filter(c => c.type === 'number')
  const strCols  = columns.filter(c => c.type === 'string')
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
    const v        = data[0][numCols[0].key]
    const isRupiah = /biaya|harga|pendapatan|bayar|total|laba/.test(numCols[0].key.toLowerCase())
    return `${numCols[0].label}: ${isRupiah ? 'Rp ' + Number(v).toLocaleString('id-ID') : Number(v).toLocaleString('id-ID')}`
  }
  if (numCols.length >= 2 && data.length > 1) return `${data.length} baris · ${numCols.map(c => c.label).join(', ')}`
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
      return { valid: false, reason: `Tabel '${table}' tidak ada di database bengkel` }
    }
  }
  return { valid: true }
}

export async function GET() {
  const health = await checkOllamaHealth()
  return NextResponse.json({
    ollama: health.online ? 'online' : 'offline',
    model:  process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
  })
}

export async function POST(req: NextRequest) {
  try {
    const body     = await req.json()
    const question = (body.question ?? '').trim() as string

    // ── 1. Validasi panjang ──────────────────────────────────────────────────
    if (!question || question.length < 5) {
      return NextResponse.json(ERR.irrelevant, { status: 400 })
    }
    if (question.length > 500) {
      return NextResponse.json(
        { error: 'Pertanyaan terlalu panjang (maksimal 500 karakter)', hint: 'Sederhanakan pertanyaan.' },
        { status: 400 }
      )
    }

    // ── 2. Deteksi pertanyaan tidak relevan ──────────────────────────────────
    if (isIrrelevant(question)) {
      return NextResponse.json(ERR.irrelevant, { status: 422 })
    }

    // ── 3. Cek cache (hanya exact match) ─────────────────────────────────────
    let sql       = matchCache(question) ?? ''
    let fromCache = !!sql

    if (!sql) {
      // ── 4. Cek Groq API key ────────────────────────────────────────────────
      if (!process.env.GROQ_API_KEY) {
        return NextResponse.json(ERR.no_key, { status: 500 })
      }

      // ── 5. Cek koneksi Groq ───────────────────────────────────────────────
      const health = await checkOllamaHealth()
      if (!health.online) {
        return NextResponse.json(ERR.groq_offline, { status: 503 })
      }

      // ── 6. Generate SQL via Groq ──────────────────────────────────────────
      let rawSQL: string
      try {
        rawSQL = await ollamaGenerate(
          DB_SCHEMA_CONTEXT_FULL,
          `Pertanyaan: ${question}\nSQL:`,
          { temperature: 0, timeoutMs: 25_000 }
        )
      } catch (err) {
        if (err instanceof OllamaTimeoutError) {
          return NextResponse.json(ERR.timeout, { status: 504 })
        }
        const msg = (err as Error).message
        return NextResponse.json(
          { error: '❌ Gagal menghubungi Groq', hint: msg },
          { status: 503 }
        )
      }

      // ── 7. Cek INVALID_QUERY ──────────────────────────────────────────────
      if (!rawSQL || rawSQL.trim().toUpperCase().includes('INVALID_QUERY')) {
        return NextResponse.json(ERR.invalid_query, { status: 422 })
      }

      sql = cleanSQL(rawSQL)
    }

    // ── 8. Validasi SQL ───────────────────────────────────────────────────────
    const sqlCheck = validateSQL(sql)
    if (!sqlCheck.valid) {
      return NextResponse.json(ERR.sql_invalid(sqlCheck.reason ?? ''), { status: 422 })
    }

    const tableCheck = validateTables(sql)
    if (!tableCheck.valid) {
      return NextResponse.json(ERR.table_invalid(tableCheck.reason ?? ''), { status: 422 })
    }

    // ── 9. Eksekusi MySQL ─────────────────────────────────────────────────────
    let rows: Record<string, any>[]
    try {
      await pool.execute(`SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))`)
      await pool.execute(`SET lc_time_names = 'id_ID'`)
      const [result] = await pool.execute(sql)
      rows = (result as any[]).map(serializeRow)
    } catch (dbErr: any) {
      console.error('[ai/query] MySQL error:', dbErr.message, '\nSQL:', sql)
      return NextResponse.json(ERR.db_error(dbErr.message), { status: 422 })
    }

    // ── 10. Data kosong ───────────────────────────────────────────────────────
    if (!rows.length) {
      return NextResponse.json({
        question, sql, fromCache,
        data: [], columns: [], chartType: 'table' as const,
        summary: '📭 Tidak ada data yang sesuai untuk filter tersebut.',
        rowCount: 0,
      })
    }

    // ── 11. Metadata & output ─────────────────────────────────────────────────
    const columns   = Object.keys(rows[0]).map(key => ({
      key, label: makeLabel(key),
      type: detectColumnType(key, rows.slice(0, 5).map(r => r[key])),
    }))
    const chartType = autoChartType(columns, rows, question)
    const summary   = buildSummary(columns, rows)

    // Simpan ke cache DB
    pool.execute(
      `INSERT INTO query_cache (pertanyaan, sql_query, hasil_query) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE sql_query = VALUES(sql_query), updated_at = NOW()`,
      [question, sql, JSON.stringify(rows.slice(0, 5))]
    ).catch(() => {})

    return NextResponse.json({ question, sql, data: rows, columns, chartType, summary, rowCount: rows.length, fromCache })

  } catch (err: any) {
    console.error('[ai/query] Unexpected error:', err)
    if (err instanceof OllamaTimeoutError) {
      return NextResponse.json(ERR.timeout, { status: 504 })
    }
    return NextResponse.json(
      { error: '❌ Terjadi kesalahan sistem', hint: 'Coba lagi dalam beberapa saat.' },
      { status: 500 }
    )
  }
}