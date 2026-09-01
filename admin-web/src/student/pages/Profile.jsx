import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  IdCard,
  Layers,
  Vote,
} from 'lucide-react'
import { labelForLevel } from '../../constants/levels'
import { useElection } from '../context/ElectionContext'
import { useStudentAuth } from '../context/StudentAuthContext'
import { initialsOf } from '../utils/name'

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="sp-kv">
      <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <Icon size={15} color="#2333b4" />
        {label}
      </span>
      <span>{value || '—'}</span>
    </div>
  )
}

export default function StudentProfile() {
  const { student } = useStudentAuth()
  const { elections, pendingElections, loadElections } = useElection()

  useEffect(() => {
    loadElections()
  }, [loadElections])

  const openElections = elections.filter((e) => e.status === 'ongoing')
  const nextBallot = pendingElections[0] || null
  // "Done" only once every race the student belongs to has a ballot in it.
  const hasVoted = openElections.length > 0 && pendingElections.length === 0

  return (
    <>
      <div className="sp-page-head sp-reveal">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sp-eyebrow">Account</div>
          <h1 className="sp-h1">My profile</h1>
          <p className="sp-lead">
            Your student record and voting status across every election you belong to.
          </p>
        </div>
      </div>

      <section className="sp-profile-hero sp-reveal-2">
        <div className="sp-profile-avatar" aria-hidden="true">
          {initialsOf(student?.name)}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2 className="sp-profile-name">{student?.name || 'Student'}</h2>
          <p className="sp-profile-meta">
            {student?.section || 'No section'} · {labelForLevel(student?.level)}
          </p>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="sp-chip sp-chip-live">
              {student?.student_id || 'No ID'}
            </span>
            <span className={`sp-chip ${hasVoted ? 'sp-chip-ok' : 'sp-chip-live'}`}>
              {hasVoted ? 'Ballot submitted' : 'Ballot pending'}
            </span>
          </div>
        </div>
      </section>

      <div className="sp-split sp-reveal-3">
        <section className="sp-panel">
          <header className="sp-panel-head">
            <h3 className="sp-h2" style={{ flex: 1 }}>
              Voting status
            </h3>
            <span className={`sp-chip ${hasVoted ? 'sp-chip-ok' : 'sp-chip-red'}`}>
              {hasVoted ? 'Submitted' : 'Not cast'}
            </span>
          </header>
          <div className="sp-panel-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span
                className="sp-face"
                style={{
                  width: 48,
                  height: 48,
                  background: hasVoted ? 'var(--sp-success-soft)' : 'var(--sp-red-soft)',
                  color: hasVoted ? 'var(--sp-success)' : '#c02718',
                }}
              >
                {hasVoted ? <CheckCircle2 size={22} /> : <Vote size={22} />}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {hasVoted
                    ? openElections.length > 1
                      ? `All ${openElections.length} ballots submitted`
                      : 'Vote submitted'
                    : pendingElections.length > 1
                      ? `${pendingElections.length} ballots still to cast`
                      : 'You have not voted yet'}
                </div>
                <p className="sp-muted" style={{ marginTop: 3, fontSize: 13 }}>
                  {hasVoted
                    ? 'Your ballots are securely recorded and cannot be changed.'
                    : nextBallot
                      ? `Open now: ${nextBallot.title}`
                      : 'Cast your ballot when voting opens.'}
                </p>
              </div>
            </div>

            <Link
              to={hasVoted ? '/student/vote?view=receipt' : '/student/vote'}
              className={`sp-btn ${hasVoted ? 'sp-btn-ghost' : 'sp-btn-accent'}`}
              style={{ marginTop: 18 }}
            >
              {hasVoted ? 'View my receipt' : 'Go vote now'}
              <ArrowRight size={15} />
            </Link>
          </div>
        </section>

        <aside className="sp-sticky">
          <section className="sp-panel">
            <header className="sp-panel-head">
              <h3 className="sp-h2">Account details</h3>
            </header>
            <div className="sp-panel-body" style={{ paddingTop: 4, paddingBottom: 4 }}>
              <InfoRow icon={IdCard} label="Student ID" value={student?.student_id} />
              <InfoRow icon={GraduationCap} label="Section" value={student?.section} />
              <InfoRow
                icon={Layers}
                label="Year level"
                value={labelForLevel(student?.level)}
              />
            </div>
          </section>
        </aside>
      </div>
    </>
  )
}
