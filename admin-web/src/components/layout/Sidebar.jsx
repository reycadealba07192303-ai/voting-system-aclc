import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Vote,
  Users,
  UserSquare2,
  BarChart3,
  ScrollText,
  LogOut,
  KeyRound,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { changeAdminPassword } from '../../api/auth'
import Modal from '../ui/Modal'
import BrandLogo from '../BrandLogo'
import { BRAND } from '../../constants/branding'
import toast from 'react-hot-toast'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/elections', label: 'Elections', icon: Vote },
  { to: '/candidates', label: 'Candidates', icon: UserSquare2 },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/results', label: 'Results', icon: BarChart3 },
  { to: '/audit-logs', label: 'Audit Logs', icon: ScrollText },
]

export default function Sidebar() {
  const { admin, logout } = useAuth()
  const navigate = useNavigate()
  const [pwOpen, setPwOpen] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)

  const handleLogout = () => {
    logout()
    toast.success('Logged out')
    navigate('/admin-login')
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (pwForm.next !== pwForm.confirm) {
      toast.error('New passwords do not match')
      return
    }
    setPwSaving(true)
    try {
      await changeAdminPassword(pwForm.current, pwForm.next)
      toast.success('Password updated')
      setPwOpen(false)
      setPwForm({ current: '', next: '', confirm: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update password')
    } finally {
      setPwSaving(false)
    }
  }

  const initials = admin?.name
    ? admin.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'AD'

  return (
    <>
      <aside
        className="flex flex-col w-60 h-full shrink-0 overflow-y-auto"
        style={{
          background: 'linear-gradient(180deg, #12182c 0%, #0b1020 100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="px-5 py-6">
          <BrandLogo size="sm" subtitle={BRAND.panel} />
        </div>

        <div className="mx-5 mb-4" style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

        <p className="px-5 text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-2">
          Navigation
        </p>

        <nav className="flex-1 px-3 space-y-0.5">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                isActive ? 'sidebar-link active' : 'sidebar-link'
              }
            >
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div
          className="p-3 m-3 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: BRAND.gradient }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{admin?.name || 'Admin'}</p>
              <p className="text-slate-500 text-[11px] truncate">{admin?.email}</p>
            </div>
            <button
              onClick={() => setPwOpen(true)}
              title="Change password"
              className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
            >
              <KeyRound size={14} />
            </button>
            <button
              onClick={handleLogout}
              title="Logout"
              className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      <Modal open={pwOpen} onClose={() => setPwOpen(false)} title="Change Password" size="sm">
        <form onSubmit={handleChangePassword} className="space-y-4">
          <p className="text-xs text-slate-500 -mt-1">
            New password must be at least 10 characters and include uppercase, lowercase, and a number.
          </p>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Current password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={pwForm.current}
              onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
              className="input-dark w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">New password</label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={pwForm.next}
              onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
              className="input-dark w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Confirm new password</label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={pwForm.confirm}
              onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
              className="input-dark w-full"
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setPwOpen(false)} className="btn-ghost" style={{ padding: '9px 16px' }}>
              Cancel
            </button>
            <button type="submit" disabled={pwSaving} className="btn-primary" style={{ padding: '9px 16px' }}>
              {pwSaving ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
