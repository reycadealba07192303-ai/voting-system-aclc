import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import {
  createStudentPassword,
  loginStudent,
  lookupStudent,
} from '../api/studentApi'
import { STUDENT_TOKEN_KEY, STUDENT_USER_KEY } from '../api/client'

const StudentAuthContext = createContext(null)

function readStoredStudent() {
  try {
    const raw = localStorage.getItem(STUDENT_USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function StudentAuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STUDENT_TOKEN_KEY))
  const [student, setStudent] = useState(readStoredStudent)

  const applySession = useCallback((newToken, profile) => {
    localStorage.setItem(STUDENT_TOKEN_KEY, newToken)
    localStorage.setItem(STUDENT_USER_KEY, JSON.stringify(profile))
    setToken(newToken)
    setStudent(profile)
    return profile
  }, [])

  /** Step 1 of the sign-in flow: does this ID exist, and does it have a password? */
  const lookup = useCallback(async (studentId) => {
    const { data } = await lookupStudent(studentId)
    return data
  }, [])

  const login = useCallback(
    async (studentId, password) => {
      const { data } = await loginStudent(studentId, password)
      return applySession(data.token, data.student)
    },
    [applySession]
  )

  /** First-time password creation — signs the student straight in. */
  const createPassword = useCallback(
    async (studentId, newPassword) => {
      const { data } = await createStudentPassword(studentId, newPassword)
      return applySession(data.token, data.student)
    },
    [applySession]
  )

  const logout = useCallback(() => {
    localStorage.removeItem(STUDENT_TOKEN_KEY)
    localStorage.removeItem(STUDENT_USER_KEY)
    // The remembered election belongs to the student who just left.
    localStorage.removeItem('sp_selected_election')
    setToken(null)
    setStudent(null)
  }, [])

  /** Keep the cached profile in step with the server after a ballot lands. */
  const markVoted = useCallback((voted = true) => {
    setStudent((prev) => {
      if (!prev || prev.has_voted === voted) return prev
      const next = { ...prev, has_voted: voted }
      localStorage.setItem(STUDENT_USER_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const value = useMemo(
    () => ({
      token,
      student,
      isLoggedIn: !!token,
      hasVoted: student?.has_voted === true,
      lookup,
      login,
      createPassword,
      logout,
      markVoted,
    }),
    [token, student, lookup, login, createPassword, logout, markVoted]
  )

  return (
    <StudentAuthContext.Provider value={value}>{children}</StudentAuthContext.Provider>
  )
}

export function useStudentAuth() {
  const ctx = useContext(StudentAuthContext)
  if (!ctx) throw new Error('useStudentAuth must be used within StudentAuthProvider')
  return ctx
}
