const variants = {
  draft:    { bg: 'rgba(100,116,139,0.15)', border: 'rgba(100,116,139,0.3)', text: '#94a3b8' },
  ongoing:  { bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.35)', text: '#34d399' },
  closed:   { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   text: '#f87171' },
  default:  { bg: 'rgba(35,51,180,0.15)',  border: 'rgba(35,51,180,0.35)', text: '#93c5fd' },
}

export default function Badge({ label, variant = 'default' }) {
  const v = variants[variant] || variants.default
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: v.bg, border: `1px solid ${v.border}`, color: v.text }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: v.text }}
      />
      {label}
    </span>
  )
}
