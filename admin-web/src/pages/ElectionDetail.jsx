import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, PlayCircle, StopCircle, Trash2, Users, ListOrdered,
  BarChart3, Trophy, ExternalLink, Crown, Radio,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getElection, openElection, closeElection, deleteElection,
} from '../api/elections'
import { getPositions } from '../api/positions'
import { getCandidates } from '../api/candidates'
import { getResults } from '../api/results'
import useAutoSync from '../hooks/useAutoSync'
import Badge from '../components/ui/Badge'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { labelForLevel } from '../constants/levels'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'
const SYNC_MS = 8000

function photoSrc(url) {
  if (!url) return null
  if (url.startsWith('http')) return url
  return `${API_BASE}${url}`
}

export default function ElectionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [election, setElection] = useState(null)
  const [positions, setPositions] = useState([])
  const [candidates, setCandidates] = useState([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [elRes, posRes, candRes, resultsRes] = await Promise.all([
        getElection(id),
        getPositions(id),
        getCandidates(id),
        getResults(id).catch(() => ({ data: [] })),
      ])
      setElection(elRes.data)
      setPositions(posRes.data || [])
      setCandidates(candRes.data || [])
      setResults(resultsRes.data || [])
    } catch {
      if (!silent) {
        toast.error('Failed to load election')
        navigate('/elections')
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => { load(false) }, [load])
  useAutoSync(() => load(true), SYNC_MS, { enabled: !!id })

  const voteMap = useMemo(() => {
    const map = {}
    for (const pos of results) {
      for (const c of pos.candidates || []) {
        map[String(c._id)] = c.votes ?? 0
      }
    }
    return map
  }, [results])

  const rowsByPosition = useMemo(() => {
    return positions.map((pos) => {
      const list = candidates
        .filter((c) => {
          const pid = c.position_id
          if (pid && typeof pid === 'object') return String(pid._id) === String(pos._id)
          return String(pid) === String(pos._id)
        })
        .map((c) => ({
          ...c,
          votes: voteMap[String(c._id)] ?? 0,
        }))
        .sort((a, b) => b.votes - a.votes)

      const totalVotes = list.reduce((s, c) => s + c.votes, 0)
      const maxVotes = Math.max(0, ...list.map((c) => c.votes), 1)
      return { position: pos, candidates: list, totalVotes, maxVotes }
    })
  }, [positions, candidates, voteMap])

  const totalVotesCast = useMemo(
    () => rowsByPosition.reduce((s, r) => s + r.totalVotes, 0),
    [rowsByPosition]
  )

  const handleOpen = async () => {
    try {
      await openElection(id)
      toast.success('Election opened')
      load(true)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to open')
    }
  }

  const handleClose = async (password) => {
    await closeElection(id, password)
    toast.success('Election closed')
    load(true)
  }

  const handleDelete = async (password) => {
    await deleteElection(id, password)
    toast.success('Election deleted')
    navigate('/elections')
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-slate-500 text-sm py-20 justify-center">
        <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        Loading election…
      </div>
    )
  }

  if (!election) return null

  return (
    <div className="pb-12">
      <button
        onClick={() => navigate('/elections')}
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-300 mb-6 transition-colors"
      >
        <ArrowLeft size={13} /> Elections
      </button>

      <header className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge label={election.status} variant={election.status} />
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{
                  background: 'rgba(34,211,238,0.1)',
                  border: '1px solid rgba(34,211,238,0.25)',
                  color: '#67e8f9',
                }}
              >
                <Radio size={10} className="animate-pulse" /> Live
              </span>
              <span className="text-[11px] text-slate-500">
                {new Date(election.start_date).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
                {' – '}
                {new Date(election.end_date).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
              </span>
            </div>
            <h1 className="text-2xl sm:text-[1.75rem] font-semibold text-white tracking-tight">
              {election.title}
            </h1>
            {election.description && (
              <p className="text-sm text-slate-500 mt-1.5 max-w-xl leading-relaxed">
                {election.description}
              </p>
            )}
            {(election.audience_levels || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {election.audience_levels.map((lv) => (
                  <span
                    key={lv}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                    style={{
                      background: 'rgba(35,51,180,0.15)',
                      border: '1px solid rgba(35,51,180,0.28)',
                      color: '#93c5fd',
                    }}
                  >
                    {labelForLevel(lv)}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {election.status === 'draft' && (
              <button onClick={handleOpen} className="btn-primary" style={{ padding: '8px 14px' }}>
                <PlayCircle size={14} /> Open
              </button>
            )}
            {election.status === 'ongoing' && (
              <button
                onClick={() => setConfirmClose(true)}
                className="btn-ghost"
                style={{ padding: '8px 14px', color: '#f87171' }}
              >
                <StopCircle size={14} /> Close
              </button>
            )}
            <Link
              to="/candidates"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 transition-colors"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              Manage candidates <ExternalLink size={11} />
            </Link>
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Delete"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-5">
          {[
            { icon: ListOrdered, label: 'Positions', value: positions.length },
            { icon: Users, label: 'Candidates', value: candidates.length },
            { icon: BarChart3, label: 'Votes', value: totalVotesCast },
            {
              icon: Trophy,
              label: 'Positions filled',
              value: rowsByPosition.filter((r) => r.candidates.length > 0).length,
            },
          ].map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="inline-flex items-center gap-2.5 rounded-full pl-2.5 pr-3.5 py-1.5"
              style={{
                background: 'rgba(255,255,255,0.035)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(34,211,238,0.12)', color: '#67e8f9' }}
              >
                <Icon size={12} />
              </span>
              <span className="text-[11px] text-slate-500">{label}</span>
              <span className="text-sm font-semibold text-white tabular-nums">{value}</span>
            </div>
          ))}
        </div>
      </header>

      {/* All candidates per position */}
      <section>
        <div className="mb-5">
          <h2 className="text-white text-lg font-semibold tracking-tight">Candidates running</h2>
          <p className="text-xs text-slate-500 mt-0.5">All candidates per position with vote chart</p>
        </div>

        {positions.length === 0 ? (
          <EmptyState
            title="No positions yet"
            body="Add positions from the Elections page, then add candidates."
          />
        ) : candidates.length === 0 ? (
          <EmptyState
            title="No candidates yet"
            body="Add candidates to see tallies per position."
            action={
              <Link to="/candidates" className="text-cyan-400 text-xs font-semibold hover:underline">
                Go to Candidates →
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {rowsByPosition.map(({ position, candidates: list, totalVotes, maxVotes }) => (
              <div
                key={position._id}
                className="rounded-2xl overflow-hidden"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.02) 100%)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 8px 28px rgba(0,0,0,0.22)',
                }}
              >
                <div className="px-5 py-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: list.length ? '#22d3ee' : '#475569' }}
                    />
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-300 truncate">
                      {position.title}
                    </h3>
                  </div>
                  <span
                    className="shrink-0 text-[10px] font-medium px-2.5 py-1 rounded-full text-slate-400"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    {list.length} running · {totalVotes} vote{totalVotes === 1 ? '' : 's'}
                  </span>
                </div>

                {list.length === 0 ? (
                  <div
                    className="mx-4 mb-4 rounded-xl px-4 py-5 text-center"
                    style={{
                      background: 'rgba(0,0,0,0.2)',
                      border: '1px dashed rgba(255,255,255,0.06)',
                    }}
                  >
                    <p className="text-slate-600 text-xs">No candidates for this position</p>
                  </div>
                ) : (
                  <ul className="px-4 pb-4 space-y-2">
                    {list.map((c, i) => {
                      const img = photoSrc(c.photo_url)
                      const isLead = i === 0 && c.votes > 0
                      const fillPct = maxVotes > 0 ? (c.votes / maxVotes) * 100 : 0
                      const accent = isLead ? '#fbbf24' : '#93c5fd'
                      const trackBorder = isLead
                        ? 'rgba(251,191,36,0.4)'
                        : 'rgba(148,163,184,0.2)'
                      const fillBg = isLead
                        ? 'linear-gradient(90deg, #d97706 0%, #fbbf24 70%, #fde68a 100%)'
                        : 'linear-gradient(90deg, #2333b4 0%, #ff4b3a 100%)'

                      return (
                        <li
                          key={c._id}
                          className="flex items-center gap-3 sm:gap-4 rounded-xl px-3 py-2.5"
                          style={{
                            background: isLead
                              ? 'rgba(251,191,36,0.06)'
                              : 'rgba(0,0,0,0.18)',
                            border: isLead
                              ? '1px solid rgba(251,191,36,0.18)'
                              : '1px solid rgba(255,255,255,0.04)',
                          }}
                        >
                          <div className="flex items-center gap-2.5 w-[160px] sm:w-[210px] shrink-0 min-w-0">
                            <div className="relative shrink-0">
                              <div
                                className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center text-xs font-bold"
                                style={{
                                  background: 'rgba(34,211,238,0.12)',
                                  color: '#67e8f9',
                                  boxShadow: isLead
                                    ? '0 0 0 1.5px rgba(251,191,36,0.5)'
                                    : '0 0 0 1px rgba(255,255,255,0.08)',
                                }}
                              >
                                {img ? (
                                  <img src={img} alt={c.name} className="w-full h-full object-cover" />
                                ) : (
                                  (c.name || '?')[0]
                                )}
                              </div>
                              {isLead && (
                                <span
                                  className="absolute -top-1 -left-1 w-[18px] h-[18px] rounded-full flex items-center justify-center"
                                  style={{
                                    background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                    boxShadow: '0 2px 6px rgba(245,158,11,0.4)',
                                  }}
                                >
                                  <Crown size={9} className="text-slate-900" strokeWidth={2.5} />
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] text-white font-semibold truncate tracking-tight">
                                {isLead && (
                                  <span className="text-amber-400 mr-1 text-[10px] font-bold">#1</span>
                                )}
                                {c.name}
                              </p>
                              {c.partylist && (
                                <p className="text-[10px] text-slate-500 truncate uppercase tracking-wider mt-0.5">
                                  {c.partylist}
                                </p>
                              )}
                            </div>
                          </div>

                          <div
                            className="relative flex-1 h-10 rounded-full overflow-hidden flex items-center"
                            style={{
                              background: 'rgba(15,17,23,0.65)',
                              border: `1px solid ${trackBorder}`,
                            }}
                          >
                            <div
                              className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                              style={{
                                width: `${Math.max(fillPct, c.votes > 0 ? 10 : 0)}%`,
                                background: fillBg,
                                boxShadow: c.votes > 0
                                  ? `0 0 18px ${isLead ? 'rgba(251,191,36,0.35)' : 'rgba(35,51,180,0.3)'}`
                                  : 'none',
                              }}
                            />
                            <span
                              className="relative ml-auto mr-3.5 text-[15px] font-bold tabular-nums"
                              style={{ color: accent }}
                            >
                              {c.votes}
                            </span>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={handleClose}
        title="Close Election"
        message="Closing stops all further voting. Confirm with your admin password."
        confirmLabel="Close Election"
        danger
        requirePassword
      />

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete Election"
        message="This will permanently delete the election and all associated data. This cannot be undone."
        danger
        requirePassword
      />
    </div>
  )
}

function EmptyState({ title, body, action }) {
  return (
    <div
      className="rounded-2xl p-12 text-center"
      style={{
        border: '1px dashed rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.02)',
      }}
    >
      <BarChart3 size={32} className="mx-auto mb-3 text-slate-700" />
      <p className="text-slate-400 text-sm font-medium">{title}</p>
      <p className="text-slate-600 text-xs mt-1">{body}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
