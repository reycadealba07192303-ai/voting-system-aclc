import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/** Centred dialog used for ballot review, the receipt, and confirmations. */
export default function Modal({ open, title, subtitle, onClose, children, footer }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="sp sp-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div className="sp-modal">
        <div className="sp-modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 className="sp-h2" style={{ fontSize: 17 }}>
                {title}
              </h2>
              {subtitle ? (
                <p className="sp-muted" style={{ marginTop: 3, fontSize: 12.5 }}>
                  {subtitle}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className="sp-btn sp-btn-quiet sp-btn-icon"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={17} />
            </button>
          </div>
        </div>
        <div className="sp-modal-body">{children}</div>
        {footer ? <div className="sp-modal-foot">{footer}</div> : null}
      </div>
    </div>,
    document.body
  )
}
