import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Elections from './pages/Elections'
import ElectionDetail from './pages/ElectionDetail'
import Candidates from './pages/Candidates'
import Students from './pages/Students'
import Results from './pages/Results'
import AuditLogs from './pages/AuditLogs'

const toastBase = {
  duration: 3200,
  style: {
    background: '#161b27',
    color: '#e2e8f0',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '13px',
    fontWeight: '500',
    boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
    maxWidth: '380px',
  },
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          gutter={10}
          containerStyle={{ top: 16, right: 16 }}
          toastOptions={{
            ...toastBase,
            success: {
              ...toastBase,
              iconTheme: {
                primary: '#34d399',
                secondary: '#0f172a',
              },
              style: {
                ...toastBase.style,
                borderLeft: '3px solid #34d399',
              },
            },
            error: {
              ...toastBase,
              duration: 4200,
              iconTheme: {
                primary: '#f87171',
                secondary: '#0f172a',
              },
              style: {
                ...toastBase.style,
                borderLeft: '3px solid #f87171',
              },
            },
            loading: {
              ...toastBase,
              iconTheme: {
                primary: '#67e8f9',
                secondary: '#0f172a',
              },
              style: {
                ...toastBase.style,
                borderLeft: '3px solid #67e8f9',
              },
            },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="elections" element={<Elections />} />
            <Route path="elections/:id" element={<ElectionDetail />} />
            <Route path="candidates" element={<Candidates />} />
            <Route path="students" element={<Students />} />
            <Route path="results" element={<Results />} />
            <Route path="audit-logs" element={<AuditLogs />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
