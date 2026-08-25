import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  ChevronRight,
  Globe2,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
  UserRound,
  Vote,
  X,
} from 'lucide-react'
import { ACLC_LOGO, BRAND } from '../../constants/branding'
import { labelForLevel } from '../../constants/levels'
import { useElection } from '../context/ElectionContext'
import { useStudentAuth } from '../context/StudentAuthContext'
import { initialsOf } from '../utils/name'

const NAV = [
  {
    label: 'Election',
    items: [
      { to: '/student/home', label: 'Overview', icon: LayoutDashboard },
      { to: '/student/campus', label: 'All levels', icon: Globe2 },
      { to: '/student/candidates', label: 'Candidates', icon: Users },
      { to: '/student/vote', label: 'Ballot', icon: Vote },
    ],
  },
  {
    label: 'Account',
    items: [{ to: '/student/profile', label: 'My profile', icon: UserRound }],
  },
]

/** Page title for the topbar breadcrumb, keyed by the deepest matching route. */
const TITLES = {
  '/student/home': 'Overview',
  '/student/campus': 'All levels',
  '/student/candidates': 'Candidates',
  '/student/vote': 'Ballot',
  '/student/confirmation': 'Ballot submitted',
  '/student/profile': 'My profile',
}

export default function StudentLayout() {
  const { student, hasVoted, logout } = useStudentAuth()
  const { election, isClosed } = useElection()
  const { pathname } = useLocation()
  const [drawer, setDrawer] = useState(false)

  // A drawer that survives navigation would cover the page the user just opened.
  useEffect(() => {
    setDrawer(false)
  }, [pathname])

  const isActive = (to) => pathname === to || pathname.startsWith(`${to}/`)
  const title =
    TITLES[pathname] ||
    (pathname.startsWith('/student/candidates/team/')
      ? 'Team'
      : pathname.startsWith('/student/candidates/')
        ? 'Candidate'
        : pathname.startsWith('/student/vote')
          ? 'Ballot'
          : 'Student portal')

  return (
    <div className={`sp sp-app ${drawer ? 'is-drawer-open' : ''}`}>
      <div className="sp-scrim" onClick={() => setDrawer(false)} />

      <aside className="sp-sidebar">
        <div className="sp-sidebar-brand">
          <img src={ACLC_LOGO} alt="" />
          <span style={{ minWidth: 0, flex: 1 }}>
            <span className="sp-brand-sub">Student Portal</span>
            <span className="sp-brand-name">{BRAND.name}</span>
          </span>
          <button
            type="button"
            className="sp-menu-btn"
            onClick={() => setDrawer(false)}
            aria-label="Close menu"
          >
            <X size={17} />
          </button>
        </div>

        <nav className="sp-nav">
          {NAV.map((group) => (
            <div key={group.label}>
              <p className="sp-nav-label">{group.label}</p>
              {group.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={`sp-nav-item ${isActive(to) ? 'is-active' : ''}`}
                >
                  <Icon size={17} strokeWidth={2} />
                  {label}
                  {to === '/student/vote' && election && !isClosed && !hasVoted ? (
                    <span className="sp-nav-badge">TO DO</span>
                  ) : null}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sp-sidebar-foot">
          <div className="sp-user-card">
            <span
              className="sp-face"
              style={{ width: 34, height: 34, fontSize: 12 }}
              aria-hidden="true"
            >
              {initialsOf(student?.name)}
            </span>
            <span style={{ minWidth: 0, flex: 1 }}>
              <span className="sp-user-name">{student?.name || 'Student'}</span>
              <span className="sp-user-sub">
                {student?.section || labelForLevel(student?.level)}
              </span>
            </span>
            <button
              type="button"
              className="sp-btn sp-btn-quiet sp-btn-icon"
              onClick={logout}
              title="Log out"
              aria-label="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="sp-content">
        <header className="sp-topbar">
          <button
            type="button"
            className="sp-menu-btn"
            onClick={() => setDrawer(true)}
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>

          <div className="sp-crumb">
            <span>Student portal</span>
            <ChevronRight size={13} />
            <b>{title}</b>
          </div>

          <div className="sp-topbar-actions">
            {election ? (
              <span className={`sp-chip ${isClosed ? 'sp-chip-flat' : 'sp-chip-ok'}`}>
                <i className={`sp-dot ${isClosed ? 'sp-dot-off' : ''}`} />
                {isClosed ? 'Voting closed' : 'Voting open'}
              </span>
            ) : (
              <span className="sp-chip sp-chip-flat">
                <i className="sp-dot sp-dot-off" />
                No active election
              </span>
            )}
          </div>
        </header>

        <main className="sp-page">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
