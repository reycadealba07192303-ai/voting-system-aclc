import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Activity,
  BarChart3,
  Check,
  ChevronLeft,
  ChevronRight,
  Fingerprint,
  ListChecks,
  Lock,
  MonitorSmartphone,
  Quote,
  Radio,
  ScanLine,
  ShieldCheck,
  Trophy,
  Vote,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { ACLC_LOGO, BRAND } from '../constants/branding'
import '../styles/landing.css'

function useReveal() {
  useEffect(() => {
    const nodes = document.querySelectorAll('.ld-reveal')
    if (!('IntersectionObserver' in window)) {
      nodes.forEach((n) => n.classList.add('is-in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in')
            io.unobserve(entry.target)
          }
        })
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 }
    )
    nodes.forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [])
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const NAV_LINKS = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'The team', href: '#team' },
]

const STEPS = [
  {
    id: '01',
    icon: MonitorSmartphone,
    title: 'Open',
    body: 'Tap Vote now. You’ll see the same student portal as the mobile app — splash, onboarding, then login.',
  },
  {
    id: '02',
    icon: Fingerprint,
    title: 'Verify',
    body: 'Sign in with your student ID. The system checks you against the official masterlist before a ballot loads.',
  },
  {
    id: '03',
    icon: Vote,
    title: 'Vote',
    body: 'Your ballot only shows the positions your year level can vote for. Review, confirm, submit — done in under a minute.',
  },
  {
    id: '04',
    icon: BarChart3,
    title: 'Watch',
    body: 'Results update live as ballots come in. Winners are declared the moment the polls close.',
  },
]

const FEATURES = [
  {
    icon: Lock,
    title: 'One student, one vote',
    body: 'Every ballot is bound to a verified student record. Duplicate submissions are rejected at the database level.',
  },
  {
    icon: ListChecks,
    title: 'Level-gated ballots',
    body: 'Elections target specific year levels, so students only ever see the races they are eligible for.',
  },
  {
    icon: Activity,
    title: 'Real-time tally',
    body: 'Turnout and per-position standings update while voting is still open.',
  },
  {
    icon: ShieldCheck,
    title: 'Full audit log',
    body: 'Every admin action — election created, candidate edited, results published — is timestamped and attributed.',
  },
  {
    icon: Trophy,
    title: 'Multi-winner support',
    body: 'Senator-style positions with several seats are tallied correctly, including ties flagged for review.',
  },
  {
    icon: Radio,
    title: 'Abstain, on the record',
    body: 'Students can abstain per position. Abstentions are counted and reported instead of silently dropped.',
  },
]

const SECURITY = [
  { label: 'Ballot integrity', value: 'Unique index per student + position' },
  { label: 'Transport', value: 'HTTPS only, JWT bearer tokens' },
  { label: 'Access control', value: 'Separate admin and student scopes' },
  { label: 'Accountability', value: 'Immutable audit trail' },
]

/*
 * The people behind the system.
 * Photos live in admin-web/public/team/.
 * A missing photo falls back to the member's initials, so nothing breaks.
 */
const TEAM = [
  {
    name: 'Reyca De Alba',
    role: 'Full Stack Developer',
    photo: '/team/reyca.png',
    message:
      'I wrote every layer of this — the ballot on the phone, the API that records it, the dashboard that counts it. What I kept coming back to is one moment: a student presses submit and walks away without ever wondering if their vote was counted. Earning that second of confidence is the whole product. The code is only how we got there.',
  },
  {
    name: 'Patrick Telodo',
    role: 'Network Administrator · Supervisor',
    photo: '/team/patrick.jpg',
    message:
      'My job was to ask the hard questions before the students had to. What happens if the network drops mid-ballot? Who can see what, and can they prove it? Every one of those questions came back answered in code — and that is why I can stand behind this system on election day.',
  },
  {
    name: 'Ms. Jan Ashley Lodor',
    role: 'Committee on Elections',
    photo: '/team/jan.jpg',
    message:
      'We used to spend the whole night after the polls counting by hand, hoping the tally matched. Now the count is finished the moment the last ballot closes — and every number traces back to a rule the committee set itself.',
  },
  {
    name: 'Mr. Charles Mercado',
    role: 'Committee on Elections',
    photo: '/team/charles.jpg',
    message:
      'An election only works if the side that lost still believes the result. That is what we were protecting here: the same ballot, the same rules, and the same audit trail for every single student.',
  },
]

const initialsOf = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

const BALLOT = [
  {
    position: 'President',
    candidates: [
      { name: 'A. Villanueva', party: 'ALYANSA', pct: 46 },
      { name: 'R. Dela Cruz', party: 'BAGONG SG', pct: 34 },
      { name: 'M. Santos', party: 'INDEPENDENT', pct: 20 },
    ],
    pick: 0,
  },
  {
    position: 'Vice President',
    candidates: [
      { name: 'J. Ramirez', party: 'BAGONG SG', pct: 41 },
      { name: 'K. Bautista', party: 'ALYANSA', pct: 38 },
      { name: 'L. Ocampo', party: 'INDEPENDENT', pct: 21 },
    ],
    pick: 1,
  },
  {
    position: 'Secretary',
    candidates: [
      { name: 'P. Mendoza', party: 'ALYANSA', pct: 52 },
      { name: 'D. Reyes', party: 'INDEPENDENT', pct: 29 },
      { name: 'C. Aguilar', party: 'BAGONG SG', pct: 19 },
    ],
    pick: 0,
  },
  {
    position: 'Treasurer',
    candidates: [
      { name: 'S. Navarro', party: 'BAGONG SG', pct: 44 },
      { name: 'T. Gutierrez', party: 'ALYANSA', pct: 33 },
      { name: 'E. Lim', party: 'INDEPENDENT', pct: 23 },
    ],
    pick: 2,
  },
  {
    position: 'Auditor',
    candidates: [
      { name: 'B. Salazar', party: 'ALYANSA', pct: 48 },
      { name: 'N. Cortez', party: 'BAGONG SG', pct: 31 },
      { name: 'G. Padilla', party: 'INDEPENDENT', pct: 21 },
    ],
    pick: 1,
  },
  {
    position: 'P.I.O.',
    candidates: [
      { name: 'F. Marquez', party: 'INDEPENDENT', pct: 43 },
      { name: 'H. Domingo', party: 'ALYANSA', pct: 36 },
      { name: 'V. Cabrera', party: 'BAGONG SG', pct: 21 },
    ],
    pick: 0,
  },
]

const CLOCK = ['9:41', '9:41', '9:42', '9:42', '9:43', '9:43']

function PhoneMockup() {
  const [step, setStep] = useState(0)
  const [picked, setPicked] = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [progress, setProgress] = useState(0)

  const round = BALLOT[step]
  const still = prefersReducedMotion()

  // Run the ballot on a loop: reveal the race, pick, confirm, next position.
  useEffect(() => {
    if (still) {
      setPicked(BALLOT[step].pick)
      setProgress(1)
      return undefined
    }
    setPicked(null)
    setConfirmed(false)
    setProgress(0)

    const pickAt = setTimeout(() => setPicked(BALLOT[step].pick), 1100)
    const confirmAt = setTimeout(() => setConfirmed(true), 3000)
    const nextAt = setTimeout(() => setStep((s) => (s + 1) % BALLOT.length), 4400)

    return () => {
      clearTimeout(pickAt)
      clearTimeout(confirmAt)
      clearTimeout(nextAt)
    }
  }, [step, still])

  // Tick the percentages up once a candidate is highlighted.
  useEffect(() => {
    if (picked === null || still) return undefined
    let raf = 0
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 900)
      setProgress(1 - Math.pow(1 - t, 3))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [picked, step, still])

  return (
    <div className={`ld-phone ${still ? '' : 'is-floating'}`}>
      <div className="ld-phone-screen">
        <div className="ld-phone-notch" />
        <div className="ld-phone-header px-4 pb-5 pt-2">
          <div className="flex items-center justify-between text-[10px] text-blue-100 mb-3">
            <span>{CLOCK[step]}</span>
            <span className="inline-flex items-center gap-1.5 font-semibold tracking-wide">
              <span className="ld-live-dot" />
              LIVE
            </span>
          </div>
          <div className="flex items-center gap-2">
            <img src={ACLC_LOGO} alt="" className="w-8 h-8 rounded-full bg-white p-[2px]" />
            <div>
              <p className="text-white text-xs font-extrabold leading-tight">SG VOTE</p>
              <p className="text-blue-100 text-[10px]">BSIT · 3RD YEAR</p>
            </div>
          </div>
          <div className="mt-3 rounded-xl bg-white/15 border border-white/20 px-3 py-2 overflow-hidden">
            <p className="text-[10px] font-bold tracking-wider text-blue-100">
              POSITION {step + 1} / {BALLOT.length}
            </p>
            <p key={round.position} className="ld-swap text-white text-sm font-extrabold">
              {round.position}
            </p>
            <div className="ld-steps mt-2">
              {BALLOT.map((b, i) => (
                <span key={b.position} className={i <= step ? 'is-done' : ''} />
              ))}
            </div>
          </div>
        </div>

        <div className="px-3 py-3 space-y-2 bg-[#f5f8fc]">
          {round.candidates.map((c, i) => {
            const active = picked === i
            const dim = picked !== null && !active
            return (
              <div
                key={`${step}-${c.name}`}
                className={`ld-cand ${active ? 'is-active' : ''} ${dim ? 'is-dim' : ''}`}
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-800 truncate">{c.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{c.party}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className="text-[11px] font-extrabold tabular-nums"
                      style={{ color: active ? '#2333b4' : '#94a3b8' }}
                    >
                      {Math.round(c.pct * progress)}%
                    </span>
                    <span className={`ld-tick ${active ? 'is-on' : ''}`}>
                      <Check size={10} strokeWidth={3.5} />
                    </span>
                  </div>
                </div>
                <div className="ld-bar mt-2">
                  <span style={{ width: `${c.pct * progress}%` }} />
                </div>
              </div>
            )
          })}

          <div className={`ld-confirm mt-1 ${confirmed ? 'is-pressed' : ''}`}>
            {confirmed ? (
              <span className="inline-flex items-center gap-1.5">
                <Check size={12} strokeWidth={3.5} />
                VOTE RECORDED
              </span>
            ) : (
              'CONFIRM VOTE'
            )}
          </div>
          <p className="text-center text-[9px] text-slate-400 font-semibold tracking-wide">
            ENCRYPTED · ONE SUBMISSION ONLY
          </p>
        </div>
      </div>
    </div>
  )
}

function TeamCarousel() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [broken, setBroken] = useState({})
  const touchX = useRef(null)

  const go = useCallback((delta) => {
    setIndex((i) => (i + delta + TEAM.length) % TEAM.length)
  }, [])

  useEffect(() => {
    if (paused || prefersReducedMotion()) return undefined
    const id = setTimeout(() => go(1), 6000)
    return () => clearTimeout(id)
  }, [paused, go, index])

  const member = TEAM[index]
  const showPhoto = Boolean(member.photo) && !broken[member.photo]

  return (
    <div
      className="ld-team"
      role="group"
      aria-roledescription="carousel"
      aria-label="The people behind the system"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX
      }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return
        const dx = e.changedTouches[0].clientX - touchX.current
        if (Math.abs(dx) > 48) go(dx < 0 ? 1 : -1)
        touchX.current = null
      }}
    >
      <button type="button" className="ld-arrow" onClick={() => go(-1)} aria-label="Previous person">
        <ChevronLeft size={20} />
      </button>

      <div className="ld-team-stage">
        <figure key={`photo-${index}`} className="ld-team-photo ld-fade-up">
          {showPhoto ? (
            <img
              src={member.photo}
              alt={member.name}
              onError={() => setBroken((b) => ({ ...b, [member.photo]: true }))}
            />
          ) : (
            <span className="ld-team-initials" aria-hidden="true">
              {initialsOf(member.name)}
            </span>
          )}
          <figcaption>
            <p className="text-white font-extrabold text-[15px] leading-tight">{member.name}</p>
            <p className="mt-1 text-blue-100 text-[10px] font-bold uppercase tracking-[0.12em]">{member.role}</p>
          </figcaption>
        </figure>

        <div key={`msg-${index}`} className="ld-card ld-team-msg ld-fade-up p-7">
          <Quote size={26} className="text-[#dbeafe]" />
          <p className="mt-3 text-[15px] font-medium leading-relaxed text-slate-700">{member.message}</p>
          <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
            {member.name} · {member.role}
          </p>
        </div>
      </div>

      <button type="button" className="ld-arrow" onClick={() => go(1)} aria-label="Next person">
        <ChevronRight size={20} />
      </button>

      <div className="ld-dots">
        {TEAM.map((m, i) => (
          <button
            key={m.name}
            type="button"
            className={i === index ? 'is-on' : ''}
            onClick={() => setIndex(i)}
            aria-label={`Show ${m.name}`}
            aria-current={i === index}
          />
        ))}
      </div>
    </div>
  )
}


export default function Landing() {
  const [scrolled, setScrolled] = useState(false)
  useReveal()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="ld min-h-screen">
      <header className={`ld-nav ${scrolled ? 'is-scrolled' : ''}`}>
        <nav className="max-w-6xl mx-auto px-5 h-[68px] flex items-center justify-between gap-6">
          <a href="#top" className="flex items-center gap-3 min-w-0">
            <img src={ACLC_LOGO} alt={BRAND.name} className="w-10 h-10 rounded-full bg-white p-0.5 shadow-sm" />
            <span className="min-w-0">
              <span className="block text-[13px] font-extrabold tracking-tight truncate">SG Elections</span>
              <span className="block text-[10px] font-semibold tracking-[0.14em] uppercase text-slate-500 truncate">
                {BRAND.name}
              </span>
            </span>
          </a>

          <div className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-[12px] font-bold uppercase tracking-wider text-slate-500 hover:text-[#1d248f]">
                {l.label}
              </a>
            ))}
          </div>
        </nav>
      </header>

      <section id="top" className="ld-hero">
        <div
          className="ld-orb ld-orb-drift"
          style={{ width: 360, height: 360, top: -80, right: -40, background: 'rgba(255,75,58,0.22)' }}
        />
        <div
          className="ld-orb ld-orb-drift-slow"
          style={{ width: 280, height: 280, bottom: -60, left: -40, background: 'rgba(147,197,253,0.22)' }}
        />

        <div className="relative max-w-6xl mx-auto px-5 pt-14 pb-20 md:pt-20 md:pb-24">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
            <div className="ld-reveal is-in">
              <span className="ld-chip">
                <span className="ld-chip-dot" />
                Student portal · Polls open
              </span>
              <h1 className="mt-6 text-white text-[clamp(2.2rem,6vw,4.2rem)] font-extrabold leading-[1.08] tracking-tight">
                Cast your vote
                <br />
                from any device.
              </h1>
              <p className="mt-5 max-w-xl text-blue-100 text-base leading-relaxed">
                The official Supreme Student Government election platform of{' '}
                <span className="text-white font-semibold">{BRAND.name}</span>. One site for
                everything — sign in with your student ID, then cast a verified ballot.
              </p>
              <p className="mt-3 text-blue-200/90 text-sm">Your voice. Your vote. Your school.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/student-login" className="ld-btn ld-btn-accent">
                  <Vote size={16} />
                  Vote now
                </Link>
                <a href="#how-it-works" className="ld-btn ld-btn-ghost">
                  <ScanLine size={16} />
                  How it works
                </a>
              </div>
              <dl className="mt-10 grid grid-cols-3 gap-4 max-w-md">
                {[
                  ['< 60s', 'to cast a ballot'],
                  ['6', 'positions on the ballot'],
                  ['100%', 'auditable actions'],
                ].map(([value, label]) => (
                  <div key={label}>
                    <dt className="text-white text-2xl font-extrabold">{value}</dt>
                    <dd className="mt-1 text-[11px] uppercase tracking-wider text-blue-200">{label}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="ld-reveal is-in flex justify-center lg:justify-end">
              <PhoneMockup />
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 md:py-24">
        <div className="max-w-6xl mx-auto px-5">
          <div className="ld-reveal max-w-2xl">
            <p className="ld-kicker">How it works</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight">Four steps. One vote.</h2>
            <p className="mt-4 text-slate-500">No queues in the gym. Open the portal, verify, and submit from your phone or laptop.</p>
          </div>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STEPS.map((step, i) => (
              <div key={step.id} className="ld-reveal ld-card p-6" style={{ transitionDelay: `${i * 70}ms` }}>
                <div className="flex items-start justify-between">
                  <span className="text-3xl font-extrabold text-blue-100">{step.id}</span>
                  <step.icon size={20} className="text-[#2333b4]" />
                </div>
                <h3 className="mt-4 font-extrabold text-lg">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="pb-20 md:pb-24">
        <div className="max-w-6xl mx-auto px-5">
          <div className="ld-reveal max-w-2xl">
            <p className="ld-kicker">Features</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight">Built for elections that hold up</h2>
            <p className="mt-4 text-slate-500">Every rule the SG needs, enforced by the system instead of by hand.</p>
          </div>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <div key={f.title} className="ld-reveal ld-card p-6" style={{ transitionDelay: `${i * 60}ms` }}>
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-[#dbeafe] text-[#1d248f]">
                  <f.icon size={20} />
                </div>
                <h3 className="mt-4 font-extrabold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{f.body}</p>
              </div>
            ))}
          </div>

          <div id="security" className="ld-reveal ld-card mt-4 p-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SECURITY.map((row) => (
              <div key={row.label}>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{row.label}</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{row.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="team" className="pb-20 md:pb-24">
        <div className="max-w-6xl mx-auto px-5">
          <div className="ld-reveal max-w-2xl">
            <p className="ld-kicker">The team</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight">The people behind the system</h2>
            <p className="mt-4 text-slate-500">
              This platform did not build itself. Meet the people who planned it, supervised it, and shipped it.
            </p>
          </div>
          <div className="ld-reveal mt-12">
            <TeamCarousel />
          </div>
        </div>
      </section>


      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={ACLC_LOGO} alt="" className="w-10 h-10 rounded-full" />
            <div>
              <p className="font-extrabold text-sm">{BRAND.name}</p>
              <p className="text-[11px] text-slate-500 font-semibold">Supreme Student Government · Elections</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">© {new Date().getFullYear()} {BRAND.name}</p>
        </div>
      </footer>
    </div>
  )
}
