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
  const { student, hasVoted, markVoted } = useStudentAuth()
  const {
    election,
    results,
    resultsLoading,
    loading,
    isClosed,
    loadActiveElection,
    loadResultsFor,
    fetchVoteStatus,
  } = useElection()

  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    const active = await loadActiveElection()
    if (!active?._id) return
    await loadResultsFor(active._id)
    try {
      const { data } = await fetchVoteStatus(active._id)
      markVoted(data?.has_voted === true)
    } catch {
      // non-fatal
    }
  }, [loadActiveElection, loadResultsFor, fetchVoteStatus, markVoted])

  useEffect(() => {
    load()
  }, [load])

  async function handleRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const levelLabel = labelForLevel(student?.level)
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
            Everything for the {levelLabel} student government election — roster, ballot,
            and the running count.
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

      <div className="sp-stats">
        <Stat
          icon={hasVoted ? CheckCircle2 : CircleDashed}
          label="Your ballot"
          value={hasVoted ? 'Submitted' : election ? 'Not cast' : '—'}
          note={hasVoted ? 'Recorded once, final' : 'One ballot per student'}
          tone={hasVoted ? 'is-ok' : election ? 'is-warn' : ''}
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
