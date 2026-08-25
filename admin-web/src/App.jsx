import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import AppLayout from './components/layout/AppLayout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Elections from './pages/Elections'
import ElectionDetail from './pages/ElectionDetail'
import Candidates from './pages/Candidates'
import Students from './pages/Students'
import Results from './pages/Results'
import AuditLogs from './pages/AuditLogs'
import { StudentProviders, RequireStudent, RedirectIfSignedIn } from './student/routes'
import StudentLogin from './student/pages/Login'
import StudentHome from './student/pages/Home'
import StudentCandidates from './student/pages/Candidates'
import StudentCandidateDetail from './student/pages/CandidateDetail'
import TeamRoster from './student/pages/TeamRoster'
import StudentVote from './student/pages/Vote'
import StudentConfirmation from './student/pages/Confirmation'
import StudentProfile from './student/pages/Profile'
import CampusStandings from './student/pages/CampusStandings'

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
          {/* Public landing and auth entries */}
          <Route path="/" element={<Landing />} />
          <Route path="/admin-login" element={<Login />} />
          <Route path="/login" element={<Navigate to="/admin-login" replace />} />
          <Route path="/register" element={<Register />} />

          {/* Student portal — same site, no separate app */}
          <Route element={<StudentProviders />}>
            <Route
              path="/student-login"
              element={
                <RedirectIfSignedIn>
                  <StudentLogin />
                </RedirectIfSignedIn>
              }
            />
            <Route path="/student" element={<RequireStudent />}>
              <Route index element={<Navigate to="/student/home" replace />} />
              <Route path="home" element={<StudentHome />} />
              <Route path="campus" element={<CampusStandings />} />
              <Route path="candidates" element={<StudentCandidates />} />
              <Route path="candidates/team/:teamName" element={<TeamRoster />} />
              <Route path="candidates/:id" element={<StudentCandidateDetail />} />
              <Route path="vote" element={<StudentVote />} />
              <Route path="confirmation" element={<StudentConfirmation />} />
              <Route path="profile" element={<StudentProfile />} />
            </Route>
          </Route>

          {/* Admin console */}
          <Route element={<AppLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="elections" element={<Elections />} />
            <Route path="elections/:id" element={<ElectionDetail />} />
            <Route path="candidates" element={<Candidates />} />
            <Route path="students" element={<Students />} />
            <Route path="results" element={<Results />} />
            <Route path="audit-logs" element={<AuditLogs />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
