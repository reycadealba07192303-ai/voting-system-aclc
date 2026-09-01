import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Hourglass,
  LayoutList,
  RefreshCw,
  Users,
  Vote,
} from 'lucide-react'
import { labelForLevel } from '../../constants/levels'
import Standings from '../components/Standings'
import { useElection } from '../context/ElectionContext'
import { useStudentAuth } from '../context/StudentAuthContext'
import { firstNameOf } from '../utils/name'

function greetingFor(date = new Date()) {
  const h = date.getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function Stat({ icon: Icon, label, value, note, tone }) {
  return (
    <div className="sp-stat">
      <div className="sp-stat-top">
        <div className="sp-stat-label">{label}</div>
        <span className={`sp-stat-icon ${tone || ''}`}>
          <Icon size={15} strokeWidth={2.2} />
        </span>
      </div>
      <div className="sp-stat-value">{value}</div>
      {note ? <div className="sp-stat-note">{note}</div> : null}
    </div>
  )
}

export default function StudentHome() {
  const { student } = useStudentAuth()
  const {
    election,
    elections,
    pendingElections,
    hasVoted,
    results,
    resultsLoading,
    loading,
    isClosed,
    selectElection,
    loadElections,
    loadResultsFor,
  } = useElection()

  const [refreshing, setRefreshing] = useState(false)
  const selectedId = election?._id ? String(election._id) : null

  const load = useCallback(async () => {
    await loadElections()
  }, [loadElections])

  useEffect(() => {
    load()
  }, [load])

  // The tally belongs to whichever race the switcher is pointing at.
  useEffect(() => {
    if (selectedId) loadResultsFor(selectedId)
  }, [selectedId, loadResultsFor])

  async function handleRefresh() {
    setRefreshing(true)
    await load()
    if (selectedId) await loadResultsFor(selectedId)
    setRefreshing(false)
  }

  const levelLabel = labelForLevel(student?.level)
  const openCount = elections.filter((e) => e.status === 'ongoing').length
  const positionCount = results.length
  const candidateCount = results.reduce((n, p) => n + (p.candidates?.length || 0), 0)
  const turnout = results[0]?.total_voters ?? 0

  return (
    <>
      <div className="sp-page-head sp-reveal">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sp-eyebrow">Overview</div>
          <h1 className="sp-h1">
            {greetingFor()}, {firstNameOf(student?.name)}
          </h1>
          <p className="sp-lead">
            {elections.length > 1
              ? `You are on ${elections.length} ballots as a ${levelLabel} student — the campus-wide race and your program's. Cast one in each.`
              : `Everything for the ${levelLabel} student government election — roster, ballot, and the running count.`}
          </p>
        </div>
        <button
          type="button"
          className="sp-btn sp-btn-ghost"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw size={15} className={refreshing ? 'sp-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading && !election ? (
        <div className="sp-skeleton" style={{ height: 132, marginBottom: 24 }} />
      ) : election ? (
        <section className="sp-banner sp-reveal-2">
          <div style={{ flex: 1, minWidth: 260 }}>
            <span className="sp-chip sp-chip-live sp-chip-caps">
              <i className={`sp-dot ${isClosed ? 'sp-dot-off' : ''}`} />
              {isClosed ? 'Closed' : 'Now open'}
            </span>
            <h2 className="sp-banner-title">{election.title || 'SG Election'}</h2>
            <p className="sp-banner-sub">
              {isClosed
                ? 'Voting has ended. The final standings are below.'
                : hasVoted
                  ? 'Your ballot is recorded. The tally below refreshes on its own.'
                  : 'Voting is open for your year level. Cast one ballot — it counts once.'}
            </p>
          </div>
          <Link
            to={hasVoted && !isClosed ? '/student/vote?view=receipt' : '/student/vote'}
            className={`sp-btn sp-btn-lg ${
              hasVoted || isClosed ? 'sp-btn-onhero' : 'sp-btn-accent'
            }`}
          >
            {isClosed ? 'View results' : hasVoted ? 'View my receipt' : 'Go to ballot'}
            <ArrowRight size={16} />
          </Link>
        </section>
      ) : (
        <section className="sp-banner sp-banner-idle sp-reveal-2">
          <div style={{ flex: 1, minWidth: 260 }}>
            <span className="sp-chip sp-chip-flat sp-chip-caps">
              <Hourglass size={12} /> Standby
            </span>
            <h2 className="sp-banner-title">No active election</h2>
            <p className="sp-banner-sub">
              {student?.level
                ? `Nothing is open for ${levelLabel} right now. This page updates the moment voting starts.`
                : 'Ask your admin to set your year level so the right election reaches you.'}
            </p>
          </div>
        </section>
      )}

      {elections.length > 1 ? (
        <section className="sp-panel sp-reveal-2" style={{ marginBottom: 24 }}>
          <header className="sp-panel-head">
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 className="sp-h2" style={{ fontSize: 16 }}>
                Your elections
              </h2>
              <p className="sp-muted" style={{ marginTop: 4 }}>
                You are eligible for every race below. Each one takes its own ballot.
              </p>
            </div>
            <span className="sp-chip sp-chip-flat">{elections.length}</span>
          </header>
          <div className="sp-elx-list">
            {elections.map((e) => {
              const id = String(e._id)
              const open = e.status === 'ongoing'
              const active = id === selectedId
              return (
                <div key={id} className={`sp-elx-row ${active ? 'is-active' : ''}`}>
                  <button
                    type="button"
                    className="sp-elx-row-main"
                    onClick={() => selectElection(id)}
                  >
                    <span className="sp-elx-row-title">{e.title || 'SG Election'}</span>
                    <span className="sp-elx-row-sub">
                      {open ? 'Voting open' : 'Voting closed'} ·{' '}
                      {formatDate(e.start_date)} — {formatDate(e.end_date)}
                    </span>
                  </button>
                  {open && !e.has_voted ? (
                    <Link
                      to="/student/vote"
                      className="sp-btn sp-btn-accent sp-btn-sm"
                      onClick={() => selectElection(id)}
                    >
                      Go to ballot
                      <ArrowRight size={14} />
                    </Link>
                  ) : (
                    <span
                      className={`sp-chip ${e.has_voted ? 'sp-chip-ok' : 'sp-chip-flat'}`}
                    >
                      {e.has_voted ? (
                        <>
                          <CheckCircle2 size={12} /> Voted
                        </>
                      ) : (
                        'Closed'
                      )}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      <div className="sp-stats">
        <Stat
          icon={pendingElections.length ? CircleDashed : CheckCircle2}
          label={openCount > 1 ? 'Your ballots' : 'Your ballot'}
          value={
            openCount === 0
              ? '—'
              : openCount > 1
                ? `${openCount - pendingElections.length} of ${openCount}`
                : pendingElections.length
                  ? 'Not cast'
                  : 'Submitted'
          }
          note={
            pendingElections.length
              ? `${pendingElections.length} still waiting on you`
              : openCount
                ? 'Recorded once, final'
                : 'One ballot per election'
          }
          tone={openCount === 0 ? '' : pendingElections.length ? 'is-warn' : 'is-ok'}
        />
        <Stat
          icon={LayoutList}
          label="Positions"
          value={positionCount || '—'}
          note={positionCount ? 'On this year’s ballot' : 'Published when voting opens'}
        />
        <Stat
          icon={Users}
          label="Candidates"
          value={candidateCount || '—'}
          note={candidateCount ? 'Across all positions' : 'None filed yet'}
        />
        <Stat
          icon={Vote}
          label="Ballots cast"
          value={turnout || 0}
          note="Students who have voted"
        />
      </div>

      <div className="sp-reveal-3">
        <div className="sp-page-head" style={{ marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <h2 className="sp-h2">{isClosed ? 'Final standings' : 'Live standings'}</h2>
            <p className="sp-muted" style={{ marginTop: 4 }}>
              {isClosed
                ? 'The result after voting closed.'
                : 'Updates automatically while this tab is open.'}
            </p>
          </div>
        </div>

        {election ? (
          <section className="sp-panel sp-details-bar">
            <div className="sp-kv">
              <span>Status</span>
              <span style={{ color: isClosed ? '#56637d' : '#0a8a63' }}>
                {isClosed ? 'Closed' : 'Ongoing'}
              </span>
            </div>
            <div className="sp-kv">
              <span>Opens</span>
              <span>{formatDate(election.start_date)}</span>
            </div>
            <div className="sp-kv">
              <span>Closes</span>
              <span>{formatDate(election.end_date)}</span>
            </div>
            <div className="sp-kv">
              <span>Your level</span>
              <span>{levelLabel}</span>
            </div>
            <div className="sp-kv">
              <span>Your section</span>
              <span>{student?.section || '—'}</span>
            </div>
          </section>
        ) : null}

        <Standings
          results={results}
          loading={resultsLoading}
          isClosed={isClosed}
          emptyTitle={election ? 'No tallies yet' : 'Nothing to show yet'}
          emptyHint={
            election
              ? 'The count appears here as students submit their ballots.'
              : 'Standings appear once an election opens for your year level.'
          }
        />
      </div>
    </>
  )
}
