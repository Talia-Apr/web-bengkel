'use client'

// app/pemilik/analytics/page.tsx
// Halaman Text-to-SQL Analytics untuk Pemilik

import { useState, useRef, useEffect } from 'react'
import ChartRenderer from '@/components/analytics/ChartRenderer'
import SQLDisplay from '@/components/analytics/SQLDisplay'
import {
  Sparkles, Send, BarChart3, TrendingUp, PieChart, Table2,
  Loader2, AlertTriangle, CheckCircle2, Wifi, WifiOff,
  RefreshCw, ChevronRight, History, X, Download, Clock,
  Lightbulb, Hourglass,
  ClipboardList
} from 'lucide-react'

// ── TIPE ────────────────────────────────────────────────────────────────────

interface QueryResult {
  id: string
  question: string
  sql: string
  data: Record<string, any>[]
  columns: { key: string; label: string; type: 'number' | 'string' | 'date' }[]
  chartType: 'bar' | 'line' | 'pie' | 'table'
  summary: string
  rowCount: number
  timestamp: Date
  durationMs: number
}

interface OllamaStatus {
  status: 'checking' | 'online' | 'offline'
  model?: string
}

// ── STEPS LOADING ────────────────────────────────────────────────────────────

const LOADING_STEPS = [
  { label: 'Mengirim pertanyaan ke Gemma3...', duration: 2000 },
  { label: 'Model sedang membaca skema database...', duration: 5000 },
  { label: 'Menghasilkan SQL query...', duration: 8000 },
  { label: 'Menunggu respons Gemma3 (bisa 30-120 detik)...', duration: 20000 },
  { label: 'Hampir selesai, eksekusi ke database...', duration: Infinity },
]

// ── PERTANYAAN CONTOH ────────────────────────────────────────────────────────

const EXAMPLE_QUESTIONS = [
  {
    icon: BarChart3,
    label: 'Total booking bulan ini',
    q: 'Berapa total booking bulan ini?'
  },
  {
    icon: TrendingUp,
    label: 'Tren pendapatan',
    q: 'Bagaimana tren pendapatan per bulan tahun ini?'
  },
  {
    icon: BarChart3,
    label: 'Tren servis selesai',
    q: 'Bagaimana tren servis selesai per bulan tahun ini?'
  },
  {
    icon: BarChart3,
    label: 'Performa mekanik',
    q: 'Tampilkan Kinerja mekanik dalam menangani servis'
  },
  {
    icon: BarChart3,
    label: 'Top 10 Pelanggan',
    q: 'Tampilkan 10 pelanggan yang paling sering servis'
  },
  {
    icon: PieChart,
    label: 'Merk kendaraan',
    q: 'Apa saja merk kendaraan yang pernah servis?'
  },
  {
    icon: BarChart3,
    label: 'Sparepart terlaris',
    q: 'Sparepart apa yang paling laku atau sering digunakan?'
  },
  {
    icon: BarChart3,
    label: 'Jasa servis terpopuler',
    q: 'Jasa servis apa yang paling sering digunakan?'
  }
]

const CHART_ICONS: Record<string, React.ElementType> = {
  bar: BarChart3, line: TrendingUp, pie: PieChart, table: Table2,
}
const CHART_LABELS: Record<string, string> = {
  bar: 'Bar Chart', line: 'Line Chart', pie: 'Pie Chart', table: 'Tabel',
}

// ── KOMPONEN UTAMA ────────────────────────────────────────────────────────────

// Hitung chart type apa saja yang bisa dirender dari data ini
function getAvailableChartTypes(
  columns: { key: string; label: string; type: 'number' | 'string' | 'date' }[],
  data: Record<string, any>[]
): Array<'bar' | 'line' | 'pie' | 'table'> {
  if (!data?.length || !columns?.length) return ['table']

  const numCols  = columns.filter(c => c.type === 'number')
  const strCols  = columns.filter(c => c.type === 'string')
  const dateCols = columns.filter(c => c.type === 'date')
  const labelCol = dateCols[0] || strCols[0]
  const available: Array<'bar' | 'line' | 'pie' | 'table'> = ['table']

  // Bar & Line: butuh minimal 1 label + 1 angka
  if (labelCol && numCols.length >= 1) {
    available.push('bar')
    available.push('line')
  }

  // Pie: hanya cocok kalau 1 kolom string + 1 kolom angka + data <= 12
  if (strCols.length === 1 && numCols.length === 1 && data.length <= 12) {
    available.push('pie')
  }

  return available
}

export default function AnalyticsPage() {
  const [question, setQuestion]           = useState('')
  const [loading, setLoading]             = useState(false)
  const [loadingStep, setLoadingStep]     = useState(0)
  const [elapsedSec, setElapsedSec]       = useState(0)
  const [error, setError]                 = useState<string | null>(null)
  const [hint, setHint]                   = useState<string | null>(null)
  const [results, setResults]             = useState<QueryResult[]>([])
  const [activeResult, setActiveResult]   = useState<QueryResult | null>(null)
  const [ollamaStatus, setOllamaStatus]   = useState<OllamaStatus>({ status: 'checking' })
  const [overrideChart, setOverrideChart] = useState<string | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const resultRef   = useRef<HTMLDivElement>(null)
  const timerRef    = useRef<NodeJS.Timeout | null>(null)
  const stepTimerRef = useRef<NodeJS.Timeout | null>(null)
  const abortRef    = useRef<AbortController | null>(null)

  useEffect(() => {
    checkOllama()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current)
    }
  }, [])

  const checkOllama = async () => {
    setOllamaStatus({ status: 'checking' })
    try {
      const res = await fetch('/api/ai/query')
      const data = await res.json()
      setOllamaStatus({ status: data.ollama === 'online' ? 'online' : 'offline', model: data.model })
    } catch {
      setOllamaStatus({ status: 'offline' })
    }
  }

  const totalField = activeResult?.columns?.find((col: any) =>
    col.key?.includes('total')
  )

  const totalValue = totalField
    ? (activeResult?.data ?? []).reduce((sum, row: any) => {
        return sum + (Number(row[totalField.key]) || 0)
      }, 0)
    : null

  const label = totalField?.key
    ?.replace('total_', '')
    ?.replace('_', ' ')
    ?.replace(/\b\w/g, l => l.toUpperCase())

  const startLoadingTimers = () => {
    // Timer elapsed seconds
    setElapsedSec(0)
    timerRef.current = setInterval(() => setElapsedSec(s => s + 1), 1000)

    // Step progression
    setLoadingStep(0)
    let step = 0
    const advance = () => {
      step++
      if (step < LOADING_STEPS.length - 1) {
        setLoadingStep(step)
        stepTimerRef.current = setTimeout(advance, LOADING_STEPS[step].duration)
      } else {
        setLoadingStep(LOADING_STEPS.length - 1)
      }
    }
    stepTimerRef.current = setTimeout(advance, LOADING_STEPS[0].duration)
  }

  const stopLoadingTimers = () => {
    if (timerRef.current)    { clearInterval(timerRef.current);  timerRef.current = null }
    if (stepTimerRef.current){ clearTimeout(stepTimerRef.current); stepTimerRef.current = null }
  }

  const handleCancel = () => {
    abortRef.current?.abort()
    stopLoadingTimers()
    setLoading(false)
    setError('Request dibatalkan.')
  }

  const handleSubmit = async () => {
    if (!question.trim() || loading) return

    setLoading(true)
    setError(null)
    setHint(null)
    setOverrideChart(null)

    startLoadingTimers()

    const controller = new AbortController()
    abortRef.current = controller

    const startTime = Date.now()

    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ question: question.trim() }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Terjadi kesalahan')
        if (json.hint) setHint(json.hint)
        return
      }

      const result: QueryResult = {
        id: Date.now().toString(),
        ...json,
        timestamp: new Date(),
        durationMs: Date.now() - startTime,
      }

      setResults(prev => [result, ...prev])
      setActiveResult(result)
      setQuestion('')

      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)

    } catch (e: any) {
      if (e?.name === 'AbortError') {
        setError('Request dibatalkan.')
      } else {
        setError(e.message || 'Gagal menghubungi server')
      }
    } finally {
      stopLoadingTimers()
      setLoading(false)
      abortRef.current = null
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const effectiveChart = (overrideChart || activeResult?.chartType || 'table') as 'bar' | 'line' | 'pie' | 'table'

  const escapeCsv = (val: unknown) => {
  const s = String(val ?? '')
    return `"${s.replace(/"/g, '""')}"`
  }

  const exportCSV = () => {
    if (!activeResult) return

    const { columns, data } = activeResult
    const header = columns.map(c => escapeCsv(c.label)).join(',')
    const rows = data.map(row =>
      columns.map(c => escapeCsv(row[c.key])).join(',')
    )

    const csv = '\uFEFF' + [header, ...rows].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-${Date.now()}.csv`
    a.click()

    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-stone-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-orange-500" /> Analytics AI
          </h2>
          <p className="text-stone-500 text-sm mt-1">
            Tanyakan data bengkel otomatis akan hasilkan grafik
          </p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border
          ${ollamaStatus.status === 'online'   ? 'bg-green-50 border-green-200 text-green-700' : ''}
          ${ollamaStatus.status === 'offline'  ? 'bg-red-50   border-red-200   text-red-700'   : ''}
          ${ollamaStatus.status === 'checking' ? 'bg-stone-50  border-stone-200 text-stone-500' : ''}
        `}>
          {ollamaStatus.status === 'online'   && <><Wifi      className="w-3.5 h-3.5" /> Gemma3 Online</>}
          {ollamaStatus.status === 'offline'  && <><WifiOff   className="w-3.5 h-3.5" /> Ollama Offline</>}
          {ollamaStatus.status === 'checking' && <><Loader2   className="w-3.5 h-3.5 animate-spin" /> Memeriksa...</>}
          <button onClick={checkOllama} className="ml-1 hover:opacity-70"><RefreshCw className="w-3 h-3" /></button>
        </div>
      </div>

      {/* Offline warning */}
      {ollamaStatus.status === 'offline' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800 text-sm">Ollama tidak terdeteksi</p>
              <p className="text-red-600 text-sm mt-1">Jalankan perintah berikut di terminal:</p>
              <div className="mt-2 space-y-1">
                <code className="block bg-red-100 text-red-800 px-3 py-1.5 rounded-lg text-xs font-mono">ollama serve</code>
                <code className="block bg-red-100 text-red-800 px-3 py-1.5 rounded-lg text-xs font-mono">ollama pull Gemma3</code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Contoh: Berapa total booking per bulan tahun ini?"
              rows={2}
              disabled={loading || ollamaStatus.status === 'offline'}
              className="w-full resize-none border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-stone-50 disabled:text-stone-400 leading-relaxed"
            />
            <p className="text-xs text-stone-400 mt-1.5 px-1">Enter untuk kirim · Shift+Enter baris baru</p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!question.trim() || loading || ollamaStatus.status === 'offline'}
            className="flex-shrink-0 w-12 h-12 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:bg-stone-200 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors self-start"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <pre className="text-xs text-red-700 whitespace-pre-wrap font-sans">
                {error}
              </pre>

              {hint && (
                <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
                  <Lightbulb className="w-4 h-4 flex-shrink-0" />
                  <span>{hint}</span>
                </div>
              )}
            </div>
            <button onClick={() => { setError(null); setHint(null) }} className="text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Contoh pertanyaan */}
      <div>
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">Contoh Pertanyaan</p>
        <div className="space-y-2">
          
          {/* Baris Atas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {EXAMPLE_QUESTIONS.slice(0, 4).map((ex, i) => {
              const Icon = ex.icon
              return (
                <button
                  key={i}
                  onClick={() => { setQuestion(ex.q); textareaRef.current?.focus() }}
                  disabled={loading}
                  className="flex items-start gap-2 p-3 rounded-xl border border-stone-200 bg-white hover:border-orange-300 hover:bg-orange-50 transition-all text-left group disabled:opacity-50"
                >
                  <Icon className="w-4 h-4 text-stone-400 group-hover:text-orange-600 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-stone-600 group-hover:text-stone-800 leading-snug">
                    {ex.label}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Baris Bawah */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {EXAMPLE_QUESTIONS.slice(4, 8).map((ex, i) => {
              const Icon = ex.icon
              return (
                <button
                  key={i}
                  onClick={() => { setQuestion(ex.q); textareaRef.current?.focus() }}
                  disabled={loading}
                  className="flex items-start gap-2 p-3 rounded-xl border border-stone-200 bg-white hover:border-orange-300 hover:bg-orange-50 transition-all text-left group disabled:opacity-50"
                >
                  <Icon className="w-4 h-4 text-stone-400 group-hover:text-orange-600 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-stone-600 group-hover:text-stone-800 leading-snug">
                    {ex.label}
                  </span>
                </button>
              )
            })}
          </div>

        </div>
      </div>

      {/* ── LOADING STATE ── */}
      {loading && (
        <div className="bg-white border border-stone-200 rounded-2xl p-8">
          <div className="flex flex-col items-center gap-5">
            {/* Animasi */}
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-orange-500" />
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-orange-400 border-t-transparent animate-spin" />
            </div>

            {/* Step text */}
            <div className="text-center">
              <p className="font-semibold text-stone-800 text-sm">
                {LOADING_STEPS[loadingStep]?.label}
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-2 text-stone-400 text-xs">
                <Clock className="w-3.5 h-3.5" />
                <span>{elapsedSec} detik berlalu</span>
                {elapsedSec > 15 && (
                  <span className="text-stone-300">· Gemma3 butuh waktu untuk pertanyaan kompleks</span>
                )}
              </div>
            </div>

            {/* Progress steps */}
            <div className="flex gap-1.5">
              {LOADING_STEPS.map((s, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-500
                  ${i <= loadingStep ? 'bg-orange-500' : 'bg-stone-200'}
                  ${i === loadingStep ? 'w-8' : 'w-4'}
                `} />
              ))}
            </div>

            {/* Info box setelah 20 detik */}
            {elapsedSec >= 20 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 max-w-sm flex items-center gap-2">
                <Hourglass className="w-4 h-4 flex-shrink-0" />
                <span>
                  Gemma3 sedang memproses. Waktu normal: <strong>30-120 detik</strong> tergantung kompleksitas pertanyaan dan spesifikasi komputer.
                </span>
              </div>
            )}

            {/* Tombol Cancel */}
            <button onClick={handleCancel}
              className="text-xs text-stone-400 hover:text-red-500 border border-stone-200 hover:border-red-200 px-4 py-2 rounded-xl transition-colors">
              Batalkan Request
            </button>
          </div>
        </div>
      )}

      {/* ── HASIL ── */}
      {activeResult && !loading && (
        <div ref={resultRef} className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-stone-100">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-semibold text-stone-900">
                  {activeResult?.question || "Tidak ada pertanyaan"}
                </p>

                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-green-600 font-semibold">
                  {totalField
                    ? `Total ${label}: ${totalValue}`
                    : `${activeResult?.rowCount ?? 0} baris`
                    }
                </span>

                  <span className="text-xs text-stone-500">
                    · ((activeResult?.durationMs ?? 0) / 1000).toFixed(1)
                  </span>
                </div>

                <p className="text-sm text-stone-600 mt-1">
                  {activeResult?.summary || "Tidak ada ringkasan"}
                </p>
              </div>

              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 text-xs text-stone-700 hover:bg-stone-100 flex-shrink-0"
              >
                <ClipboardList className="w-4 h-4" /> CSV
              </button>
            </div>

            {/* Chart switcher — hanya tampilkan tombol yang bisa dirender */}
            {(() => {
              const available = getAvailableChartTypes(activeResult.columns, activeResult.data)
              return (
                <div className="flex gap-2 mt-4 flex-wrap items-center">
                  <span className="text-xs text-stone-400">Tampilkan sebagai:</span>
                  {(['bar', 'line', 'pie', 'table'] as const).filter(type => available.includes(type)).map(type => {
                    const Icon = CHART_ICONS[type]
                    const isActive = effectiveChart === type
                    return (
                      <button key={type} onClick={() => setOverrideChart(type)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                          ${isActive ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-200 hover:border-orange-300 hover:bg-orange-50'}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {CHART_LABELS[type]}
                        {activeResult.chartType === type && !overrideChart && <span className="opacity-50">(auto)</span>}
                      </button>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          <div className="p-6">
            <ChartRenderer chartType={effectiveChart} data={activeResult.data} columns={activeResult.columns} />
          </div>

          <div className="px-5 pb-5">
            <SQLDisplay sql={activeResult.sql} />
          </div>
        </div>
      )}

      {/* ── RIWAYAT ── */}
      {results.length > 1 && (
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <History className="w-3.5 h-3.5" /> Riwayat ({results.length})
          </p>
          <div className="space-y-2">
            {results.slice(1).map(r => {
              const Icon = CHART_ICONS[r.chartType]
              return (
                <button key={r.id}
                  onClick={() => { setActiveResult(r); setOverrideChart(null); resultRef.current?.scrollIntoView({ behavior: 'smooth' }) }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-stone-200 bg-white hover:border-orange-300 hover:bg-orange-50 transition-all text-left">
                  <div className="w-8 h-8 bg-stone-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-stone-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">{r.question}</p>
                    <p className="text-xs text-stone-400">
                      {r.rowCount} baris · {(r.durationMs / 1000).toFixed(1)}s · {r.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-300 flex-shrink-0" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {results.length === 0 && !loading && (
        <div className="bg-gradient-to-br from-stone-50 to-orange-50 border border-dashed border-stone-300 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-orange-500" />
          </div>
          <h3 className="font-display text-xl font-bold text-stone-800 mb-2">Tanya Data Bengkel</h3>
          <p className="text-stone-500 text-sm max-w-md mx-auto">
            Ketik pertanyaan dalam Bahasa Indonesia dan AI akan membuat SQL, mengeksekusi ke database, dan menampilkan grafik yang sesuai.
          </p>
          <p className="text-stone-400 text-xs mt-3">Gemma3 biasanya membutuhkan 30-90 detik untuk menjawab</p>
        </div>
      )}
    </div>
  )
}
