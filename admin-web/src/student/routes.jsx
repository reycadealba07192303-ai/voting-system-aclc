import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { StudentAuthProvider, useStudentAuth } from './context/StudentAuthContext'
import { ElectionProvider } from './context/ElectionContext'
import StudentLayout from './components/StudentLayout'
import './styles/student.css'

/**
 * Election state is keyed on the session, so signing out drops every cached
 * ballot and tally instead of leaking them to the next student on the device.
 */
function ElectionScope() {
  const { isLoggedIn } = useStudentAuth()
  return (
    <ElectionProvider key={isLoggedIn ? 'session' : 'anon'}>
      <Outlet />
    </ElectionProvider>
  )
}

/** Wraps every student route so auth + election state are shared across them. */
export function StudentProviders() {
  return (
    <StudentAuthProvider>
      <ElectionScope />
    </StudentAuthProvider>
  )
}

/** Signed-in students get the portal shell; everyone else goes to the login. */
export function RequireStudent() {
  const { isLoggedIn } = useStudentAuth()
  const location = useLocation()

  if (!isLoggedIn) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }
  return <StudentLayout />
}

/** A student who is already signed in never needs to see the login again. */
export function RedirectIfSignedIn({ children }) {
  const { isLoggedIn } = useStudentAuth()
  if (isLoggedIn) return <Navigate to="/student/home" replace />
  return children
}
