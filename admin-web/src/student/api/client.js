import axios from 'axios'

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

/** Origin without the trailing `/api` — candidate photos live under `/uploads`. */
export const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '')

export const STUDENT_TOKEN_KEY = 'student_token'
export const STUDENT_USER_KEY = 'student_user'

/** Resolve a stored `photo_url` (`/uploads/…`) into something an <img> can load. */
export function photoUrl(path) {
  if (!path) return null
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:')) return path
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`
}

const studentApi = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

studentApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(STUDENT_TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// A dead student session drops back to the portal login, never the admin one.
studentApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(STUDENT_TOKEN_KEY)
      localStorage.removeItem(STUDENT_USER_KEY)
      if (!window.location.pathname.startsWith('/student-login')) {
        window.location.href = '/student-login'
      }
    }
    return Promise.reject(err)
  }
)

/** Pull the human-readable message the backend sends with a failure. */
export function apiMessage(err, fallback = 'Something went wrong. Please try again.') {
  return err?.response?.data?.message || err?.message || fallback
}

export default studentApi
