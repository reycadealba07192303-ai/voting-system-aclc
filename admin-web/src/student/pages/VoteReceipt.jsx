import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  CheckCircle2,
  MinusCircle,
  Receipt,
  ShieldCheck,
} from 'lucide-react'
import CandidateAvatar from '../components/CandidateAvatar'
import EmptyState from '../components/EmptyState'
import Standings from '../components/Standings'
import { useElection } from '../context/ElectionContext'

/** Flatten the populated vote docs into rows the receipt can render. */
function rowsFrom(voteStatus) {
  const votes = voteStatus?.votes || []
  return votes.map((v) => {
    const pos = v.position_id
    const cand = v.candidate_id
    const isAbstain = v.is_abstain === true
    return {
      id: v._id,
      position: pos && typeof pos === 'object' ? pos.title || '—' : '—',
      candidate: isAbstain ? 'Abstain' : cand?.name || '—',
      partylist: isAbstain ? null : cand?.partylist || null,
      photo: isAbstain ? null : cand?.photo_url || null,
      candidateId: isAbstain ? null : cand?._id ? String(cand._id) : null,
      isAbstain,
      timestamp: v.timestamp,
    }
  })
}

function formatStamp(value) {
  if (!value) return null
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Full-page receipt — replaces the modal when "View receipt" is clicked. */
function ReceiptView({ election, rows, stamped }) {
  const chosen = rows.filter((r) => !r.isAbstain).length

  return (
    <>
      <div className="sp-page-head sp-reveal">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sp-eyebrow">Official receipt</div>
          <h1 className="sp-h1">Your ballot</h1>
          <p className="sp-lead">
            A record of every choice you submitted. This cannot be changed.
          </p>
        </div>
      </div>

      <section className="sp-receipt sp-reveal-2">
        <header className="sp-receipt-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
            <span className="sp-receipt-mark">
              <Receipt size={22} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="sp-receipt-kicker">SSG Elections · Ballot receipt</div>
              <h2 className="sp-receipt-title">{election?.title || 'SSG Election'}</h2>
            </div>
          </div>
          <span className="sp-chip sp-chip-ok">
            <CheckCircle2 size={12} /> Recorded
          </span>
        </header>

        <div className="sp-receipt-meta">
          <div>
            <span className="sp-receipt-meta-label">Submitted</span>
            <strong>{formatStamp(stamped) || '—'}</strong>
          </div>
          <div>
            <span className="sp-receipt-meta-label">Chosen</span>
            <strong>
              {chosen} of {rows.length || '—'}
            </strong>
          </div>
          <div>
            <span className="sp-receipt-meta-label">Abstained</span>
            <strong>{Math.max(0, rows.length - chosen)}</strong>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="sp-panel-body">
            <EmptyState icon={Receipt} title="No vote details found">
              Your ballot is marked as submitted, but the detailed choices could not be
              loaded. Try refreshing the page.
            </EmptyState>
          </div>
        ) : (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead>
                <tr>
                  <th style={{ width: 48 }}>#</th>
                  <th>Position</th>
                  <th>Your choice</th>
                  <th style={{ width: 110 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id || i}>
                    <td>
                      <span className="sp-rank">{i + 1}</span>
                    </td>
                    <td style={{ color: 'var(--sp-text-2)', fontWeight: 600 }}>
                      {r.position}
                    </td>
                    <td>
                      <div className="sp-cell-person">
                        {r.isAbstain ? (
                          <span
                            className="sp-face"
                            style={{
                              width: 36,
                              height: 36,
                              background: 'var(--sp-surface-2)',
                              color: 'var(--sp-muted)',
                            }}
                          >
                            <MinusCircle size={18} />
                          </span>
                        ) : (
                          <CandidateAvatar
                            name={r.candidate}
                            photo={r.photo}
                            size={36}
                            round
                          />
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div className="sp-cell-name">{r.candidate}</div>
                          {r.partylist ? (
                            <div className="sp-cell-sub">{r.partylist}</div>
                          ) : r.isAbstain ? (
                            <div className="sp-cell-sub">No vote counted</div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td>
                      {r.isAbstain ? (
                        <span className="sp-chip sp-chip-flat">Abstain</span>
                      ) : (
                        <span className="sp-chip sp-chip-ok">
                          <CheckCircle2 size={11} /> Cast
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="sp-receipt-foot">
          <ShieldCheck size={16} color="#0a8a63" />
          <span>
            This receipt is for your records. One ballot per student — sealed after
            submit.
          </span>
        </footer>
      </section>

      <div style={{ marginTop: 18 }} className="sp-reveal-3">
        <Link to="/student/home" className="sp-btn sp-btn-ghost">
          Back to overview
        </Link>
      </div>
    </>
  )
}

export default function VoteReceipt({ voteStatus: initialStatus }) {
  const { election, results, resultsLoading, isClosed, loadResultsFor, fetchVoteStatus } =
    useElection()
  const [searchParams, setSearchParams] = useSearchParams()

  const [fetchedStatus, setFetchedStatus] = useState(null)
  const [loadingStatus, setLoadingStatus] = useState(!initialStatus)
  const showReceipt = searchParams.get('view') === 'receipt'

  const voteStatus = fetchedStatus || initialStatus

  useEffect(() => {
    if (!election?._id) return
    loadResultsFor(election._id)

    let cancelled = false
    setLoadingStatus(true)
    fetchVoteStatus(election._id)
      .then(({ data }) => {
        if (!cancelled) setFetchedStatus(data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingStatus(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [election?._id])

  const rows = useMemo(() => rowsFrom(voteStatus), [voteStatus])
  const myCandidateIds = useMemo(
    () => new Set(rows.filter((r) => r.candidateId).map((r) => r.candidateId)),
    [rows]
  )
  const chosen = rows.filter((r) => !r.isAbstain).length
  const stamped = rows.find((r) => r.timestamp)?.timestamp

  if (showReceipt) {
    return <ReceiptView election={election} rows={rows} stamped={stamped} />
  }

  return (
    <>
      <div className="sp-page-head sp-reveal">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sp-eyebrow">Ballot</div>
          <h1 className="sp-h1">Your ballot</h1>
          <p className="sp-lead">
            Already submitted — review your receipt and watch the{' '}
            {isClosed ? 'final' : 'live'} standings.
          </p>
        </div>
      </div>

      <section className="sp-banner sp-reveal-2">
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="sp-chip sp-chip-live">
              <Receipt size={12} /> Receipt
            </span>
            <span className="sp-chip sp-chip-live">
              <CheckCircle2 size={12} /> Recorded
            </span>
          </div>
          <h2 className="sp-banner-title">{election?.title || 'SSG Election'}</h2>
          <p className="sp-banner-sub">
            {loadingStatus
              ? 'Loading your ballot…'
              : rows.length
                ? `${chosen} chosen · ${rows.length - chosen} abstained`
                : 'Your ballot is recorded.'}
            {stamped
              ? ` · ${new Date(stamped).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}`
              : ''}
          </p>
        </div>
        <button
          type="button"
          className="sp-btn sp-btn-lg sp-btn-onhero"
          onClick={() => setSearchParams({ view: 'receipt' })}
          disabled={loadingStatus}
        >
          View receipt
          <Receipt size={15} />
        </button>
      </section>

      <div className="sp-page-head sp-reveal-3" style={{ marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <h2 className="sp-h2">{isClosed ? 'Final tallies' : 'Live tallies'}</h2>
          <p className="sp-muted" style={{ marginTop: 4 }}>
            {isClosed
              ? 'The result after voting closed.'
              : 'Updates automatically while this tab is open.'}
          </p>
        </div>
      </div>

      <Standings
        results={results}
        loading={resultsLoading}
        isClosed={isClosed}
        myCandidateIds={myCandidateIds}
        emptyHint="No tallies yet — this page refreshes itself as ballots land."
      />
    </>
  )
}
