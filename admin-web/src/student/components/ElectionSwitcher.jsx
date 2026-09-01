import { Check, Vote } from 'lucide-react'
import { useElection } from '../context/ElectionContext'

/**
 * Students usually sit in more than one audience at once — the campus-wide race
 * plus their own program's representative race. This strip shows every race
 * open to them and switches the whole portal between them.
 */
export default function ElectionSwitcher() {
  const { elections, election, selectElection } = useElection()

  if (elections.length < 2) return null

  return (
    <nav className="sp-elx" aria-label="Your elections">
      <span className="sp-elx-label">Your elections</span>
      <div className="sp-elx-tabs">
        {elections.map((e) => {
          const id = String(e._id)
          const active = String(election?._id) === id
          const closed = e.status !== 'ongoing'
          return (
            <button
              type="button"
              key={id}
              className={`sp-elx-tab ${active ? 'is-active' : ''}`}
              onClick={() => selectElection(id)}
              aria-current={active ? 'true' : undefined}
            >
              <i className={`sp-dot ${closed ? 'sp-dot-off' : ''}`} />
              <span className="sp-elx-name">{e.title || 'Election'}</span>
              {closed ? (
                <span className="sp-elx-tag">Closed</span>
              ) : e.has_voted ? (
                <span className="sp-elx-tag is-ok">
                  <Check size={11} /> Voted
                </span>
              ) : (
                <span className="sp-elx-tag is-todo">
                  <Vote size={11} /> To do
                </span>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
