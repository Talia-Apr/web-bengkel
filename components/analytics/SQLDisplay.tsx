'use client'

// components/analytics/SQLDisplay.tsx

import { useState } from 'react'
import { Code2, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'

interface SQLDisplayProps {
  sql: string
}

// Warna token — semua pakai hex agar konsisten di dark background
const COLOR = {
  keyword:  '#fb923c', // orange-400  — SELECT, FROM, WHERE, dll
  string:   '#4ade80', // green-400   — 'nilai string'
  number:   '#60a5fa', // blue-400    — angka
  func:     '#f472b6', // pink-400    — fungsi: COUNT, DATE_FORMAT, dll
  operator: '#94a3b8', // slate-400   — AND, OR, NOT, IN, AS, ON
  default:  '#e2e8f0', // slate-200   — tabel, alias, kolom (teks biasa)
}

function highlightSQL(sql: string): string {
  // Escape HTML terlebih dulu
  let h = sql
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // 1. String literals — warna hijau
  h = h.replace(
    /'([^']*)'/g,
    `<span style="color:${COLOR.string}">'$1'</span>`
  )

  // 2. Fungsi SQL (diikuti tanda kurung) — warna pink
  const funcs = [
    'DATE_FORMAT','STR_TO_DATE','DATE_SUB','DATE_ADD','DATE',
    'COALESCE','IFNULL','IF','NULLIF','CAST','CONVERT',
    'COUNT','SUM','AVG','MAX','MIN','ROUND','FLOOR','CEIL',
    'CONCAT','SUBSTRING','TRIM','UPPER','LOWER','LENGTH','REPLACE',
    'YEAR','MONTH','DAY','NOW','CURDATE','CURTIME','DATEDIFF',
    'GROUP_CONCAT','INTERVAL',
  ]
  const funcPattern = new RegExp(`\\b(${funcs.join('|')})(?=\\s*\\()`, 'gi')
  h = h.replace(funcPattern, `<span style="color:${COLOR.func}">$1</span>`)

  // 3. Operator / kata hubung — warna slate
  const operators = ['AND','OR','NOT','IN','LIKE','BETWEEN','IS','AS','ON','BY']
  const opPattern = new RegExp(`\\b(${operators.join('|')})\\b`, 'gi')
  h = h.replace(opPattern, `<span style="color:${COLOR.operator}">$1</span>`)

  // 4. Keyword utama — warna orange
  const keywords = [
    'SELECT','FROM','WHERE','JOIN','LEFT','RIGHT','INNER','OUTER','CROSS','FULL',
    'GROUP BY','ORDER BY','HAVING','LIMIT','OFFSET','DISTINCT',
    'CASE','WHEN','THEN','ELSE','END',
    'WITH','UNION','ALL','EXISTS',
    'INSERT','UPDATE','DELETE', // ditampilkan tapi diblokir di backend
    'NULL','TRUE','FALSE',
    'ASC','DESC',
  ]
  // Group BY / ORDER BY harus dicek dulu sebagai frasa dua kata
  h = h.replace(/\b(GROUP\s+BY|ORDER\s+BY)\b/gi,
    `<span style="color:${COLOR.keyword}">$1</span>`)
  const kwPattern = new RegExp(
    `\\b(${keywords.filter(k => !k.includes(' ')).join('|')})\\b`, 'gi'
  )
  h = h.replace(kwPattern, `<span style="color:${COLOR.keyword}">$1</span>`)

  // 5. Angka — warna biru (jangan replace yang sudah di dalam span)
  h = h.replace(/(?<![a-zA-Z"'_#;])(\b\d+(\.\d+)?\b)/g,
    `<span style="color:${COLOR.number}">$1</span>`)

  return h
}

export default function SQLDisplay({ sql }: SQLDisplayProps) {
  const [open, setOpen]     = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="border border-stone-200 rounded-xl overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-stone-50 hover:bg-stone-100 transition-colors text-left"
      >
        <Code2 className="w-4 h-4 text-stone-400 flex-shrink-0" />
        <span className="text-xs text-stone-500 font-medium flex-1">Lihat SQL yang dihasilkan</span>
        {open
          ? <ChevronUp   className="w-4 h-4 text-stone-400" />
          : <ChevronDown className="w-4 h-4 text-stone-400" />}
      </button>

      {open && (
        <div className="relative" style={{ backgroundColor: '#0f172a' }}>
          {/* Tombol copy */}
          <button
            onClick={handleCopy}
            title={copied ? 'Tersalin!' : 'Salin SQL'}
            className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors"
            style={{ backgroundColor: copied ? '#166534' : '#1e293b' }}
          >
            {copied
              ? <><Check className="w-3.5 h-3.5" style={{ color: '#4ade80' }} /><span className="text-xs" style={{ color: '#4ade80' }}>Tersalin</span></>
              : <><Copy className="w-3.5 h-3.5" style={{ color: '#94a3b8' }} /><span className="text-xs" style={{ color: '#94a3b8' }}>Salin</span></>}
          </button>

          {/* Kode SQL */}
          <pre
            className="text-xs leading-6 overflow-x-auto font-mono p-5 pr-24"
            style={{ color: COLOR.default, margin: 0 }}
            dangerouslySetInnerHTML={{ __html: highlightSQL(sql) }}
          />
        </div>
      )}
    </div>
  )
}
