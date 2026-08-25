import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Users, X } from 'lucide-react'
import { ELECTION_LEVELS, labelForLevel } from '../../constants/levels'
import { getSectionsByLevel } from '../../api/students'

/**
 * Pick year levels, then (after opening a level) tick the sections under it.
 * Empty section list for a selected level = every section in that level.
 *
 * Collapsed into a dropdown: eleven always-open rows made the election form
 * taller than the modal. Selections stay visible as chips under the trigger.
 */

/** Group headers so eleven levels stay scannable in a short menu. */
function groupOf(id) {
  if (id.startsWith('college')) return 'College'
  if (id === 'grade_11' || id === 'grade_12') return 'Senior High'
  return 'Junior High'
}

const LEVEL_GROUPS = ['Junior High', 'Senior High', 'College']
  .map((name) => ({
    name,
    items: ELECTION_LEVELS.filter((l) => groupOf(l.id) === name),
  }))
  .filter((g) => g.items.length)

export default function LevelAudiencePicker({ levels = [], sections = {}, onChange }) {
  const [open, setOpen] = useState(false)
  const [openLevel, setOpenLevel] = useState(null)
  const [menuStyle, setMenuStyle] = useState({})
  const [roster, setRoster] = useState({})

  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    getSectionsByLevel()
      .then((r) => setRoster(r.data || {}))
      .catch(() => setRoster({}))
  }, [])

  // ── Positioning (mirrors SelectDropdown so both menus behave the same) ──────
  const placeMenu = () => {
    const btn = buttonRef.current
    if (!btn) return
    const r = btn.getBoundingClientRect()
    const gap = 6
    const preferred = 340
    const spaceBelow = window.innerHeight - r.bottom - gap - 8
    const spaceAbove = r.top - gap - 8
    const openUp = spaceBelow < 200 && spaceAbove > spaceBelow

    setMenuStyle({
      position: 'fixed',
      left: r.left,
      width: r.width,
      maxHeight: Math.max(180, Math.min(preferred, openUp ? spaceAbove : spaceBelow)),
      zIndex: 200,
      ...(openUp
        ? { bottom: window.innerHeight - r.top + gap, top: 'auto' }
        : { top: r.bottom + gap, bottom: 'auto' }),
    })
  }

  useLayoutEffect(() => {
    if (!open) return undefined
    placeMenu()
    const reposition = () => placeMenu()
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      const inRoot = rootRef.current?.contains(e.target)
      const inMenu = menuRef.current?.contains(e.target)
      if (!inRoot && !inMenu) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // ── Selection helpers (unchanged rules) ────────────────────────────────────
  const setLevels = (nextLevels, nextSections = sections) => {
    const cleaned = {}
    for (const lv of nextLevels) {
      if (Array.isArray(nextSections[lv]) && nextSections[lv].length) {
        cleaned[lv] = nextSections[lv]
      }
    }
    onChange({ audience_levels: nextLevels, audience_sections: cleaned })
  }

  const toggleLevel = (id) => {
    if (levels.includes(id)) {
      const rest = { ...sections }
      delete rest[id]
      setLevels(
        levels.filter((l) => l !== id),
        rest,
      )
      if (openLevel === id) setOpenLevel(null)
    } else {
      setLevels([...levels, id], sections)
      setOpenLevel(id)
    }
  }

  const toggleSection = (levelId, sectionName) => {
    const current = new Set(sections[levelId] || [])
    if (current.has(sectionName)) current.delete(sectionName)
    else current.add(sectionName)
    const nextSections = { ...sections, [levelId]: [...current] }
    const nextLevels = levels.includes(levelId) ? levels : [...levels, levelId]
    setLevels(nextLevels, nextSections)
  }

  const selectAllSections = (levelId, names, allOn) => {
    const nextSections = { ...sections, [levelId]: allOn ? [...names] : [] }
    const nextLevels = levels.includes(levelId) ? levels : [...levels, levelId]
    setLevels(nextLevels, nextSections)
  }

  const clearAll = () => {
    setOpenLevel(null)
    onChange({ audience_levels: [], audience_sections: {} })
  }

  const selectAllLevels = () =>
    setLevels(
      ELECTION_LEVELS.map((l) => l.id),
      sections,
    )

  const sectionSummary = (id) => {
    const picked = sections[id] || []
    if (picked.length) return `${picked.length} section${picked.length === 1 ? '' : 's'}`
    return (roster[id] || []).length ? 'all sections' : 'no sections yet'
  }

  const allSelected = levels.length === ELECTION_LEVELS.length

  const triggerLabel =
    levels.length === 0
      ? 'Select year levels…'
      : allSelected
        ? 'All year levels'
        : levels.length <= 2
          ? levels.map(labelForLevel).join(', ')
          : `${labelForLevel(levels[0])} +${levels.length - 1} more`

  // ── Menu ───────────────────────────────────────────────────────────────────
  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          className="overflow-y-auto rounded-xl shadow-2xl"
          style={{
            ...menuStyle,
            background: '#161b27',
            border: '1px solid rgba(255,255,255,0.14)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.55)',
          }}
        >
          <div
            className="sticky top-0 z-10 flex items-center justify-between gap-2 px-3 py-2"
            style={{
              background: '#161b27',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {levels.length} selected
            </span>
            <span className="flex items-center gap-3">
              <button
                type="button"
                className="text-[11px] font-semibold text-blue-300 hover:text-blue-200"
                onClick={allSelected ? clearAll : selectAllLevels}
              >
                {allSelected ? 'Clear all' : 'Select all'}
              </button>
            </span>
          </div>

          {LEVEL_GROUPS.map((group) => (
            <div key={group.name}>
              <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                {group.name}
              </p>
              {group.items.map((lv) => {
                const checked = levels.includes(lv.id)
                const names = roster[lv.id] || []
                const picked = sections[lv.id] || []
                const expanded = openLevel === lv.id

                return (
                  <div key={lv.id}>
                    <div className="flex items-center gap-2 px-3 py-2 hover:bg-white/5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleLevel(lv.id)}
                        className="rounded border-slate-600 shrink-0"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!checked) toggleLevel(lv.id)
                          else setOpenLevel(expanded ? null : lv.id)
                        }}
                        className="flex-1 min-w-0 flex items-center justify-between gap-2 text-left"
                      >
                        <span className="text-sm text-slate-200 truncate">
                          {lv.label}
                        </span>
                        <span className="flex items-center gap-2 shrink-0">
                          {checked ? (
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-300">
                              {sectionSummary(lv.id)}
                            </span>
                          ) : null}
                          <ChevronDown
                            size={14}
                            className={`text-slate-500 transition-transform ${
                              expanded ? 'rotate-180' : ''
                            }`}
                          />
                        </span>
                      </button>
                    </div>

                    {expanded ? (
                      <div className="px-3 pb-3 pl-9">
                        {names.length === 0 ? (
                          <p className="text-xs text-slate-500 leading-relaxed">
                            No sections enrolled under {labelForLevel(lv.id)} yet. Add
                            sections on the Students page, then come back to tick them
                            here. Leaving them unchecked includes every section in this
                            level.
                          </p>
                        ) : (
                          <>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                Sections
                              </p>
                              <button
                                type="button"
                                className="text-[10px] font-semibold text-blue-300 hover:text-blue-200"
                                onClick={() =>
                                  selectAllSections(
                                    lv.id,
                                    names,
                                    picked.length !== names.length,
                                  )
                                }
                              >
                                {picked.length === names.length ? 'Clear' : 'Select all'}
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                              {names.map((name) => (
                                <label
                                  key={name}
                                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-white/5"
                                >
                                  <input
                                    type="checkbox"
                                    checked={picked.includes(name)}
                                    onChange={() => toggleSection(lv.id, name)}
                                    className="rounded border-slate-600"
                                  />
                                  <span className="text-xs text-slate-200 truncate">
                                    {name}
                                  </span>
                                </label>
                              ))}
                            </div>
                            <p className="text-[10px] text-slate-600 mt-2">
                              Ticked sections are who can see this election (including
                              Representative).
                            </p>
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ))}
        </div>,
        document.body,
      )
    : null

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 rounded-[10px] px-3.5 py-2.5 text-left transition-all"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: open
            ? '1px solid rgba(35,51,180,0.55)'
            : '1px solid rgba(255,255,255,0.1)',
          boxShadow: open ? '0 0 0 3px rgba(35,51,180,0.15)' : 'none',
        }}
      >
        <Users size={15} className="shrink-0 text-blue-200/80" />
        <span
          className={`flex-1 text-sm truncate ${
            levels.length ? 'text-slate-100' : 'text-slate-500'
          }`}
        >
          {triggerLabel}
        </span>
        {levels.length ? (
          <span
            className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
            style={{ background: 'rgba(35,51,180,0.28)', color: '#bfd0ff' }}
          >
            {levels.length}
          </span>
        ) : null}
        <ChevronDown
          size={16}
          strokeWidth={2}
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Selected levels stay readable without reopening the menu. */}
      {levels.length ? (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {levels.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg text-[11px] font-medium"
              style={{
                background: 'rgba(35,51,180,0.18)',
                border: '1px solid rgba(35,51,180,0.35)',
                color: '#cfdaff',
              }}
            >
              {labelForLevel(id)}
              <span className="text-[9px] uppercase tracking-wide text-blue-300/70">
                {sectionSummary(id)}
              </span>
              <button
                type="button"
                onClick={() => toggleLevel(id)}
                className="p-0.5 rounded hover:bg-white/10 text-blue-200/70 hover:text-white"
                aria-label={`Remove ${labelForLevel(id)}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {menu}
    </div>
  )
}
