import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'

/**
 * Custom single-select dropdown (replaces native <select>).
 *
 * options: [{ value, label, right? }]
 * right — optional React node shown on the right of each option (e.g. Badge)
 */
export default function SelectDropdown({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select…',
  icon: Icon = null,
  className = '',
  minWidth = 220,
  emptyLabel = 'No options',
}) {
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState({})
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const menuRef = useRef(null)

  const selected =
    value === '' || value == null
      ? null
      : options.find((o) => String(o.value) === String(value))

  const placeMenu = () => {
    const btn = buttonRef.current
    if (!btn) return
    const r = btn.getBoundingClientRect()
    const gap = 6
    const preferred = 280
    const spaceBelow = window.innerHeight - r.bottom - gap - 8
    const spaceAbove = r.top - gap - 8
    const openUp = spaceBelow < 160 && spaceAbove > spaceBelow
    const maxHeight = Math.min(preferred, openUp ? spaceAbove : spaceBelow)

    setMenuStyle({
      position: 'fixed',
      left: r.left,
      width: Math.max(r.width, minWidth),
      maxHeight: Math.max(140, maxHeight),
      zIndex: 200,
      ...(openUp
        ? { bottom: window.innerHeight - r.top + gap, top: 'auto' }
        : { top: r.bottom + gap, bottom: 'auto' }),
    })
  }

  useLayoutEffect(() => {
    if (!open) return undefined
    placeMenu()
    const onScrollOrResize = () => placeMenu()
    window.addEventListener('resize', onScrollOrResize)
    window.addEventListener('scroll', onScrollOrResize, true)
    return () => {
      window.removeEventListener('resize', onScrollOrResize)
      window.removeEventListener('scroll', onScrollOrResize, true)
    }
  }, [open, minWidth])

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      const inRoot = rootRef.current?.contains(e.target)
      const inMenu = menuRef.current?.contains(e.target)
      if (!inRoot && !inMenu) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          className="overflow-y-auto rounded-xl py-1.5 shadow-2xl"
          style={{
            ...menuStyle,
            background: '#161b27',
            border: '1px solid rgba(255,255,255,0.14)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.55)',
          }}
        >
          {options.length === 0 ? (
            <p className="px-3 py-3 text-sm text-slate-500">{emptyLabel}</p>
          ) : (
            options.map((opt) => {
              const active = String(opt.value) === String(value)
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                  style={
                    active
                      ? { background: 'rgba(99,102,241,0.14)' }
                      : undefined
                  }
                >
                  <span
                    className={`text-sm truncate ${
                      active ? 'text-indigo-200 font-medium' : 'text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </span>
                  {opt.right ? <span className="shrink-0">{opt.right}</span> : null}
                </button>
              )
            })
          )}
        </div>,
        document.body
      )
    : null

  return (
    <div
      className={`relative max-w-full ${className}`}
      style={{ minWidth }}
      ref={rootRef}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 rounded-[10px] px-3.5 py-2.5 text-left transition-all"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: open
            ? '1px solid rgba(99,102,241,0.55)'
            : '1px solid rgba(255,255,255,0.1)',
          boxShadow: open ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
          cursor: 'pointer',
        }}
      >
        {Icon ? <Icon size={15} className="shrink-0 text-indigo-300/80" /> : null}
        <span
          className={`flex-1 text-sm truncate ${
            selected ? 'text-slate-100' : 'text-slate-500'
          }`}
        >
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {menu}
    </div>
  )
}
