'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search, X } from 'lucide-react'

export interface SelectOption {
  value: string | number
  label: string
  sub?: string
}

interface Props {
  options: SelectOption[]
  value: string | number
  onChange: (value: string | number) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = '-- Pilih atau ketik --',
  disabled = false,
  className = '',
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selected = options.find(o => String(o.value) === String(value))

  const calcPos = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const dropH = 300 // fixed max height

    const openDown = spaceBelow >= 200 || spaceBelow >= spaceAbove

    const top = openDown
      ? rect.bottom + 4
      : Math.max(8, rect.top - dropH - 4)

    setPos({
      top,
      left: rect.left,
      width: rect.width,
    })
  }, [])

  const handleClose = useCallback(() => {
    setOpen(false)
    setQuery('')
  }, [])

  useEffect(() => {
    if (!open) return

    const onClickOutside = (e: MouseEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || dropdownRef.current?.contains(t)) return
      handleClose()
    }

    const onScrollResize = () => {
      calcPos()
    }

    document.addEventListener('mousedown', onClickOutside)
    window.addEventListener('scroll', onScrollResize, true)
    window.addEventListener('resize', onScrollResize)

    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      window.removeEventListener('scroll', onScrollResize, true)
      window.removeEventListener('resize', onScrollResize)
    }
  }, [open, calcPos, handleClose])

  useEffect(() => {
    if (open) {
      calcPos()
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open, calcPos])

  const handleOpen = () => {
    if (disabled) return
    if (!open) calcPos()
    setOpen(o => !o)
  }

  const handleSelect = (opt: SelectOption) => {
    onChange(opt.value)
    handleClose()
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setQuery('')
  }

  const filtered = query.trim()
    ? options.filter(
        o =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          (o.sub ?? '').toLowerCase().includes(query.toLowerCase())
      )
    : options

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: 99999,
      }}
      className="bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden"
    >
      <div className="p-2 border-b border-stone-100">
        <div className="flex items-center gap-2 bg-stone-50 rounded-lg px-3 py-1.5">
          <Search className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ketik untuk cari..."
            className="flex-1 bg-transparent text-sm text-stone-800 placeholder-stone-400 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-stone-300 hover:text-stone-500">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <ul className="max-h-56 overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <li className="px-4 py-3 text-sm text-stone-400 text-center">
            Tidak ada hasil untuk &ldquo;{query}&rdquo;
          </li>
        ) : (
          filtered.map(opt => (
            <li key={String(opt.value)}>
              <button
                type="button"
                onClick={() => handleSelect(opt)}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 transition-colors ${
                  String(opt.value) === String(value)
                    ? 'bg-orange-50 text-orange-700 font-medium'
                    : 'text-stone-700'
                }`}
              >
                <span className="block">{opt.label}</span>
                {opt.sub && <span className="block text-xs text-stone-400 mt-0.5">{opt.sub}</span>}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  ) : null

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        className={`w-full flex items-center gap-2 px-3 py-2.5 border rounded-xl text-sm text-left transition-colors ${
          disabled
            ? 'bg-stone-50 text-stone-400 cursor-not-allowed border-stone-200'
            : 'bg-white border-stone-300 hover:border-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500'
        } ${open ? 'border-orange-500 ring-2 ring-orange-500' : ''}`}
      >
        <span className="flex-1 truncate">
          {selected ? (
            <span className="text-stone-800">{selected.label}</span>
          ) : (
            <span className="text-stone-400">{placeholder}</span>
          )}
        </span>

        {selected && !disabled && (
          <span onClick={handleClear} className="text-stone-300 hover:text-stone-500 flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </span>
        )}

        <ChevronDown
          className={`w-3.5 h-3.5 text-stone-400 flex-shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {typeof window !== 'undefined' && dropdown && createPortal(dropdown, document.body)}
    </div>
  )
}