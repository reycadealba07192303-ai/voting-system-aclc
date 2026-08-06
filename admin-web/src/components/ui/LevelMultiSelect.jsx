import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import { ELECTION_LEVELS, labelForLevel } from '../../constants/levels'

/**
 * Multi-select dropdown with checkboxes for audience / year levels.
 * Menu is portaled so it is not clipped by modal overflow.
 */
export default function LevelMultiSelect({
  value = [],
  onChange,
  placeholder = 'Select levels…',
}) {
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState({})
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const menuRef = useRef(null)

  const placeMenu = () => {
    const btn = buttonRef.current
    if (!btn) return
    const r = btn.getBoundingClientRect()
    const gap = 6
    const preferred = 320
    const spaceBelow = window.innerHeight - r.bottom - gap - 8
    const spaceAbove = r.top - gap - 8
    const openUp = spaceBelow < 180 && spaceAbove > spaceBelow
    const maxHeight = Math.min(preferred, openUp ? spaceAbove : spaceBelow)

    setMenuStyle({
      position: 'fixed',
      left: r.left,
      width: r.width,
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
  }, [open])

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

  const toggle = (id) => {
    const set = new Set(value)
    if (set.has(id)) set.delete(id)
    else set.add(id)
    onChange([...set])
  }

  const summary =
    value.length === 0
      ? placeholder
      : value.length <= 2
        ? value.map(labelForLevel).join(', ')
        : `${value.length} levels selected`

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
          {ELECTION_LEVELS.map((lv) => {
            const checked = value.includes(lv.id)
            return (
              <label
                key={lv.id}
                className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-white/5 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(lv.id)}
                  className="rounded border-slate-600"
                />
                <span className="text-sm text-slate-200">{lv.label}</span>
              </label>
            )
          })}
        </div>,
        document.body
      )
    : null

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input-dark w-full flex items-center justify-between gap-2 text-left"
        style={{ cursor: 'pointer' }}
      >
        <span className={value.length ? 'text-slate-200 truncate' : 'text-slate-500'}>
          {summary}
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {menu}
    </div>
  )
}
