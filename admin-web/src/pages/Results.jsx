import { useCallback, useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import toast from 'react-hot-toast'
import { Radio } from 'lucide-react'
import { getElections } from '../api/elections'
import { getResults, getSectionMonitoring } from '../api/results'
import useAutoSync from '../hooks/useAutoSync'
import PageHeader from '../components/ui/PageHeader'
import Badge from '../components/ui/Badge'
import ElectionSelect from '../components/ui/ElectionSelect'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b']
const SYNC_MS = 8000

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="px-3 py-2 rounded-xl text-xs" style={{ background: '#1e2433', border: '1px solid rgba(255,255,255,0.1)' }}>
        <p className="text-white font-semibold">{label}</p>
        <p style={{ color: '#a5b4fc' }}>{payload[0].value} votes</p>
      </div>
    )
  }
  return null
}

export default function Results() {
  const [elections, setElections] = useState([])
  const [selectedElection, setSelectedElection] = useState('')
  const [results, setResults] = useState([])
  const [monitoring, setMonitoring] = useState([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('results')

  useEffect(() => {
    getElections().then((r) => {
      setElections(r.data)
      if (r.data.length > 0) setSelectedElection(r.data[0]._id)
    })
  }, [])

  const refresh = useCallback(async (silent = false) => {
    if (!selectedElection) return
    if (!silent) setLoading(true)
    try {
      const rRes = await getResults(selectedElection)
      setResults(Array.isArray(rRes.data) ? rRes.data : [])
      try {
        const mRes = await getSectionMonitoring(selectedElection)
        setMonitoring(Array.isArray(mRes.data) ? mRes.data : [])
      } catch {
        setMonitoring([])
      }
    } catch {
      if (!silent) toast.error('Failed to load results')
      if (!silent) {
        setResults([])
        setMonitoring([])
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [selectedElection])

  useEffect(() => { refresh(false) }, [refresh])
  useAutoSync(() => refresh(true), SYNC_MS, { enabled: !!selectedElection })

  const currentElection = elections.find((e) => e._id === selectedElection)

  return (
    <div>
      <PageHeader
        title="Results"
        subtitle="Vote tallies, winners, and section monitoring"
        action={
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold"
            style={{
              background: 'rgba(34,211,238,0.1)',
              border: '1px solid rgba(34,211,238,0.25)',
              color: '#67e8f9',
            }}
          >
            <Radio size={12} className="animate-pulse" />
            Auto-sync
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <ElectionSelect
          elections={elections}
          value={selectedElection}
          onChange={setSelectedElection}
          placeholder="Select election…"
        />
        {currentElection && <Badge label={currentElection.status} variant={currentElection.status} />}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {[['results', 'Vote Tallies'], ['monitoring', 'Per-Section Monitoring']].map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-1.5 text-sm font-medium rounded-lg transition-all"
            style={tab === t
              ? { background: 'rgba(99,102,241,0.25)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }
              : { color: '#64748b', border: '1px solid transparent' }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {loading && results.length === 0 ? (
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          Loading…
        </div>
      ) : tab === 'results' ? (
        <div className="space-y-5">
          {results.length === 0 ? (
            <div className="rounded-2xl p-12 text-center" style={{ border: '1px dashed rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
              <p className="text-slate-500 text-sm">
                {currentElection?.status === 'draft'
                  ? 'No results yet. Open the election and add positions/candidates first.'
                  : currentElection?.status === 'closed'
                    ? 'No tallies found for this election. It may have closed with no votes, or positions were not set up.'
                    : 'No results yet. Votes will appear here once students start voting.'}
              </p>
            </div>
          ) : results.map((position) => (
            <div key={position._id} className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-white">{position.title}</h3>
                {currentElection && <Badge label={currentElection.status} variant={currentElection.status} />}
              </div>

              <ResponsiveContainer width="100%" height={Math.max(180, position.candidates?.length * 48)}>
                <BarChart data={position.candidates} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={150} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="votes" radius={[0, 6, 6, 0]}>
                    {position.candidates?.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Winners */}
              {position.winners?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {position.winners.map((w) => (
                    <span key={w._id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
                      style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}>
                      🏆 {w.name} — {w.votes} votes
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
          {monitoring.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-slate-500 text-sm">No monitoring data available.</p>
            </div>
          ) : (
            <table className="w-full table-dark">
              <thead>
                <tr>
                  <th>Section</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Voted</th>
                  <th className="text-right">Not Voted</th>
                  <th className="text-right">Turnout</th>
                </tr>
              </thead>
              <tbody>
                {monitoring.map((row) => (
                  <tr key={row.section}>
                    <td className="font-medium text-slate-200">{row.section}</td>
                    <td className="text-right text-slate-400">{row.total}</td>
                    <td className="text-right" style={{ color: '#34d399' }}>{row.voted}</td>
                    <td className="text-right" style={{ color: '#f87171' }}>{row.notVoted}</td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 rounded-full h-1.5" style={{ background: 'rgba(255,255,255,0.07)' }}>
                          <div className="h-full rounded-full" style={{ width: `${row.turnout}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />
                        </div>
                        <span className="text-xs text-indigo-400 font-medium w-8 text-right">{row.turnout}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
