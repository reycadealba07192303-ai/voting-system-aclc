import { useEffect, useState } from 'react'
import Modal from './Modal'
import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  danger,
  confirmLabel,
  requirePassword = false,
  passwordLabel = 'Confirm with your admin password',
}) {
  const actionLabel = confirmLabel || (danger ? 'Delete' : 'Confirm')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) {
      setPassword('')
      setError('')
      setBusy(false)
    }
  }, [open])

  const handleConfirm = async () => {
    if (requirePassword && !password.trim()) {
      setError('Password is required')
      return
    }
    setBusy(true)
    setError('')
    try {
      await Promise.resolve(onConfirm(requirePassword ? password : undefined))
      onClose()
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={null} size="sm" hideHeader>
      <div className="relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-1 -right-1 p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="flex gap-4 mb-5 pr-6">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: danger ? 'rgba(239,68,68,0.15)' : 'rgba(34,211,238,0.12)',
              border: `1px solid ${danger ? 'rgba(239,68,68,0.3)' : 'rgba(34,211,238,0.28)'}`,
            }}
          >
            <AlertTriangle size={18} style={{ color: danger ? '#f87171' : '#67e8f9' }} />
          </div>
          <div className="min-w-0 pt-0.5">
            <h3 className="text-white text-base font-semibold tracking-tight mb-1.5">
              {title}
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">{message}</p>
          </div>
        </div>

        {requirePassword && (
          <div className="mb-5">
            <label className="block text-xs text-slate-500 mb-1.5">{passwordLabel}</label>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirm()
              }}
              className="input-dark w-full"
              placeholder="••••••••"
              autoComplete="current-password"
            />
            {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
          </div>
        )}

        {!requirePassword && error && (
          <p className="text-xs text-red-400 mb-4">{error}</p>
        )}

        <div
          className="flex gap-3 -mx-6 -mb-6 px-6 py-4"
          style={{
            background: 'rgba(0,0,0,0.25)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 btn-ghost"
            style={{ padding: '10px 16px' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className={`flex-1 ${danger ? 'btn-danger' : 'btn-primary'}`}
            style={{ padding: '10px 16px' }}
          >
            {busy ? 'Working…' : actionLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
