import { Outlet, Navigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '../../context/AuthContext'

export default function AppLayout() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <div className="flex min-h-screen" style={{ background: '#0f1117' }}>
      {/* Sticky left nav — stays put while main content scrolls */}
      <div className="sticky top-0 h-screen shrink-0 z-30">
        <Sidebar />
      </div>
      <main className="flex-1 min-w-0 min-h-screen overflow-x-auto">
        <div className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
