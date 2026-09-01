import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Search, Users } from 'lucide-react'
import CandidateAvatar from '../components/CandidateAvatar'
import EmptyState from '../components/EmptyState'
import { photoUrl } from '../api/client'
import { useElection } from '../context/ElectionContext'
import { initialsOf } from '../utils/name'

export function teamOf(candidate) {
  return (candidate.partylist || '').trim() || 'Independent'
}

function positionTitle(candidate) {
  const pos = candidate.position_id
  return pos && typeof pos === 'object' ? pos.title || '' : ''
}

function CandidateCard({ candidate }) {
  const [broken, setBroken] = useState(false)
  const src = broken ? null : photoUrl(candidate.photo_url)
  const position = positionTitle(candidate)

  return (
    <Link to={`/student/candidates/${candidate._id}`} className="sp-cand-card">
      <div className="sp-cand-photo">
        {src ? (
          <img
            src={src}
            alt={candidate.name}
            loading="lazy"
            onError={() => setBroken(true)}
          />
        ) : (
          <span>{initialsOf(candidate.name, '?')}</span>
        )}
      </div>
      <div className="sp-cand-meta">
        {position ? (
          <span
            className="sp-chip sp-chip-blue sp-chip-caps sp-chip-wrap"
            style={{ marginBottom: 8 }}
            title={position}
          >
            {position}
          </span>
        ) : null}
        <div className="sp-cell-name" style={{ fontSize: 14.5 }}>
          {candidate.name}
        </div>
        {candidate.section ? (
          <div className="sp-cell-sub">{candidate.section}</div>
        ) : null}
      </div>
    </Link>
  )
}

/** Members of one team — opened from the Candidates grid. */
export default function TeamRoster() {
  const { teamName } = useParams()
  const navigate = useNavigate()
  const decoded = decodeURIComponent(teamName || '')
  const { election, candidates, loading, loadElections, loadCandidatesFor } =
    useElection()
  const selectedId = election?._id ? String(election._id) : null
  const [query, setQuery] = useState('')

  useEffect(() => {
    loadElections()
  }, [loadElections])

  // The roster belongs to one race — refetch when the switcher moves.
  useEffect(() => {
    if (selectedId) loadCandidatesFor(selectedId)
  }, [selectedId, loadCandidatesFor])

  const members = useMemo(() => {
    const q = query.trim().toLowerCase()
    return candidates
      .filter((c) => teamOf(c) === decoded)
      .filter((c) => {
        if (!q) return true
        return (
          String(c.name || '').toLowerCase().includes(q) ||
          positionTitle(c).toLowerCase().includes(q)
        )
      })
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
  }, [candidates, decoded, query])

  if (loading && candidates.length === 0) {
    return (
      <div className="sp-cards">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="sp-skeleton" style={{ height: 220 }} />
        ))}
      </div>
    )
  }

  if (!election) {
    return (
      <EmptyState icon={Users} title="No roster yet">
        No election is open for your year level.
      </EmptyState>
    )
  }

  return (
    <>
      <button
        type="button"
        className="sp-btn sp-btn-ghost"
        style={{ marginBottom: 16 }}
        onClick={() => navigate('/student/candidates')}
      >
        <ArrowLeft size={15} /> All teams
      </button>

      <div className="sp-page-head sp-reveal">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sp-eyebrow">Team</div>
          <h1 className="sp-h1">{decoded}</h1>
          <p className="sp-lead">
            {members.length} candidate{members.length === 1 ? '' : 's'} · open a name to
            read their platform.
          </p>
        </div>
      </div>

      <div className="sp-toolbar sp-reveal-2">
        <span className="sp-input-wrap">
          <span className="sp-input-icon">
            <Search size={15} />
          </span>
          <input
            className="sp-input sp-input-has-icon"
            placeholder="Search this team"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </span>
      </div>

      {members.length === 0 ? (
        <EmptyState icon={Users} title="No candidates">
          {query.trim()
            ? `Nothing matches “${query.trim()}” on this team.`
            : 'This team has no candidates filed.'}
        </EmptyState>
      ) : (
        <div className="sp-cards sp-reveal-3">
          {members.map((c) => (
            <CandidateCard key={c._id} candidate={c} />
          ))}
        </div>
      )}
    </>
  )
}
