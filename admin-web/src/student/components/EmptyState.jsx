/**
 * One shape for every "nothing here yet" panel — a soft badge, a headline, and
 * one line of what to do about it.
 */
export default function EmptyState({ icon: Icon, title, children, action, className = '' }) {
  return (
    <div className={`sp-panel sp-empty ${className}`.trim()}>
      {Icon ? (
        <div className="sp-empty-icon">
          <Icon size={21} strokeWidth={1.9} />
        </div>
      ) : null}
      {title ? <div className="sp-empty-title">{title}</div> : null}
      {children ? <div className="sp-empty-body">{children}</div> : null}
      {action ? <div style={{ marginTop: 18 }}>{action}</div> : null}
    </div>
  )
}
