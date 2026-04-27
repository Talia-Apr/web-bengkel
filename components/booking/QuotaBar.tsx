'use client'

import { DailyQuota } from '@/types'
import { Car, AlertTriangle, CheckCircle } from 'lucide-react'

interface QuotaBadgeProps {
  quota: DailyQuota
  showDate?: boolean
  compact?: boolean
}

export default function QuotaBar({ quota, showDate = false, compact = false }: QuotaBadgeProps) {
  const usedSlots = quota.maxCapacity - quota.availableSlots
  const percentage = (usedSlots / quota.maxCapacity) * 100
  const carryOverPercentage = (quota.carryOverFromPrevDay / quota.maxCapacity) * 100

  const getStatus = () => {
    if (quota.availableSlots === 0) return { color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'PENUH', icon: AlertTriangle }
    if (quota.availableSlots <= 2) return { color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', label: 'HAMPIR PENUH', icon: AlertTriangle }
    return { color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'TERSEDIA', icon: CheckCircle }
  }

  const status = getStatus()
  const StatusIcon = status.icon

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${status.bg} ${status.color}`}>
        <StatusIcon className="w-3.5 h-3.5" />
        {quota.availableSlots} slot tersedia
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-stone-900 text-sm">Kapasitas Harian</h3>
          {showDate && (
            <p className="text-stone-400 text-xs mt-0.5">{new Date(quota.date + 'T12:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          )}
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${status.bg} ${status.color}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {status.label}
        </div>
      </div>

      {/* Bar */}
      <div className="relative h-8 bg-stone-100 rounded-lg overflow-hidden mb-3">
        {/* Carry over (previous day) */}
        {quota.carryOverFromPrevDay > 0 && (
          <div
            className="absolute left-0 top-0 h-full bg-red-400 flex items-center justify-center transition-all duration-700"
            style={{ width: `${carryOverPercentage}%` }}
          >
            {carryOverPercentage > 12 && (
              <span className="text-white text-xs font-bold">{quota.carryOverFromPrevDay}</span>
            )}
          </div>
        )}
        {/* Today's bookings */}
        <div
          className="absolute top-0 h-full bg-orange-500 flex items-center justify-center transition-all duration-700"
          style={{ 
            left: `${carryOverPercentage}%`,
            width: `${(quota.bookedSlots / quota.maxCapacity) * 100}%`
          }}
        >
          {(quota.bookedSlots / quota.maxCapacity) * 100 > 10 && (
            <span className="text-white text-xs font-bold">{quota.bookedSlots}</span>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-stone-500 mb-3">
        {quota.carryOverFromPrevDay > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-400" />
            Carryover ({quota.carryOverFromPrevDay} mobil)
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-orange-500" />
          Booking hari ini ({quota.bookedSlots})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-stone-200" />
          Tersedia ({quota.availableSlots})
        </span>
      </div>

      {/* Slots visual */}
      <div className="flex gap-1.5 flex-wrap">
        {[...Array(quota.maxCapacity)].map((_, i) => {
          let type = 'empty'
          if (i < quota.carryOverFromPrevDay) type = 'carryover'
          else if (i < quota.carryOverFromPrevDay + quota.bookedSlots) type = 'booked'

          return (
            <div
              key={i}
              className={`flex items-center justify-center w-8 h-8 rounded-md border-2 transition-all
                ${type === 'carryover' ? 'bg-red-100 border-red-400' : ''}
                ${type === 'booked' ? 'bg-orange-100 border-orange-400' : ''}
                ${type === 'empty' ? 'bg-stone-50 border-stone-200 border-dashed' : ''}
              `}
            >
              <Car className={`w-4 h-4
                ${type === 'carryover' ? 'text-red-500' : ''}
                ${type === 'booked' ? 'text-orange-500' : ''}
                ${type === 'empty' ? 'text-stone-300' : ''}
              `} />
            </div>
          )
        })}
      </div>

      {quota.carryOverFromPrevDay > 0 && (
        <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          ⚠️ {quota.carryOverFromPrevDay} mobil dari hari sebelumnya belum selesai. Kapasitas tersisa: {quota.maxCapacity - quota.carryOverFromPrevDay} slot.
        </p>
      )}
    </div>
  )
}
