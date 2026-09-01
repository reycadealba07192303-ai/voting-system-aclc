import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, Megaphone, UserRound } from 'lucide-react'
import EmptyState from '../components/EmptyState'
import { photoUrl } from '../api/client'
import { useElection } from '../context/ElectionContext'
import { initialsOf } from '../utils/name'

function Section({ icon: Icon, title, body }) {
  if (!body) return null
  return (
    <section className="sp-panel">
      <header className="sp-panel-head">
        <Icon size={15} color="#2333b4" />
        <h3 className="sp-h2">{title}</h3>
      </header>
      <div className="sp-panel-body">
        <p className="sp-muted" style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 13.5 }}>
          {body}
        </p>
      </div>
    </section>
  )
}

export default function StudentCandidateDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { election, candidates, loadElections, loadCandidatesFor } = useElection()
  const [broken, setBroken] = useState(false)
  const selectedId = election?._id ? String(election._id) : null

  useEffect(() => {
    loadElections()
  }, [loadElections])

  // Deep links land here with an empty roster — pull the selected race's list.
  useEffect(() => {
    if (selectedId && !candidates.length) loadCandidatesFor(selectedId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const candidate = candidates.find((c) => String(c._id) === String(id))

  if (!candidate) {
    return (
      <EmptyState
        icon={UserRound}
        title="Candidate not found"
        action={
          <button
            type="button"
            className="sp-btn sp-btn-ghost"
            onClick={() => navigate('/student/candidates')}
          >
            <ArrowLeft size={15} /> Back to candidates
          </button>
        }
      >
        This candidate is not on the roster for the current election.
      </EmptyState>
    )
  }

  const pos = candidate.position_id
  const posTitle = pos && typeof pos === 'object' ? pos.title : ''
  const src = broken ? null : photoUrl(candidate.photo_url)

  return (
    <>
      <button
        type="button"
        className="sp-btn sp-btn-ghost"
        style={{ marginBottom: 18 }}
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={15} /> Back
      </button>

      <div className="sp-detail">
        <div className="sp-detail-photo">
          {src ? (
            <img src={src} alt={candidate.name} onError={() => setBroken(true)} />
          ) : (
            <span style={{ fontSize: 42, fontWeight: 800 }}>
              {initialsOf(candidate.name, '?')}
            </span>
          )}
        </div>

        <div className="sp-detail-main">
          <div>
            {posTitle ? (
              <span
                className="sp-chip sp-chip-blue sp-chip-caps sp-chip-wrap"
                style={{ marginBottom: 10 }}
              >
                {posTitle}
              </span>
            ) : null}
            <h1 className="sp-h1" style={{ marginTop: posTitle ? 10 : 0 }}>
              {candidate.name}
            </h1>
            <p className="sp-lead" style={{ marginTop: 6 }}>
              {[candidate.partylist || 'Independent', candidate.section]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>

          <Section icon={Megaphone} title="Platform" body={candidate.platform} />
          <Section icon={FileText} title="Biodata" body={candidate.biodata} />

          {!candidate.platform && !candidate.biodata ? (
            <EmptyState icon={FileText} title="No platform yet">
              This candidate has not published a platform or biodata.
            </EmptyState>
          ) : null}
        </div>
      </div>
    </>
  )
}
