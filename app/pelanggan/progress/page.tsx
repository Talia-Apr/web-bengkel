'use client'
// app/pelanggan/progress/page.tsx
import { useState, useEffect, useCallback } from 'react'
import {
  Wrench, Car, Clock, Check, CheckCircle, RefreshCw,
  ChevronDown, ChevronUp, FileText, X
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'

interface LogItem {
  status: string
  keterangan: string
  waktu_perubahan: string
  catatan?: string
}

interface ProgressServis {
  id_servis: number
  status_servis: string
  tanggal_servis: string | null
  catatan_servis: string | null
  keluhan: string
  tanggal_booking: string
  nomor_polisi: string
  merk: string
  tahun: number
  warna: string
  nama_mekanik: string
  spesialisasi: string
  jasa: { nama_jasa: string; harga: number }[]
  sparepart: { nama_sparepart: string; jumlah: number; satuan: string; subtotal: number }[]
  logs: LogItem[]
}

const SC: Record<string, {
  label: string; color: string; bg: string; ring: string; border: string; icon: React.ElementType; step: number
}> = {
  menunggu_konfirmasi: { label: 'Menunggu Konfirmasi', color: 'text-yellow-700', bg: 'bg-yellow-50',  ring: 'ring-yellow-400', border: 'border-yellow-200', icon: Clock,       step: 1 },
  dikonfirmasi:        { label: 'Dikonfirmasi',         color: 'text-blue-700',   bg: 'bg-blue-50',    ring: 'ring-blue-400',   border: 'border-blue-200',   icon: Check,       step: 2 },
  dalam_pengerjaan:    { label: 'Dalam Pengerjaan',     color: 'text-orange-700', bg: 'bg-orange-50',  ring: 'ring-orange-400', border: 'border-orange-200', icon: Wrench,      step: 3 },
  test_drive:          { label: 'Test Drive',           color: 'text-purple-700', bg: 'bg-purple-50',  ring: 'ring-purple-400', border: 'border-purple-200', icon: Car,         step: 4 },
  selesai:             { label: 'Selesai',              color: 'text-green-700',  bg: 'bg-green-50',   ring: 'ring-green-400',  border: 'border-green-200',  icon: CheckCircle, step: 5 },
}

const STEPS = [
  { key: 'menunggu_konfirmasi', label: 'Menunggu'     },
  { key: 'dikonfirmasi',        label: 'Dikonfirmasi' },
  { key: 'dalam_pengerjaan',    label: 'Dikerjakan'   },
  { key: 'test_drive',          label: 'Test Drive'   },
  { key: 'selesai',             label: 'Selesai'      },
]

const fmtTgl = (val: string | null) => {
  if (!val) return '—'
  try {
    const d = val.includes('T') ? parseISO(val) : parseISO(val + 'T00:00:00')
    return format(d, 'dd MMM yyyy', { locale: id })
  } catch { return val }
}
const fmtRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
const fmtWaktu = (val: string) => {
  try { return format(parseISO(val), 'dd MMM yyyy · HH:mm', { locale: id }) }
  catch { return val }
}

function StepPopup({ stepKey, logs, catatanServis, onClose }: {
  stepKey: string; logs: LogItem[]; catatanServis: string | null; onClose: () => void
}) {
  const cfg      = SC[stepKey]
  const Icon     = cfg?.icon ?? Check
  const stepLogs = logs.filter(l => l.status === stepKey)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className={`px-4 py-3 flex items-center justify-between ${cfg?.bg ?? 'bg-stone-50'} border-b ${cfg?.border ?? 'border-stone-100'}`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${cfg?.bg} border ${cfg?.border}`}>
              <Icon className={`w-4 h-4 ${cfg?.color}`} />
            </div>
            <span className={`text-sm font-semibold ${cfg?.color}`}>{cfg?.label ?? stepKey}</span>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4">
          {stepLogs.length === 0 ? (
            <div className="text-center py-8 text-stone-400">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Belum ada catatan</p>
            </div>
          ) : stepLogs.map((log, i) => (
            <div key={i} className="space-y-2">
              <p className="text-xs text-stone-400 font-medium">{fmtWaktu(log.waktu_perubahan)}</p>
              {log.keterangan && <p className="text-xs text-stone-500 flex items-start gap-1.5"><span className="w-1 h-1 rounded-full bg-stone-300 flex-shrink-0 mt-1.5" />{log.keterangan}</p>}
              {log.catatan && log.catatan.trim() !== '' ? (
                <div className={`rounded-xl p-3 border ${cfg?.bg} ${cfg?.border}`}>
                  <p className={`text-xs font-semibold mb-1.5 flex items-center gap-1 ${cfg?.color}`}><FileText className="w-3 h-3" /> Catatan mekanik</p>
                  <p className="text-sm text-stone-700 leading-relaxed">{log.catatan}</p>
                </div>
              ) : (
                <p className="text-xs text-stone-400 italic pl-3">Tidak ada catatan dari mekanik pada tahap ini</p>
              )}
            </div>
          ))}
          {stepLogs.length > 0 && stepLogs.every(l => !l.catatan || l.catatan.trim() === '') && catatanServis && (
            <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
              <p className="text-xs font-semibold text-stone-500 mb-1.5">Catatan pengerjaan</p>
              <p className="text-sm text-stone-700 leading-relaxed">{catatanServis}</p>
            </div>
          )}
        </div>
        <div className="px-4 py-3 border-t border-stone-100">
          <button onClick={onClose} className="w-full py-2 text-sm font-medium text-stone-600 hover:text-stone-800">Tutup</button>
        </div>
      </div>
    </div>
  )
}

function ProgressBar({ status, logs, catatanServis }: {
  status: string; logs: LogItem[]; catatanServis: string | null
}) {
  const [activeStep, setActiveStep] = useState<string | null>(null)
  const currentStep  = SC[status]?.step ?? 1
  const reachedSteps = new Set(logs.map(l => l.status))

  return (
    <>
      <div className="flex items-start mt-4">
        {STEPS.map((step, i) => {
          const stepNum = i + 1
          const done    = stepNum < currentStep
          const active  = stepNum === currentStep
          const reached = done || active || reachedSteps.has(step.key)
          const hasCat  = logs.some(l => l.status === step.key && l.catatan && l.catatan.trim() !== '')
          const cfg     = SC[step.key]
          const Icon    = cfg.icon
          return (
            <div key={step.key} className="flex items-start flex-1">
              <div className="flex flex-col items-center flex-shrink-0">
                <button type="button" disabled={!reached} onClick={() => reached && setActiveStep(step.key)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all focus:outline-none
                    ${done   ? 'bg-green-500 ring-2 ring-offset-1 ring-green-300 hover:bg-green-600 cursor-pointer' : ''}
                    ${active ? `${cfg.bg} ring-2 ring-offset-1 ${cfg.ring} hover:opacity-80 cursor-pointer` : ''}
                    ${!done && !active && reached  ? 'bg-stone-100 hover:bg-stone-200 cursor-pointer' : ''}
                    ${!done && !active && !reached ? 'bg-stone-100 cursor-default opacity-50' : ''}`}>
                  {done ? <Check className="w-4 h-4 text-white" /> : <Icon className={`w-4 h-4 ${active ? cfg.color : reached ? 'text-stone-500' : 'text-stone-300'}`} />}
                </button>
                <span className={`text-xs mt-1 text-center leading-tight max-w-[52px]
                  ${active ? 'font-semibold ' + cfg.color : done ? 'text-green-600 font-medium' : !reached ? 'text-stone-300' : 'text-stone-500'}`}>
                  {step.label}
                </span>
                {hasCat && <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-0.5" />}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 mt-[18px] transition-all ${done ? 'bg-green-400' : 'bg-stone-200'}`} />
              )}
            </div>
          )
        })}
      </div>
      <p className="text-xs text-stone-400 mt-2">
        Ketuk tahap untuk melihat catatan
        {logs.some(l => l.catatan && l.catatan.trim() !== '') && (
          <span className="ml-1 inline-flex items-center gap-1">· <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" /> ada catatan</span>
        )}
      </p>
      {activeStep && (
        <StepPopup stepKey={activeStep} logs={logs} catatanServis={catatanServis} onClose={() => setActiveStep(null)} />
      )}
    </>
  )
}

export default function PelangganProgressPage() {
  const [list, setList]               = useState<ProgressServis[]>([])
  const [loading, setLoading]         = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [expandedId, setExpandedId]   = useState<number | null>(null)

  const fetchProgress = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/pelanggan/progress')
    const json = await res.json()
    if (json.success) {
      setList(json.data)
      if (json.data.length > 0 && !expandedId) setExpandedId(json.data[0].id_servis)
    }
    setLastRefresh(new Date())
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchProgress()
    const iv = setInterval(fetchProgress, 30_000)
    return () => clearInterval(iv)
  }, [fetchProgress])

  const renderCard = (s: ProgressServis) => {
    const cfg      = SC[s.status_servis] ?? SC.menunggu_konfirmasi
    const Icon     = cfg.icon
    const expanded = expandedId === s.id_servis
    const total    = s.jasa.reduce((a, j)   => a + Number(j.harga),    0)
                   + s.sparepart.reduce((a, sp) => a + Number(sp.subtotal), 0)

    return (
      <div key={s.id_servis} className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <button onClick={() => setExpandedId(expanded ? null : s.id_servis)}
          className="w-full p-5 text-left hover:bg-stone-50 transition-colors">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                <Icon className={`w-5 h-5 ${cfg.color}`} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-stone-900">{s.merk} {s.tahun}</p>
                <p className="text-sm text-stone-500">{s.nomor_polisi} · {s.warna}</p>
                {s.tanggal_servis && (
                  <p className="text-xs text-stone-400 mt-0.5">Servis: {fmtTgl(s.tanggal_servis)}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
              {expanded ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
            </div>
          </div>
          <ProgressBar status={s.status_servis} logs={s.logs} catatanServis={s.catatan_servis} />
        </button>

        {expanded && (
          <div className="border-t border-stone-100 divide-y divide-stone-100">
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><p className="text-xs text-stone-400 mb-1">Keluhan</p><p className="text-sm text-stone-700">{s.keluhan || '—'}</p></div>
              <div>
                <p className="text-xs text-stone-400 mb-1">Mekanik</p>
                <p className="text-sm font-medium text-stone-700">{s.nama_mekanik}</p>
                {s.spesialisasi && <p className="text-xs text-stone-400">{s.spesialisasi}</p>}
              </div>
              <div><p className="text-xs text-stone-400 mb-1">Tanggal Booking</p><p className="text-sm text-stone-700">{fmtTgl(s.tanggal_booking)}</p></div>
              {s.tanggal_servis && (
                <div><p className="text-xs text-stone-400 mb-1">Tanggal Servis</p><p className="text-sm text-stone-700">{fmtTgl(s.tanggal_servis)}</p></div>
              )}
            </div>

            {s.jasa.length > 0 && (
              <div className="p-5">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-3">Jasa Servis</p>
                <div className="space-y-2">
                  {s.jasa.map((j, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-stone-700">{j.nama_jasa}</span>
                      <span className="font-medium text-stone-800">{fmtRupiah(j.harga)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {s.sparepart.length > 0 && (
              <div className="p-5">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-3">Sparepart</p>
                <div className="space-y-2">
                  {s.sparepart.map((sp, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-stone-700">{sp.nama_sparepart}<span className="text-stone-400 ml-1">× {sp.jumlah} {sp.satuan}</span></span>
                      <span className="font-medium text-stone-800">{fmtRupiah(sp.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(s.jasa.length > 0 || s.sparepart.length > 0) && (
              <div className="px-5 py-4 bg-stone-50 flex justify-between items-center">
                <span className="text-sm font-semibold text-stone-700">Estimasi Total</span>
                <span className="font-bold text-stone-900">{fmtRupiah(total)}</span>
              </div>
            )}

            {s.logs.length > 0 && (
              <div className="p-5">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-3">Riwayat Status</p>
                <div>
                  {s.logs.map((log, i) => {
                    const c      = SC[log.status]
                    const LIcon  = c?.icon ?? Check
                    const hasCat = log.catatan && log.catatan.trim() !== ''
                    return (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${c?.bg ?? 'bg-stone-100'}`}>
                            <LIcon className={`w-3.5 h-3.5 ${c?.color ?? 'text-stone-500'}`} />
                          </div>
                          {i < s.logs.length - 1 && <div className="w-0.5 flex-1 bg-stone-200 my-1" />}
                        </div>
                        <div className={`flex-1 ${i < s.logs.length - 1 ? 'pb-4' : ''}`}>
                          <p className="text-sm font-medium text-stone-800">{c?.label ?? log.status}</p>
                          {log.keterangan && <p className="text-xs text-stone-400 mt-0.5">{log.keterangan}</p>}
                          <p className="text-xs text-stone-400 mt-0.5">{fmtWaktu(log.waktu_perubahan)}</p>
                          {hasCat && (
                            <div className={`mt-2 rounded-lg px-3 py-2 border text-xs ${c?.bg ?? 'bg-stone-50'} ${c?.border ?? 'border-stone-100'} ${c?.color ?? 'text-stone-600'}`}>
                              <FileText className="w-3 h-3 inline mr-1 opacity-60" />{log.catatan}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Progress Servis</h2>
          <p className="text-stone-500 text-sm mt-0.5">Pantau status pengerjaan kendaraan kamu</p>
        </div>
        <button onClick={fetchProgress}
          className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 border border-stone-200 px-3 py-1.5 rounded-xl hover:border-stone-300 transition-all">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <p className="text-xs text-stone-400">
        Diperbarui {format(lastRefresh, 'HH:mm:ss')} · auto-refresh setiap 30 detik
      </p>

      {loading ? (
        <div className="text-center py-16 text-stone-400 text-sm">Memuat data servis...</div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <Car className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Tidak ada servis yang sedang berjalan</p>
          <p className="text-xs mt-1">Kendaraan kamu tidak sedang dalam proses servis</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest">
            Sedang Berlangsung ({list.length})
          </p>
          {list.map(renderCard)}
        </div>
      )}
    </div>
  )
}