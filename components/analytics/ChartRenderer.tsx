'use client'

// components/analytics/ChartRenderer.tsx
// Auto-render bar / line / pie / table berdasarkan data dari AI

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

interface Column {
  key: string
  label: string
  type: 'number' | 'string' | 'date'
}

interface ChartRendererProps {
  chartType: 'bar' | 'line' | 'pie' | 'table'
  data: Record<string, any>[]
  columns: Column[]
}

// Palet warna bengkel
const COLORS = [
  '#ea580c', '#f97316', '#fb923c', '#fdba74',
  '#1c1917', '#44403c', '#78716c', '#a8a29e',
  '#16a34a', '#15803d', '#2563eb', '#7c3aed',
]

const ORANGE_GRADIENT = '#ea580c'

// Format angka Rupiah
function fmtNumber(val: any, key: string): string {
  if (val === null || val === undefined) return '—'
  const num = Number(val)
  if (isNaN(num)) return String(val)

  const keyLow = key.toLowerCase()
  // Hanya format Rupiah untuk kolom yang jelas merujuk uang
  // Jangan pakai 'total' saja karena total_booking, total_mekanik dll bukan uang
  const isRupiah = keyLow.includes('cost') || keyLow.includes('biaya') ||
    keyLow.includes('harga') || keyLow.includes('bayar') ||
    keyLow.includes('revenue') || keyLow.includes('price') ||
    keyLow.includes('pendapatan') || keyLow.includes('estimasi') ||
    keyLow.includes('aktual') || keyLow.includes('selisih') ||
    keyLow === 'total_cost' || keyLow === 'total_harga' ||
    keyLow === 'total_bayar' || keyLow === 'total_pendapatan' ||
    keyLow === 'total_estimasi' || keyLow === 'total_aktual'

  if (isRupiah) return `Rp ${num.toLocaleString('id-ID')}`
  return num.toLocaleString('id-ID')
}

// Tooltip kustom
function CustomTooltip({ active, payload, label, numKey }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-stone-900 text-white px-3 py-2 rounded-lg shadow-xl text-xs border border-stone-700">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {fmtNumber(p.value, p.dataKey)}
        </p>
      ))}
    </div>
  )
}

// Kustom label pie
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) {
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export default function ChartRenderer({ chartType, data, columns }: ChartRendererProps) {
  if (!data?.length) return (
    <div className="flex items-center justify-center h-48 text-stone-400 text-sm">
      Tidak ada data untuk ditampilkan
    </div>
  )

  const strCol = columns.find(c => c.type === 'string')
  const dateCol = columns.find(c => c.type === 'date')
  const numCols = columns.filter(c => c.type === 'number')
  const labelCol = dateCol || strCol
  const labelKey = labelCol?.key

  // ── BAR CHART ──────────────────────────────────────────────────────────────
  if (chartType === 'bar' && labelKey && numCols.length > 0) {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
          <XAxis
            dataKey={labelKey}
            tick={{ fontSize: 11, fill: '#78716c' }}
            angle={data.length > 6 ? -35 : 0}
            textAnchor={data.length > 6 ? 'end' : 'middle'}
            interval={0}
          />
          <YAxis tick={{ fontSize: 11, fill: '#78716c' }} tickFormatter={v => v.toLocaleString('id-ID')} />
          <Tooltip content={<CustomTooltip />} />
          {numCols.length > 1 && <Legend />}
          {numCols.map((col, i) => (
            <Bar
              key={col.key}
              dataKey={col.key}
              name={col.label}
              fill={COLORS[i % COLORS.length]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    )
  }

  // ── LINE CHART ─────────────────────────────────────────────────────────────
  if (chartType === 'line' && labelKey && numCols.length > 0) {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
          <XAxis
            dataKey={labelKey}
            tick={{ fontSize: 11, fill: '#78716c' }}
            angle={data.length > 6 ? -35 : 0}
            textAnchor={data.length > 6 ? 'end' : 'middle'}
            interval={0}
          />
          <YAxis tick={{ fontSize: 11, fill: '#78716c' }} tickFormatter={v => v.toLocaleString('id-ID')} />
          <Tooltip content={<CustomTooltip />} />
          {numCols.length > 1 && <Legend />}
          {numCols.map((col, i) => (
            <Line
              key={col.key}
              type="monotone"
              dataKey={col.key}
              name={col.label}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2.5}
              dot={{ r: 4, fill: COLORS[i % COLORS.length] }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    )
  }

  // ── PIE CHART ──────────────────────────────────────────────────────────────
  if (chartType === 'pie' && strCol && numCols.length > 0) {
    const numKey = numCols[0].key
    const pieData = data.map(row => ({
      name: String(row[strCol.key]),
      value: Number(row[numKey]),
    }))

    return (
      <div className="flex flex-col lg:flex-row items-center gap-6">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              outerRadius={110}
              dataKey="value"
              labelLine={false}
              label={<PieLabel />}
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(val: any) => fmtNumber(val, numKey)} />
          </PieChart>
        </ResponsiveContainer>

        {/* Legend manual */}
        <div className="flex flex-col gap-2 min-w-max">
          {pieData.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-stone-700 font-medium">{item.name}</span>
              <span className="text-stone-500 ml-auto pl-4">{fmtNumber(item.value, numKey)}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── TABLE (default) ────────────────────────────────────────────────────────
  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} className="bg-stone-800 text-white px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-stone-50'}>
              {columns.map(col => (
                <td key={col.key} className="px-4 py-2.5 border-b border-stone-100 whitespace-nowrap">
                  {col.type === 'number'
                    ? <span className="font-mono font-medium text-stone-800">{fmtNumber(row[col.key], col.key)}</span>
                    : <span className="text-stone-700">{row[col.key] === null ? <span className="text-stone-300 italic">—</span> : String(row[col.key])}</span>
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {data.length >= 10 && (
          <tfoot>
            <tr>
              <td colSpan={columns.length} className="px-4 py-2 text-xs text-stone-400 text-center bg-stone-50">
                {data.length} baris data ditampilkan
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
