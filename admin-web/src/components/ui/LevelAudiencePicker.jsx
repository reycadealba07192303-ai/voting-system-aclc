import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { ELECTION_LEVELS, labelForLevel } from '../../constants/levels'
import { getSectionsByLevel } from '../../api/students'

/**
 * Pick year levels, then (after clicking a level) tick the sections under it.
 * Empty section list for a selected level = every section in that level.
 */
export default function LevelAudiencePicker({
  levels = [],
  sections = {},
  onChange,
}) {
  const [openLevel, setOpenLevel] = useState(null)
  const [roster, setRoster] = useState({})

  useEffect(() => {
    getSectionsByLevel()
      .then((r) => setRoster(r.data || {}))
      .catch(() => setRoster({}))
  }, [])

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
    const selected = levels.includes(id)
    if (selected) {
      const next = levels.filter((l) => l !== id)
      const { [id]: _, ...rest } = sections
      setLevels(next, rest)
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

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.12)', background: '#12182c' }}
    >
      {ELECTION_LEVELS.map((lv) => {
        const checked = levels.includes(lv.id)
        const names = roster[lv.id] || []
        const picked = sections[lv.id] || []
        const expanded = openLevel === lv.id
        const summary = !checked
          ? ''
          : picked.length
            ? `${picked.length} section${picked.length === 1 ? '' : 's'}`
            : names.length
              ? 'all sections'
              : 'no sections yet'

        return (
          <div key={lv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 px-3 py-2.5">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleLevel(lv.id)}
                className="rounded border-slate-600"
              />
              <button
                type="button"
                onClick={() => {
                  if (!checked) toggleLevel(lv.id)
                  else setOpenLevel(expanded ? null : lv.id)
                }}
                className="flex-1 min-w-0 flex items-center justify-between gap-2 text-left"
              >
                <span className="text-sm text-slate-200">{lv.label}</span>
                <span className="flex items-center gap-2 shrink-0">
                  {summary ? (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-300">
                      {summary}
                    </span>
                  ) : null}
                  <ChevronDown
                    size={14}
                    className={`text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
                  />
                </span>
              </button>
            </div>

            {expanded && (
              <div className="px-3 pb-3 pl-9">
                {names.length === 0 ? (
                  <p className="text-xs text-slate-500 leading-relaxed">
                    No sections enrolled under {labelForLevel(lv.id)} yet. Add sections on the
                    Students page, then come back to tick them here. Leaving them unchecked
                    includes every section in this level.
                  </p>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Sections · {labelForLevel(lv.id)}
                      </p>
                      <button
                        type="button"
                        className="text-[10px] font-semibold text-blue-300 hover:text-blue-200"
                        onClick={() =>
                          selectAllSections(lv.id, names, picked.length !== names.length)
                        }
                      >
                        {picked.length === names.length ? 'Clear' : 'Select all'}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {names.map((name) => {
                        const on = picked.includes(name)
                        return (
                          <label
                            key={name}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-white/5"
                          >
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => toggleSection(lv.id, name)}
                              className="rounded border-slate-600"
                            />
                            <span className="text-xs text-slate-200 truncate">{name}</span>
                          </label>
                        )
                      })}
                    </div>
                    <p className="text-[10px] text-slate-600 mt-2">
                      Ticked sections are who can see this election (including Representative).
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
