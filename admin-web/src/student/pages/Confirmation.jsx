import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import { useElection } from '../context/ElectionContext'

function formatNow(date = new Date()) {
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function StudentConfirmation() {
  const navigate = useNavigate()
  const { election, pendingElections, selectElection } = useElection()

  // A student is usually on more than one ballot; send them straight to the next.
  const next = pendingElections.find(
    (e) => String(e._id) !== String(election?._id)
  )

  function goToNext() {
    selectElection(String(next._id))
    navigate('/student/vote')
  }

  return (
    <div style={{ maxWidth: 480, margin: '8px auto 0' }}>
      <div className="sp-success-mark">
        <Check size={32} strokeWidth={2.6} />
      </div>

      <h1 className="sp-h1">Vote submitted</h1>
      <p className="sp-lead" style={{ marginTop: 8 }}>
        Your ballot has been securely recorded. Thank you for taking part in the SG
        elections.
      </p>

      <section className="sp-panel" style={{ marginTop: 24 }}>
        <div className="sp-panel-body" style={{ paddingTop: 4, paddingBottom: 4 }}>
          <div className="sp-kv">
            <span>Status</span>
            <span style={{ color: 'var(--sp-success)' }}>Recorded</span>
          </div>
          <div className="sp-kv">
            <span>Date</span>
            <span>{formatNow()}</span>
          </div>
          <div className="sp-kv">
            <span>Election</span>
            <span>{election?.title || 'SG Election'}</span>
          </div>
        </div>
      </section>

      {next ? (
        <section className="sp-panel" style={{ marginTop: 16 }}>
          <div className="sp-panel-body" style={{ display: 'grid', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>
                One more ballot for you
              </div>
              <p className="sp-muted" style={{ marginTop: 4, fontSize: 13 }}>
                You are also eligible to vote in {next.title || 'another election'}.
              </p>
            </div>
            <button
              type="button"
              className="sp-btn sp-btn-accent sp-btn-block"
              onClick={goToNext}
            >
              Go to that ballot
              <ArrowRight size={15} />
            </button>
          </div>
        </section>
      ) : null}

      <div style={{ display: 'grid', gap: 10, marginTop: 22 }}>
        <Link to="/student/vote?view=receipt" className="sp-btn sp-btn-primary sp-btn-block">
          View my receipt
        </Link>
        <Link to="/student/home" className="sp-btn sp-btn-ghost sp-btn-block">
          Back to overview
        </Link>
      </div>
    </div>
  )
}
