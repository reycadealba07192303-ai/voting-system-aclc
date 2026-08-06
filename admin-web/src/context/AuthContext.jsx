import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { loginAdmin, registerAdmin } from '../api/auth'

const AuthContext = createContext(null)

/** Auto-logout after this much idle time (ms). */
const IDLE_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    const stored = localStorage.getItem('admin_user')
    return stored ? JSON.parse(stored) : null
  })
  const idleTimer = useRef(null)

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    setAdmin(null)
  }, [])

  const bumpIdle = useCallback(() => {
    if (!admin) return
    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => {
      logout()
    }, IDLE_TIMEOUT_MS)
  }, [admin, logout])

  useEffect(() => {
    if (!admin) {
      if (idleTimer.current) clearTimeout(idleTimer.current)
      return undefined
    }

    bumpIdle()
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach((e) => window.addEventListener(e, bumpIdle, { passive: true }))

    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current)
      events.forEach((e) => window.removeEventListener(e, bumpIdle))
    }
  }, [admin, bumpIdle])

  const applySession = useCallback((token, adminData) => {
    localStorage.setItem('admin_token', token)
    localStorage.setItem('admin_user', JSON.stringify(adminData))
    setAdmin(adminData)
    return adminData
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await loginAdmin(email, password)
    const { token, admin: adminData } = res.data
    return applySession(token, adminData)
  }, [applySession])

  const register = useCallback(async (name, email, password) => {
    const res = await registerAdmin(name, email, password)
    const { token, admin: adminData } = res.data
    return applySession(token, adminData)
  }, [applySession])

  return (
    <AuthContext.Provider value={{ admin, login, register, logout, isAuthenticated: !!admin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
