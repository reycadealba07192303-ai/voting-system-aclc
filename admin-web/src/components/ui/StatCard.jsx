const gradients = {
  blue:   { bg: 'rgba(99,102,241,0.12)',  icon: 'rgba(99,102,241,0.25)',  text: '#818cf8', glow: 'rgba(99,102,241,0.3)'   },
  green:  { bg: 'rgba(16,185,129,0.10)',  icon: 'rgba(16,185,129,0.22)',  text: '#34d399', glow: 'rgba(16,185,129,0.25)'  },
  yellow: { bg: 'rgba(245,158,11,0.10)',  icon: 'rgba(245,158,11,0.22)',  text: '#fbbf24', glow: 'rgba(245,158,11,0.25)'  },
  red:    { bg: 'rgba(239,68,68,0.10)',   icon: 'rgba(239,68,68,0.22)',   text: '#f87171', glow: 'rgba(239,68,68,0.25)'   },
  purple: { bg: 'rgba(139,92,246,0.12)',  icon: 'rgba(139,92,246,0.25)',  text: '#a78bfa', glow: 'rgba(139,92,246,0.3)'   },
}

export default function StatCard({ label, value, icon: Icon, color = 'blue', sub }) {
  const c = gradients[color] || gradients.blue

  return (
    <div
      className="rounded-2xl p-5 flex items-center gap-4 transition-all duration-200 hover:scale-[1.02]"
      style={{
        background: c.bg,
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: `0 4px 24px ${c.glow}`,
      }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: c.icon }}
      >
        <Icon size={22} style={{ color: c.text }} />
      </div>
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{label}</p>
        <p className="text-3xl font-bold text-white mt-0.5">{value ?? '—'}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
