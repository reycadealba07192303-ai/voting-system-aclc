import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Eye,
  EyeOff,
  IdCard,
  Lock,
  ShieldCheck,
} from 'lucide-react'
import { ACLC_LOGO } from '../../constants/branding'
import { apiMessage } from '../api/client'
import { useStudentAuth } from '../context/StudentAuthContext'
import { firstNameOf } from '../utils/name'

/**
 * Same three-beat procedure the students already know:
 *   1. type your Student ID
 *   2. no password yet  → create one
 *      already has one  → sign in
 *   3. land on Home
 */
const STEP = { ID: 'id', SIGN_IN: 'sign-in', CREATE: 'create' }

export default function StudentLogin() {
  const navigate = useNavigate()
  const { lookup, login, createPassword } = useStudentAuth()

  const [step, setStep] = useState(STEP.ID)
  const [studentId, setStudentId] = useState('')
  const [studentName, setStudentName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const firstName = studentName ? firstNameOf(studentName, '') : ''

  const resetToId = () => {
    setStep(STEP.ID)
    setPassword('')
    setConfirm('')
    setStudentName('')
    setError('')
  }

  async function handleLookup(e) {
    e.preventDefault()
    const id = studentId.trim()
    if (!id) return setError('Student ID is required.')

    setBusy(true)
    setError('')
    try {
      const data = await lookup(id)
      setStudentName(data?.student?.name || '')
      setStep(data?.has_password ? STEP.SIGN_IN : STEP.CREATE)
    } catch (err) {
      setError(apiMessage(err, 'Could not check that Student ID.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleSignIn(e) {
    e.preventDefault()
    if (!password) return setError('Password is required.')

    setBusy(true)
    setError('')
    try {
      await login(studentId.trim(), password)
      navigate('/student/home', { replace: true })
    } catch (err) {
      setError(apiMessage(err, 'Sign in failed.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirm) return setError('Passwords do not match.')

    setBusy(true)
    setError('')
    try {
      await createPassword(studentId.trim(), password)
      navigate('/student/home', { replace: true })
    } catch (err) {
      setError(apiMessage(err, 'Could not create your password.'))
    } finally {
      setBusy(false)
    }
  }

  const heading =
    step === STEP.SIGN_IN
      ? 'Welcome back'
      : step === STEP.CREATE
        ? 'Create your password'
        : 'Get started'

  const blurb =
    step === STEP.SIGN_IN
      ? 'You already have an account. Enter your password to sign in.'
      : step === STEP.CREATE
        ? firstName
          ? `Hi ${firstName}! Set a password to secure your voting account.`
          : 'Set a password to secure your voting account.'
        : 'Enter your Student ID to continue.'

  return (
    <div className="sp sp-auth">
      <aside className="sp-auth-side">
        <div className="sp-auth-logo" style={{ cursor: 'pointer' }}>
          <Link to="/">
            <img src={ACLC_LOGO} alt="ACLC College of Manila" />
          </Link>
        </div>
        <h1 className="sp-auth-heading">
          ACLC COLLEGE
          <br />
          OF MANILA
        </h1>
        <p className="sp-auth-tagline">Your voice. Your vote. Your school.</p>

        <ol className="sp-auth-steps">
          <li>
            <b>1</b>
            <span>Sign in with the Student ID your admin registered.</span>
          </li>
          <li>
            <b>2</b>
            <span>Review the candidates, then cast one ballot per position.</span>
          </li>
          <li>
            <b>3</b>
            <span>Your vote is recorded once — then watch the live tally.</span>
          </li>
        </ol>
      </aside>

      <div className="sp-auth-panel">
        <div className="sp-auth-form">
          <div className="sp-auth-mark" style={{ cursor: 'pointer' }}>
            <Link to="/">
              <img src={ACLC_LOGO} alt="" />
            </Link>
            <div>
              <div className="sp-brand-sub">Student Portal</div>
              <div className="sp-brand-name">ACLC College of Manila</div>
            </div>
          </div>

          <div className="sp-auth-card">
            <span className="sp-chip sp-chip-blue">SSG Elections</span>
            <h2 className="sp-h1" style={{ fontSize: 22, marginTop: 12 }}>
              {heading}
            </h2>
            <p className="sp-muted" style={{ marginBottom: 22 }}>
              {blurb}
            </p>

            {error ? (
              <div className="sp-alert sp-alert-error">
                <AlertCircle size={17} />
                <span>{error}</span>
              </div>
            ) : null}

            {step === STEP.ID ? (
            <form onSubmit={handleLookup}>
              <label className="sp-field">
                <span className="sp-label">Student ID</span>
                <span className="sp-input-wrap">
                  <span className="sp-input-icon">
                    <IdCard size={17} />
                  </span>
                  <input
                    className="sp-input sp-input-has-icon"
                    placeholder="e.g. 2024-001"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    autoFocus
                    autoComplete="username"
                  />
                </span>
              </label>

              <button className="sp-btn sp-btn-primary sp-btn-block" disabled={busy}>
                {busy ? <span className="sp-spinner sp-spinner-sm" /> : null}
                Continue
                {busy ? null : <ArrowRight size={17} />}
              </button>
            </form>
          ) : null}

          {step === STEP.SIGN_IN ? (
            <form onSubmit={handleSignIn}>
              <div className="sp-alert sp-alert-info">
                <BadgeCheck size={17} />
                <span>
                  <b>{studentName || studentId}</b>
                  <br />
                  Existing account found — sign in with your password.
                </span>
              </div>

              <label className="sp-field">
                <span className="sp-label">Password</span>
                <span className="sp-input-wrap">
                  <span className="sp-input-icon">
                    <Lock size={17} />
                  </span>
                  <input
                    className="sp-input sp-input-has-icon sp-input-has-action"
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="sp-input-action"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </label>

              <button className="sp-btn sp-btn-primary sp-btn-block" disabled={busy}>
                {busy ? <span className="sp-spinner sp-spinner-sm" /> : null}
                Sign in
              </button>

              <button
                type="button"
                className="sp-btn sp-btn-ghost sp-btn-block"
                style={{ marginTop: 10, boxShadow: 'none' }}
                onClick={resetToId}
                disabled={busy}
              >
                <ArrowLeft size={16} /> Use a different Student ID
              </button>
            </form>
          ) : null}

          {step === STEP.CREATE ? (
            <form onSubmit={handleCreate}>
              <div className="sp-alert sp-alert-info">
                <ShieldCheck size={17} />
                <span>
                  Signing in as <b>{studentId}</b>
                  {studentName ? ` — ${studentName}` : ''}. This password is only used
                  for voting.
                </span>
              </div>

              <label className="sp-field">
                <span className="sp-label">New password</span>
                <span className="sp-input-wrap">
                  <span className="sp-input-icon">
                    <Lock size={17} />
                  </span>
                  <input
                    className="sp-input sp-input-has-icon sp-input-has-action"
                    type={showPass ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="sp-input-action"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </label>

              <label className="sp-field">
                <span className="sp-label">Confirm password</span>
                <span className="sp-input-wrap">
                  <span className="sp-input-icon">
                    <Lock size={17} />
                  </span>
                  <input
                    className="sp-input sp-input-has-icon sp-input-has-action"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Repeat your new password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="sp-input-action"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </label>

              <button className="sp-btn sp-btn-primary sp-btn-block" disabled={busy}>
                {busy ? <span className="sp-spinner sp-spinner-sm" /> : null}
                Save &amp; continue
              </button>

              <button
                type="button"
                className="sp-btn sp-btn-ghost sp-btn-block"
                style={{ marginTop: 10, boxShadow: 'none' }}
                onClick={resetToId}
                disabled={busy}
              >
                <ArrowLeft size={16} /> Back
              </button>
            </form>
          ) : null}

          <p
            className="sp-muted"
            style={{ textAlign: 'center', marginTop: 20, fontSize: 12 }}
          >
            Not registered yet? Ask your SSG admin to add your student record first.
          </p>
          </div>
        </div>
      </div>
    </div>
  )
}
