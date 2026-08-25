import { BarChart3, Check, Crown, Trophy } from 'lucide-react'
import CandidateAvatar from './CandidateAvatar'
import EmptyState from './EmptyState'

/** Alternating civic accents, same rule the Flutter app used for its bars. */
const BAR_FILLS = [
  'linear-gradient(90deg, #2333b4, #4c5ce8)',
  'linear-gradient(90deg, #ff4b3a, #ff8064)',
]

function PositionTable({ position, myCandidateIds, isClosed }) {
  const candidates = position.candidates || []
  const voters = position.total_voters || 0
  const winnerIds = new Set((position.winners || []).map((w) => String(w._id)))

  return (
    <section className="sp-panel" style={{ marginBottom: 16 }}>
      <header className="sp-panel-head">
        <h3 className="sp-h2" style={{ flex: 1, minWidth: 0 }}>
          {position.title}
        </h3>
        {position.max_winners > 1 ? (
          <span className="sp-chip sp-chip-flat">Top {position.max_winners} win</span>
        ) : null}
        {position.solo_unopposed ? (
          <span
            className={`sp-chip ${position.solo_majority_met ? 'sp-chip-ok' : 'sp-chip-flat'}`}
          >
            Unopposed · needs {position.solo_majority_required_pct}%
          </span>
        ) : null}
        <span className="sp-chip sp-chip-flat">{voters} voted</span>
      </header>

      {candidates.length === 0 ? (
        <div className="sp-panel-body">
          <p className="sp-muted">No candidates filed for this position.</p>
        </div>
      ) : (
        <div className="sp-table-wrap">
          <table className="sp-table">
            <thead>
              <tr>
                <th style={{ width: 54 }}>#</th>
                <th>Candidate</th>
                <th style={{ width: '32%' }}>Share of voters</th>
                <th className="sp-num" style={{ width: 90 }}>
                  Votes
                </th>
                <th className="sp-num" style={{ width: 70 }}>
                  %
                </th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c, i) => {
                // Share of everyone who cast a ballot — the same denominator the
                // unopposed-majority rule uses, so the bar and the rule agree.
                const pct = voters > 0 ? Math.round((c.votes / voters) * 100) : 0
                const isMine = myCandidateIds?.has(String(c._id))
                const isWinner = winnerIds.has(String(c._id))
                const isLeader = i === 0 && c.votes > 0

                return (
                  <tr key={c._id}>
                    <td>
                      <span className={`sp-rank ${isLeader ? 'sp-rank-1' : ''}`}>
                        {isLeader ? <Crown size={13} /> : i + 1}
                      </span>
                    </td>
                    <td>
                      <div className="sp-cell-person">
                        <CandidateAvatar
                          name={c.name}
                          photo={c.photo_url}
                          size={30}
                          round
                        />
                        <div style={{ minWidth: 0 }}>
                          <div className="sp-cell-name">{c.name}</div>
                          <div className="sp-cell-sub">
                            {c.partylist || 'Independent'}
                          </div>
                        </div>
                        {isMine ? (
                          <span className="sp-chip sp-chip-ok">
                            <Check size={11} /> Your pick
                          </span>
                        ) : null}
                        {isWinner && isClosed ? (
                          <span className="sp-chip sp-chip-red">
                            <Trophy size={11} /> Winner
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <div className="sp-bar">
                        <div
                          className="sp-bar-fill"
                          style={{
                            width: `${Math.max(pct, c.votes > 0 ? 2 : 0)}%`,
                            background: BAR_FILLS[i % BAR_FILLS.length],
                          }}
                        />
                      </div>
                    </td>
                    <td className="sp-num">{c.votes}</td>
                    <td className="sp-num" style={{ color: '#56637d' }}>
                      {pct}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {position.abstentions ? (
        <footer className="sp-panel-foot">
          <p className="sp-muted" style={{ fontSize: 12.5 }}>
            {position.abstentions} voter{position.abstentions === 1 ? '' : 's'} abstained
            on this position.
          </p>
        </footer>
      ) : null}
    </section>
  )
}

export default function Standings({
  results,
  loading,
  isClosed,
  myCandidateIds,
  emptyTitle = 'No tallies yet',
  emptyHint = 'Results appear here as ballots come in.',
}) {
  if (loading && (!results || results.length === 0)) {
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        {[0, 1].map((i) => (
          <div key={i} className="sp-skeleton" style={{ height: 210 }} />
        ))}
      </div>
    )
  }

  if (!results || results.length === 0) {
    return (
      <EmptyState icon={BarChart3} title={emptyTitle}>
        {emptyHint}
      </EmptyState>
    )
  }

  return (
    <div>
      {results.map((position) => (
        <PositionTable
          key={position._id}
          position={position}
          myCandidateIds={myCandidateIds}
          isClosed={isClosed}
        />
      ))}
    </div>
  )
}
