import { useCallback, useEffect, useState } from 'react'
import { Search, ScrollText, Clock3, Radio } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAuditLogs } from '../api/auditLogs'
import useAutoSync from '../hooks/useAutoSync'
import PageHeader from '../components/ui/PageHeader'

const ACTION_MAP = {
  login:  { bg: 'rgba(99,102,241,0.18)',  color: '#c7d2fe', label: 'Login' },
  logout: { bg: 'rgba(148,163,184,0.14)', color: '#cbd5e1', label: 'Logout' },
  create: { bg: 'rgba(16,185,129,0.16)',  color: '#6ee7b7', label: 'Create' },
  update: { bg: 'rgba(245,158,11,0.16)',  color: '#fcd34d', label: 'Update' },
  delete: { bg: 'rgba(239,68,68,0.16)',   color: '#fca5a5', label: 'Delete' },
  open:   { bg: 'rgba(139,92,246,0.16)',  color: '#c4b5fd', label: 'Open' },
  close:  { bg: 'rgba(249,115,22,0.16)',  color: '#fdba74', label: 'Close' },
  import: { bg: 'rgba(6,182,212,0.16)',   color: '#67e8f9', label: 'Import' },
}

function actionMeta(action = '') {
  const key = Object.keys(ACTION_MAP).find((k) => action.toLowerCase().includes(k))
  if (!key) {
    return {
      bg: 'rgba(148,163,184,0.12)',
      color: '#94a3b8',
      label: action.replace(/_/g, ' '),
    }
  }
  return {
    ...ACTION_MAP[key],
    label: action.replace(/_/g, ' '),
  }
}

function formatStamp(iso) {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    time: d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    }),
  }
}

function adminInitials(emailOrName = '') {
  const base = String(emailOrName).split('@')[0] || '?'
  const parts = base.split(/[._\s-]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return base.slice(0, 2).toUpperCase()
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = useCallback((q = search, silent = false) => {
    if (!silent) setLoading(true)
    getAuditLogs(q ? { search: q } : {})
      .then((r) => setLogs(r.data))
      .catch(() => {
        if (!silent) toast.error('Failed to load audit logs')
      })
      .finally(() => {
        if (!silent) setLoading(false)
      })
  }, [search])

  useEffect(() => { load(search, false) }, [])
  useAutoSync(() => load(search, true), 12000)

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        subtitle="Track all admin actions in the system"
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="relative max-w-md w-full">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              load(e.target.value, false)
            }}
            placeholder="Search by action or description…"
            className="input-dark has-icon"
          />
        </div>
        {!loading && logs.length > 0 && (
          <p className="text-xs text-slate-500 shrink-0">
            Showing <span className="text-slate-300 font-semibold">{logs.length}</span> entries
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-slate-500 text-sm py-12 justify-center">
          <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          Loading logs…
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.018) 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          }}
        >
          {logs.length === 0 ? (
            <div className="py-20 text-center">
              <ScrollText size={36} className="mx-auto mb-3 text-slate-700" />
              <p className="text-slate-400 text-sm font-medium">No audit logs found</p>
              <p className="text-slate-600 text-xs mt-1">Try a different search, or wait for admin activity.</p>
            </div>
          ) : (
            <div style={{ maxHeight: 'calc(100vh - 230px)', overflowY: 'auto' }}>
              <table className="w-full border-collapse">
                <thead
                  className="sticky top-0 z-10"
                  style={{
                    background: 'rgba(15,17,23,0.96)',
                    backdropFilter: 'blur(10px)',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <tr>
                    {['Timestamp', 'Admin', 'Action', 'Description'].map((h) => (
                      <th
                        key={h}
                        className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, idx) => {
                    const meta = actionMeta(log.action)
                    const stamp = formatStamp(log.created_at)
                    const admin = log.user_id?.email || log.user_id?.name || '—'
                    const isLast = idx === logs.length - 1

                    return (
                      <tr
                        key={log._id}
                        className="group transition-colors"
                        style={{
                          borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.045)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        <td className="px-5 py-4 align-middle whitespace-nowrap">
                          <div className="flex items-start gap-2.5">
                            <span
                              className="mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                              style={{
                                background: 'rgba(34,211,238,0.08)',
                                color: '#67e8f9',
                              }}
                            >
                              <Clock3 size={13} />
                            </span>
                            <div>
                              <p className="text-[13px] text-slate-200 font-medium leading-tight">
                                {stamp.date}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                                {stamp.time}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 align-middle">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                              style={{
                                background: 'linear-gradient(135deg, rgba(99,102,241,0.45), rgba(34,211,238,0.25))',
                                color: '#e0e7ff',
                              }}
                            >
                              {adminInitials(admin)}
                            </span>
                            <span className="text-[13px] text-slate-300 truncate max-w-[180px]">
                              {admin}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4 align-middle">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize"
                            style={{ background: meta.bg, color: meta.color }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: meta.color }}
                            />
                            {meta.label}
                          </span>
                        </td>

                        <td className="px-5 py-4 align-middle">
                          <p className="text-[13px] text-slate-400 leading-snug max-w-xl">
                            {log.description || '—'}
                          </p>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
