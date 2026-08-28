import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Globe2,
  RefreshCw,
  Radio,
} from 'lucide-react'
import { ELECTION_LEVELS, labelForLevel } from '../../constants/levels'
import EmptyState from '../components/EmptyState'
import Standings from '../components/Standings'
import { getCampusStandings } from '../api/studentApi'

const LIVE_MS = 8000

/** Levels this election is open to — expand legacy buckets for filters. */
function levelsOf(election) {
  const raw = election.audience_levels || []
  if (!raw.length) return ['all']
  const out = new Set()
  for (const id of raw) {
    if (id === 'junior_high') {
      ;['grade_7', 'grade_8', 'grade_9', 'grade_10'].forEach((l) => out.add(l))
    } else if (id === 'college') {
      ;['college_1', 'college_2', 'college_3', 'college_4', 'college_5'].forEach((l) =>
        out.add(l)
      )
    } else {
      out.add(id)
    }
  }
  return [...out]
}

function audienceLabel(election) {
  const levels = election.audience_levels || []
  if (!levels.length) return 'All levels'
  if (levels.length === 1) return labelForLevel(levels[0])
  if (levels.length <= 3) return levels.map(labelForLevel).join(' · ')
  return `${levels.length} year levels`
}

export default function CampusStandings() {
  const [elections, setElections] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [level, setLevel] = useState('all')
  const [error, setError] = useState('')

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const { data } = await getCampusStandings()
      setElections(Array.isArray(data) ? data : [])
      setError('')
    } catch (err) {
      if (!silent) setElections([])
      setError(err?.response?.data?.message || 'Could not load campus standings.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Keep the campus race live while this tab is open.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') load({ silent: true })
    }
    const timer = setInterval(tick, LIVE_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [load])

  const levelFilters = useMemo(() => {
    const present = new Set()
    for (const el of elections) {
      for (const id of levelsOf(el)) {
        if (id !== 'all') present.add(id)
      }
    }
    return ELECTION_LEVELS.filter((l) => present.has(l.id))
  }, [elections])

  const visible = useMemo(() => {
    if (level === 'all') return elections
    return elections.filter((el) => levelsOf(el).includes(level))
  }, [elections, level])

  const ongoingCount = elections.filter((e) => e.status === 'ongoing').length

  return (
    <>
      <div className="sp-page-head sp-reveal">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sp-eyebrow">Campus-wide</div>
          <h1 className="sp-h1">All levels</h1>
          <p className="sp-lead">
            Live races from grade school to tertiary — every election that is open or
            recently closed. This is separate from your ballot, which only covers your
            year level.
          </p>
        </div>
        <button
          type="button"
          className="sp-btn sp-btn-ghost"
          onClick={() => load({ silent: true })}
          disabled={refreshing}
        >
          <RefreshCw size={15} className={refreshing ? 'sp-spin' : ''} />
          Refresh
        </button>
      </div>

      <section className="sp-banner sp-reveal-2">
        <div style={{ flex: 1, minWidth: 260 }}>
          <span className="sp-chip sp-chip-live sp-chip-caps">
            <i className={`sp-dot ${ongoingCount ? '' : 'sp-dot-off'}`} />
            {ongoingCount ? 'Live sync' : 'No open races'}
          </span>
          <h2 className="sp-banner-title">Who is running campus-wide</h2>
          <p className="sp-banner-sub">
            {elections.length
              ? `${elections.length} election${elections.length === 1 ? '' : 's'} · ${ongoingCount} ongoing · updates every few seconds`
              : 'When admins open elections for any year level, they appear here with live tallies.'}
          </p>
        </div>
        <span className="sp-chip sp-chip-live" style={{ gap: 8 }}>
          <Radio size={14} />
          Auto-refresh
        </span>
      </section>

      {levelFilters.length > 0 ? (
        <div className="sp-toolbar sp-reveal-3">
          <div className="sp-filters">
            <button
              type="button"
              className={`sp-filter ${level === 'all' ? 'is-active' : ''}`}
              onClick={() => setLevel('all')}
            >
              All levels ({elections.length})
            </button>
            {levelFilters.map((l) => {
              const count = elections.filter((el) => levelsOf(el).includes(l.id)).length
              return (
                <button
                  type="button"
                  key={l.id}
                  className={`sp-filter ${level === l.id ? 'is-active' : ''}`}
                  onClick={() => setLevel(l.id)}
                >
                  {l.label} ({count})
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="sp-alert sp-alert-error" style={{ marginBottom: 18 }}>
          {error}
        </div>
      ) : null}

      {loading && elections.length === 0 ? (
        <div style={{ display: 'grid', gap: 16 }}>
          {[0, 1].map((i) => (
            <div key={i} className="sp-skeleton" style={{ height: 220 }} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState icon={Globe2} title="No campus races yet">
          {elections.length === 0
            ? 'Nothing is published campus-wide right now. Check back when voting opens for any year level.'
            : `No elections match ${labelForLevel(level)}.`}
        </EmptyState>
      ) : (
        <div className="sp-campus-stack">
          {visible.map((el) => (
            <article key={el._id} className="sp-campus-block">
              <header className="sp-campus-head">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="sp-campus-meta">
                    <span
                      className={`sp-chip ${
                        el.status === 'ongoing' ? 'sp-chip-ok' : 'sp-chip-flat'
                      }`}
                    >
                      <i
                        className={`sp-dot ${
                          el.status === 'ongoing' ? '' : 'sp-dot-off'
                        }`}
                      />
                      {el.status === 'ongoing' ? 'Ongoing' : 'Closed'}
                    </span>
                    <span className="sp-chip sp-chip-blue">{audienceLabel(el)}</span>
                    <span className="sp-chip sp-chip-flat">
                      {el.total_ballots || 0} ballot
                      {(el.total_ballots || 0) === 1 ? '' : 's'}
                    </span>
                  </div>
                  <h2 className="sp-h2" style={{ marginTop: 10, fontSize: 18 }}>
                    {el.title || 'SG Election'}
                  </h2>
                </div>
              </header>

              <Standings
                results={el.positions || []}
                loading={false}
                isClosed={el.status === 'closed'}
                emptyTitle="No tallies yet"
                emptyHint="Votes for this race will show up here as ballots come in."
              />
            </article>
          ))}
        </div>
      )}
    </>
  )
}
