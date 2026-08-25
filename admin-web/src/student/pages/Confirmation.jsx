import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
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
  const { election } = useElection()

  return (
    <div style={{ maxWidth: 480, margin: '8px auto 0' }}>
      <div className="sp-success-mark">
        <Check size={32} strokeWidth={2.6} />
      </div>

      <h1 className="sp-h1">Vote submitted</h1>
      <p className="sp-lead" style={{ marginTop: 8 }}>
        Your ballot has been securely recorded. Thank you for taking part in the SSG
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
            <span>{election?.title || 'SSG Election'}</span>
          </div>
        </div>
      </section>

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
