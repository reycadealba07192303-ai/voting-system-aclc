import { useCallback, useMemo, useState } from 'react'
import {
  Users, UserSquare2, Vote, BarChart3, TrendingUp, Clock, Trophy, Crown, Radio,
} from 'lucide-react'
import { getDashboardStats, getResults } from '../api/results'
import useAutoSync from '../hooks/useAutoSync'
import StatCard from '../components/ui/StatCard'
import PageHeader from '../components/ui/PageHeader'
import Badge from '../components/ui/Badge'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'
const SYNC_MS = 8000

function photoSrc(url) {
  if (!url) return null
  if (url.startsWith('http')) return url
  return `${API_BASE}${url}`
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [resultsLoading, setResultsLoading] = useState(false)
  const [lastSynced, setLastSynced] = useState(null)

  const refresh = useCallback(async (silent = true) => {
    if (!silent) {
      setLoading(true)
      setResultsLoading(true)
    }
    try {
      const res = await getDashboardStats()
      setStats(res.data)
      const electionId = res.data?.activeElection?._id
      if (electionId) {
        try {
          const r = await getResults(electionId)
          setResults(r.data || [])
        } catch {
          setResults([])
        }
      } else {
        setResults([])
      }
      setLastSynced(new Date())
    } catch {
      // keep previous data on soft sync failure
    } finally {
      setLoading(false)
      setResultsLoading(false)
    }
  }, [])

  useAutoSync(() => refresh(true), SYNC_MS, { enabled: true, runOnMount: true })

  const topRunners = useMemo(() => {
    return results
      .map((pos) => {
        const list = [...(pos.candidates || [])].sort((a, b) => (b.votes || 0) - (a.votes || 0))
        const top = list[0]
        if (!top) return null
        const totalVotes = list.reduce((s, c) => s + (c.votes || 0), 0)
        const maxVotes = Math.max(...list.map((c) => c.votes || 0), 1)
        return {
          positionId: pos._id,
          position: pos.title,
          ...top,
          fieldSize: list.length,
          totalVotes,
          share: totalVotes > 0 ? Math.round((top.votes / totalVotes) * 100) : 0,
          barPct: maxVotes > 0 ? ((top.votes || 0) / maxVotes) * 100 : 0,
        }
      })
      .filter(Boolean)
  }, [results])

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Live election overview"
        action={
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold"
            style={{
              background: 'rgba(34,211,238,0.1)',
              border: '1px solid rgba(34,211,238,0.25)',
              color: '#67e8f9',
            }}
            title={lastSynced ? `Last synced ${lastSynced.toLocaleTimeString()}` : 'Syncing…'}
          >
            <Radio size={12} className="animate-pulse" />
            Auto-sync
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          Loading stats…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Students" value={stats?.totalStudents} icon={Users} color="blue" />
            <StatCard label="Candidates" value={stats?.totalCandidates} icon={UserSquare2} color="purple" />
            <StatCard label="Votes Cast" value={stats?.votesCast} icon={Vote} color="green" />
            <StatCard
              label="Voter Turnout"
              value={stats?.turnout != null ? `${stats.turnout}%` : null}
              icon={TrendingUp}
              color="yellow"
              sub="of eligible voters"
            />
          </div>

          {stats?.activeElection ? (
            <div
              className="rounded-2xl p-6 mb-8"
              style={{
                background: 'linear-gradient(135deg, rgba(34,211,238,0.08), rgba(99,102,241,0.08))',
                border: '1px solid rgba(34,211,238,0.18)',
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-cyan-400 uppercase tracking-widest font-semibold mb-1">
                    Active Election
                  </p>
                  <h3 className="text-xl font-bold text-white">{stats.activeElection.title}</h3>
                </div>
                <Badge label={stats.activeElection.status} variant={stats.activeElection.status} />
              </div>

              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Clock size={14} />
                <span>
                  {new Date(stats.activeElection.start_date).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                  {' — '}
                  {new Date(stats.activeElection.end_date).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </span>
              </div>

              {stats?.turnout != null && (
                <div className="mt-5">
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>Voter turnout</span>
                    <span className="text-cyan-400 font-semibold">{stats.turnout}%</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${stats.turnout}%`,
                        background: 'linear-gradient(90deg, #22d3ee, #6366f1)',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              className="rounded-2xl p-10 text-center mb-8"
              style={{ border: '1px dashed rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}
            >
              <BarChart3 size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
              <p className="text-slate-500 text-sm">No active election at the moment.</p>
              <p className="text-slate-600 text-xs mt-1">Create one from the Elections page.</p>
            </div>
          )}

          {stats?.activeElection && (
            <section>
              <div className="mb-5">
                <h2 className="text-white text-lg font-semibold tracking-tight">Overview</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Top runner for each position · updates automatically
                </p>
              </div>

              {resultsLoading && topRunners.length === 0 ? (
                <div className="flex items-center gap-3 text-slate-500 text-sm py-8">
                  <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  Loading standings…
                </div>
              ) : topRunners.length === 0 ? (
                <div
                  className="rounded-2xl p-10 text-center"
                  style={{ border: '1px dashed rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}
                >
                  <Trophy size={28} className="mx-auto mb-3 text-slate-700" />
                  <p className="text-slate-500 text-sm">No tallies yet. Votes will appear here live.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topRunners.map((lead) => {
                    const img = photoSrc(lead.photo_url)
                    const hasVotes = (lead.votes || 0) > 0

                    return (
                      <article
                        key={lead.positionId}
                        className="rounded-2xl p-4 sm:p-5"
                        style={{
                          background:
                            'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
                          border: '1px solid rgba(255,255,255,0.07)',
                        }}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-300/90">
                            {lead.position}
                          </p>
                          <p className="text-[10px] text-slate-600">
                            {lead.fieldSize} in race · {lead.totalVotes} vote
                            {lead.totalVotes === 1 ? '' : 's'}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 sm:gap-5">
                          <div className="relative shrink-0">
                            <div
                              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden flex items-center justify-center text-lg font-bold"
                              style={{
                                background: 'rgba(34,211,238,0.1)',
                                color: '#67e8f9',
                                boxShadow: hasVotes
                                  ? '0 0 0 1.5px rgba(251,191,36,0.55), 0 8px 24px rgba(0,0,0,0.35)'
                                  : '0 0 0 1px rgba(255,255,255,0.08)',
                              }}
                            >
                              {img ? (
                                <img src={img} alt={lead.name} className="w-full h-full object-cover" />
                              ) : (
                                (lead.name || '?')[0]
                              )}
                            </div>
                            {hasVotes && (
                              <span
                                className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full flex items-center justify-center"
                                style={{
                                  background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                  boxShadow: '0 2px 8px rgba(245,158,11,0.45)',
                                }}
                              >
                                <Crown size={11} className="text-slate-900" strokeWidth={2.5} />
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3 mb-2.5">
                              <div className="min-w-0">
                                <p className="text-white font-semibold text-[15px] sm:text-base truncate tracking-tight">
                                  {lead.name}
                                </p>
                                {lead.partylist && (
                                  <p className="text-[11px] text-slate-500 mt-0.5 uppercase tracking-wider">
                                    {lead.partylist}
                                  </p>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <p
                                  className="text-xl sm:text-2xl font-bold tabular-nums leading-none"
                                  style={{ color: hasVotes ? '#fbbf24' : '#94a3b8' }}
                                >
                                  {lead.votes}
                                </p>
                                <p className="text-[10px] text-slate-600 mt-1">
                                  {hasVotes ? `${lead.share}% of race` : 'no votes yet'}
                                </p>
                              </div>
                            </div>

                            <div
                              className="relative h-2.5 rounded-full overflow-hidden"
                              style={{ background: 'rgba(255,255,255,0.06)' }}
                            >
                              <div
                                className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                                style={{
                                  width: `${hasVotes ? Math.max(lead.barPct, 8) : 0}%`,
                                  background: hasVotes
                                    ? 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 55%, #fde68a 100%)'
                                    : 'transparent',
                                  boxShadow: hasVotes ? '0 0 16px rgba(251,191,36,0.35)' : 'none',
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  )
}
