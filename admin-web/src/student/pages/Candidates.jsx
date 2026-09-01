import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, LayoutGrid, List, Search, Users } from 'lucide-react'
import CandidateAvatar from '../components/CandidateAvatar'
import EmptyState from '../components/EmptyState'
import { useElection } from '../context/ElectionContext'
import { teamOf } from './TeamRoster'

function positionTitle(candidate) {
  const pos = candidate.position_id
  return pos && typeof pos === 'object' ? pos.title || '' : ''
}

export default function StudentCandidates() {
  const navigate = useNavigate()
  const { election, candidates, loading, loadElections, loadCandidatesFor } =
    useElection()
  const selectedId = election?._id ? String(election._id) : null
  const [team, setTeam] = useState('all')
  const [query, setQuery] = useState('')
  const [view, setView] = useState('grid')
  const [openTeams, setOpenTeams] = useState(() => new Set())

  useEffect(() => {
    loadElections()
  }, [loadElections])

  // The roster belongs to one race — refetch when the switcher moves.
  useEffect(() => {
    if (selectedId) loadCandidatesFor(selectedId)
  }, [selectedId, loadCandidatesFor])

  const teams = useMemo(() => {
    const counts = new Map()
    for (const c of candidates) {
      const name = teamOf(c)
      counts.set(name, (counts.get(name) || 0) + 1)
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [candidates])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return candidates.filter((c) => {
      if (team !== 'all' && teamOf(c) !== team) return false
      if (!q) return true
      return (
        String(c.name || '').toLowerCase().includes(q) ||
        teamOf(c).toLowerCase().includes(q) ||
        positionTitle(c).toLowerCase().includes(q)
      )
    })
  }, [candidates, team, query])

  const byTeam = useMemo(() => {
    const map = new Map()
    for (const c of visible) {
      const name = teamOf(c)
      if (!map.has(name)) map.set(name, [])
      map.get(name).push(c)
    }
    return [...map.entries()]
      .map(([name, list]) => ({
        name,
        list: [...list].sort((a, b) =>
          String(a.name || '').localeCompare(String(b.name || ''))
        ),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [visible])

  useEffect(() => {
    if (view === 'list' && (query.trim() || team !== 'all')) {
      setOpenTeams(new Set(byTeam.map((g) => g.name)))
    }
  }, [query, team, byTeam, view])

  function toggleTeam(name) {
    setOpenTeams((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function openTeam(name) {
    navigate(`/student/candidates/team/${encodeURIComponent(name)}`)
  }

  if (loading && candidates.length === 0) {
    return (
      <div className="sp-team-stack is-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="sp-skeleton" style={{ height: 64 }} />
        ))}
      </div>
    )
  }

  if (!election) {
    return (
      <EmptyState icon={Users} title="No roster yet">
        No election is open for your year level, so there are no candidates to show.
      </EmptyState>
    )
  }

  return (
    <>
      <div className="sp-page-head sp-reveal">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sp-eyebrow">Directory</div>
          <h1 className="sp-h1">Candidates</h1>
          <p className="sp-lead">
            Everyone running in {election.title || 'this election'}. Open a team, then a
            candidate to read their platform.
          </p>
        </div>
        <span className="sp-chip sp-chip-blue">
          {visible.length} of {candidates.length}
        </span>
      </div>

      <div className="sp-toolbar sp-reveal-2">
        <span className="sp-input-wrap">
          <span className="sp-input-icon">
            <Search size={15} />
          </span>
          <input
            className="sp-input sp-input-has-icon"
            placeholder="Search name, partylist, or position"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </span>

        <div className="sp-filters">
          <button
            type="button"
            className={`sp-filter ${team === 'all' ? 'is-active' : ''}`}
            onClick={() => setTeam('all')}
          >
            All ({candidates.length})
          </button>
          {teams.map((t) => (
            <button
              type="button"
              key={t.name}
              className={`sp-filter ${team === t.name ? 'is-active' : ''}`}
              onClick={() => setTeam(t.name)}
            >
              {t.name} ({t.count})
            </button>
          ))}
        </div>

        <div className="sp-filters" style={{ marginLeft: 'auto' }}>
          <button
            type="button"
            className={`sp-btn sp-btn-icon ${view === 'grid' ? 'sp-btn-primary' : 'sp-btn-ghost'}`}
            onClick={() => setView('grid')}
            aria-label="Grid view"
            title="Grid view"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            type="button"
            className={`sp-btn sp-btn-icon ${view === 'list' ? 'sp-btn-primary' : 'sp-btn-ghost'}`}
            onClick={() => setView('list')}
            aria-label="List view"
            title="List view"
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={Search} title="No match">
          {candidates.length === 0
            ? 'No candidates have been filed for this election yet.'
            : `Nothing matches your filters${query.trim() ? ` for “${query.trim()}”` : ''}.`}
        </EmptyState>
      ) : view === 'grid' ? (
        <div className="sp-team-stack is-grid sp-reveal-3">
          {byTeam.map((group) => (
            <button
              type="button"
              key={group.name}
              className="sp-team-card"
              onClick={() => openTeam(group.name)}
            >
              <span className="sp-team-name">{group.name}</span>
              <span className="sp-chip sp-chip-flat">{group.list.length}</span>
              <ChevronRight size={18} className="sp-team-chevron" />
            </button>
          ))}
        </div>
      ) : (
        <div className="sp-team-stack sp-reveal-3">
          {byTeam.map((group) => {
            const open = openTeams.has(group.name)
            return (
              <section
                key={group.name}
                className={`sp-team-block ${open ? 'is-open' : ''}`}
              >
                <button
                  type="button"
                  className="sp-team-toggle"
                  onClick={() => toggleTeam(group.name)}
                  aria-expanded={open}
                >
                  <span className="sp-team-name">{group.name}</span>
                  <span className="sp-chip sp-chip-flat">{group.list.length}</span>
                  <ChevronRight size={18} className="sp-team-chevron" />
                </button>

                {open ? (
                  <div className="sp-team-body">
                    <div className="sp-table-wrap">
                      <table className="sp-table">
                        <thead>
                          <tr>
                            <th>Candidate</th>
                            <th style={{ width: '34%' }}>Running for</th>
                            <th style={{ width: 90 }} />
                          </tr>
                        </thead>
                        <tbody>
                          {group.list.map((c) => (
                            <tr key={c._id}>
                              <td>
                                <div className="sp-cell-person">
                                  <CandidateAvatar
                                    name={c.name}
                                    photo={c.photo_url}
                                    size={32}
                                  />
                                  <div style={{ minWidth: 0 }}>
                                    <div className="sp-cell-name">{c.name}</div>
                                    {c.section ? (
                                      <div className="sp-cell-sub">{c.section}</div>
                                    ) : null}
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className="sp-chip sp-chip-blue sp-chip-caps sp-chip-wrap">
                                  {positionTitle(c) || '—'}
                                </span>
                              </td>
                              <td className="sp-num">
                                <Link
                                  to={`/student/candidates/${c._id}`}
                                  className="sp-btn sp-btn-ghost sp-btn-sm"
                                >
                                  View
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </section>
            )
          })}
        </div>
      )}
    </>
  )
}
