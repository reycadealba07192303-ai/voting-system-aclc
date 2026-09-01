import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  Lock,
  MinusCircle,
  ShieldCheck,
  UserX,
} from 'lucide-react'
import { labelForLevel } from '../../constants/levels'
import CandidateAvatar from '../components/CandidateAvatar'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import { apiMessage } from '../api/client'
import { useElection } from '../context/ElectionContext'
import { useStudentAuth } from '../context/StudentAuthContext'
import VoteReceipt from './VoteReceipt'

/** Candidates come nested on the ballot; fall back to the flat roster. */
function candidatesFor(position, roster) {
  if (position.candidates?.length) return position.candidates
  const posId = String(position._id)
  return roster.filter((c) => {
    const pos = c.position_id
    const id = pos && typeof pos === 'object' ? pos._id : pos
    return String(id) === posId
  })
}

export default function StudentVote() {
  const navigate = useNavigate()
  const { student } = useStudentAuth()
  const {
    election,
    elections,
    pendingElections,
    hasVoted,
    ballot,
    candidates,
    loading,
    isClosed,
    loadElections,
    loadBallotFor,
    selectElection,
    fetchVoteStatus,
    markVotedIn,
    submitVote,
  } = useElection()

  /** positionId -> candidateId. A position missing here means "abstain". */
  const [picks, setPicks] = useState({})
  const [index, setIndex] = useState(0)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [voteStatus, setVoteStatus] = useState(null)
  const [checking, setChecking] = useState(true)

  const selectedId = election?._id ? String(election._id) : null

  useEffect(() => {
    loadElections()
  }, [loadElections])

  // Re-bootstrap whenever the student switches to another race.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!selectedId) {
        if (!cancelled) setChecking(false)
        return
      }
      if (!cancelled) {
        setChecking(true)
        setPicks({})
        setIndex(0)
        setError('')
      }

      // Whether the ballot or the receipt shows depends on the server, not cache.
      let alreadyVoted = false
      try {
        const { data } = await fetchVoteStatus(selectedId)
        alreadyVoted = data?.has_voted === true
        if (!cancelled) {
          setVoteStatus(data)
          markVotedIn(selectedId, alreadyVoted)
        }
      } catch {
        // Status unknown — the cached flag below decides what renders.
      }

      if (!cancelled && !alreadyVoted && election?.status === 'ongoing') {
        await loadBallotFor(selectedId)
      }
      if (!cancelled) setChecking(false)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const total = ballot.length
  const current = total ? ballot[Math.min(index, total - 1)] : null
  const currentId = current ? String(current._id) : null
  const options = useMemo(
    () => (current ? candidatesFor(current, candidates) : []),
    [current, candidates]
  )
  const pickedCount = Object.keys(picks).length
  const isLast = index >= total - 1

  /** Name shown next to a position in the rail and the summary. */
  const chosenName = (position) => {
    const id = picks[String(position._id)]
    if (!id) return null
    const found = candidatesFor(position, candidates).find((c) => String(c._id) === id)
    return found?.name || 'Selected'
  }

  function choose(candidateId) {
    setPicks((prev) => {
      const next = { ...prev }
      // Clicking the same person again clears it back to an abstain.
      if (next[currentId] === candidateId) delete next[currentId]
      else next[currentId] = candidateId
      return next
    })
  }

  function abstain() {
    setPicks((prev) => {
      const next = { ...prev }
      delete next[currentId]
      return next
    })
  }

  function buildSubmission() {
    return ballot.map((pos) => {
      const id = String(pos._id)
      return picks[id]
        ? { position_id: id, candidate_id: picks[id] }
        : { position_id: id, is_abstain: true }
    })
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    try {
      await submitVote(election._id, buildSubmission())
      setReviewOpen(false)
      navigate('/student/confirmation', { replace: true })
    } catch (err) {
      setError(apiMessage(err, 'Vote submission failed.'))
      setReviewOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (checking || (loading && !ballot.length && !hasVoted)) {
    return (
      <div className="sp-center">
        <div className="sp-spinner" />
      </div>
    )
  }

  // Races other than this one that are still waiting on a ballot.
  const otherPending = pendingElections.filter(
    (e) => String(e._id) !== String(election?._id)
  )
  const nextBallotNudge = otherPending.length ? (
    <div className="sp-alert sp-alert-warn" style={{ marginBottom: 18 }}>
      <AlertCircle size={16} />
      <span>
        You still have {otherPending.length} ballot
        {otherPending.length === 1 ? '' : 's'} to cast:{' '}
        {otherPending.map((e, i) => (
          <span key={String(e._id)}>
            {i > 0 ? ', ' : ''}
            <button
              type="button"
              className="sp-linkish"
              onClick={() => selectElection(String(e._id))}
            >
              {e.title || 'SG Election'}
            </button>
          </span>
        ))}
      </span>
    </div>
  ) : null

  // ── Already voted → receipt ────────────────────────────────────────────────
  if (hasVoted) {
    return (
      <>
        {nextBallotNudge}
        <VoteReceipt voteStatus={voteStatus} />
      </>
    )
  }

  // ── Nothing open for this student ──────────────────────────────────────────
  if (!election || isClosed) {
    return (
      <>
        {nextBallotNudge}
        <EmptyState icon={Lock} title={isClosed ? 'Voting is closed' : 'No open election'}>
          {isClosed
            ? 'This election has ended. The final standings are on the Overview page.'
            : elections.length
              ? 'None of your elections are open for voting right now.'
              : student?.level
                ? `No election is open for ${labelForLevel(student.level)} yet. Check back when voting starts for your level.`
                : 'Ask your admin to set your year level so the right ballot reaches you.'}
        </EmptyState>
      </>
    )
  }

  if (!total) {
    return (
      <EmptyState icon={ClipboardList} title="Ballot not ready">
        The positions for this election have not been published yet.
      </EmptyState>
    )
  }

  const picked = ballot.filter((p) => picks[String(p._id)])
  const skipped = ballot.filter((p) => !picks[String(p._id)])

  return (
    <>
      <div className="sp-page-head sp-reveal">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sp-eyebrow">Ballot</div>
          <h1 className="sp-h1">Cast your ballot</h1>
          <p className="sp-lead">
            {election.title || 'SG Election'} · one choice per position. You may abstain
            on any position, and your ballot is recorded only once.
          </p>
        </div>
        <span className="sp-chip sp-chip-blue">
          {pickedCount}/{total} chosen
        </span>
      </div>

      {error ? (
        <div className="sp-alert sp-alert-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      ) : null}

      {nextBallotNudge}

      <div className="sp-ballot-layout sp-reveal-2">
        {/* ── Position rail ─────────────────────────────────────────────── */}
        <nav className="sp-panel sp-sticky">
          <header className="sp-panel-head" style={{ display: 'block' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 8,
                fontSize: 12,
                fontWeight: 700,
                color: '#56637d',
              }}
            >
              <span>Positions</span>
              <span>
                {index + 1} / {total}
              </span>
            </div>
            <div className="sp-progress">
              <div
                className="sp-progress-bar"
                style={{ width: `${((index + 1) / total) * 100}%` }}
              />
            </div>
          </header>

          <div className="sp-rail-steps">
            {ballot.map((pos, i) => {
              const name = chosenName(pos)
              const state = [
                i === index ? 'is-current' : '',
                name ? 'is-picked' : '',
              ]
                .filter(Boolean)
                .join(' ')
              return (
                <button
                  type="button"
                  key={pos._id}
                  className={`sp-rail-step ${state}`}
                  onClick={() => setIndex(i)}
                >
                  <span className="sp-rail-num">
                    {name ? <Check size={12} /> : i + 1}
                  </span>
                  <span className="sp-rail-text">
                    <span className="sp-rail-title">{pos.title}</span>
                    <span className="sp-rail-sub">{name || 'Abstain'}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </nav>

        {/* ── Current position ──────────────────────────────────────────── */}
        <section className="sp-panel sp-ballot-stage sp-stage-in" key={currentId}>
          <header className="sp-panel-head" style={{ display: 'block' }}>
            <span className="sp-chip sp-chip-blue sp-chip-caps sp-chip-pos">
              Position {index + 1} of {total}
            </span>
            <h2 className="sp-h1" style={{ fontSize: 26, margin: '12px 0 6px' }}>
              {current.title}
            </h2>
            <p className="sp-muted" style={{ fontSize: 14 }}>
              Choose one candidate, or abstain.
              {current.max_winners > 1
                ? ` The top ${current.max_winners} candidates win this seat.`
                : ''}
              {current.is_section_based ? ' This is a section representative race.' : ''}
            </p>
          </header>

          <div className="sp-panel-body sp-ballot-body">
            {options.length === 0 ? (
              <EmptyState icon={UserX} title="No candidates for this position">
                Nobody filed for this seat. You can abstain and move on.
              </EmptyState>
            ) : (
              <div className="sp-choices">
                {options.map((c) => {
                  const id = String(c._id)
                  const selected = picks[currentId] === id
                  return (
                    <button
                      type="button"
                      key={id}
                      className={`sp-choice ${selected ? 'is-selected' : ''}`}
                      onClick={() => choose(id)}
                      aria-pressed={selected}
                    >
                      <CandidateAvatar name={c.name} photo={c.photo_url} size={56} />
                      <span className="sp-choice-body">
                        <span className="sp-choice-name">{c.name}</span>
                        <span className="sp-choice-sub">
                          {c.partylist || 'Independent'}
                          {c.section ? ` · ${c.section}` : ''}
                        </span>
                      </span>
                      <span className="sp-radio">
                        {selected ? <Check size={12} /> : null}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            <button
              type="button"
              className={`sp-choice sp-choice-abstain ${
                !picks[currentId] ? 'is-selected' : ''
              }`}
              style={{ marginTop: 14 }}
              onClick={abstain}
              aria-pressed={!picks[currentId]}
            >
              <span
                className="sp-face"
                style={{ width: 56, height: 56, background: '#eef1f7', color: '#8c98b0' }}
              >
                <MinusCircle size={24} />
              </span>
              <span className="sp-choice-body">
                <span className="sp-choice-name">Abstain</span>
                <span className="sp-choice-sub">No vote counted for this position</span>
              </span>
              <span className="sp-radio">
                {!picks[currentId] ? <Check size={12} /> : null}
              </span>
            </button>
          </div>

          <footer
            className="sp-panel-foot"
            style={{ display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <button
              type="button"
              className="sp-btn sp-btn-ghost"
              onClick={() => setIndex((i) => i - 1)}
              disabled={index === 0}
            >
              <ArrowLeft size={15} /> Previous
            </button>
            <span className="sp-muted" style={{ fontSize: 12.5, marginLeft: 'auto' }}>
              {pickedCount} chosen · {total - pickedCount} abstain
            </span>
            <button
              type="button"
              className={`sp-btn ${isLast ? 'sp-btn-accent' : 'sp-btn-primary'}`}
              onClick={() => (isLast ? setReviewOpen(true) : setIndex((i) => i + 1))}
            >
              {isLast ? 'Review & submit' : 'Next position'}
              <ArrowRight size={15} />
            </button>
          </footer>
        </section>
      </div>

      <Modal
        open={reviewOpen}
        title="Review your ballot"
        subtitle={`${picked.length} chosen · ${skipped.length} abstained`}
        onClose={() => (submitting ? null : setReviewOpen(false))}
        footer={
          <>
            <button
              type="button"
              className="sp-btn sp-btn-ghost"
              onClick={() => setReviewOpen(false)}
              disabled={submitting}
            >
              Go back
            </button>
            <button
              type="button"
              className="sp-btn sp-btn-accent"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? <span className="sp-spinner sp-spinner-sm" /> : null}
              Submit ballot
            </button>
          </>
        }
      >
        {picked.length === 0 ? (
          <p className="sp-muted">
            You have abstained on every position. You can still submit, but no vote will
            be counted for anyone.
          </p>
        ) : (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead>
                <tr>
                  <th>Position</th>
                  <th>Your choice</th>
                </tr>
              </thead>
              <tbody>
                {picked.map((pos) => {
                  const id = String(pos._id)
                  const cand = candidatesFor(pos, candidates).find(
                    (c) => String(c._id) === picks[id]
                  )
                  return (
                    <tr key={id}>
                      <td style={{ color: '#56637d' }}>{pos.title}</td>
                      <td>
                        <div className="sp-cell-person">
                          <CandidateAvatar
                            name={cand?.name}
                            photo={cand?.photo_url}
                            size={28}
                            round
                          />
                          <div style={{ minWidth: 0 }}>
                            <div className="sp-cell-name">{cand?.name || 'Unknown'}</div>
                            <div className="sp-cell-sub">
                              {cand?.partylist || 'Independent'}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {skipped.length ? (
          <>
            <p
              className="sp-muted"
              style={{ fontWeight: 700, fontSize: 12, marginTop: 20, marginBottom: 8 }}
            >
              ABSTAINING ON {skipped.length} POSITION{skipped.length === 1 ? '' : 'S'}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {skipped.map((pos) => (
                <span key={pos._id} className="sp-chip sp-chip-flat sp-chip-wrap">
                  {pos.title}
                </span>
              ))}
            </div>
          </>
        ) : null}

        <div className="sp-alert sp-alert-warn" style={{ marginTop: 22, marginBottom: 0 }}>
          <ShieldCheck size={16} />
          <span>Your ballot is recorded once and cannot be changed after you submit.</span>
        </div>
      </Modal>
    </>
  )
}
