import studentApi from './client'

// ── Auth ─────────────────────────────────────────────────────────────────────
export const lookupStudent = (student_id) =>
  studentApi.post('/auth/student/lookup', { student_id })

export const loginStudent = (student_id, password) =>
  studentApi.post('/auth/student/login', { student_id, password })

export const createStudentPassword = (student_id, new_password) =>
  studentApi.post('/auth/student/set-password', { student_id, new_password })

// ── Election data (student token required) ────────────────────────────────────
/** Every election this student belongs to — campus-wide plus their own races. */
export const getMyElections = () => studentApi.get('/mobile/elections')

export const getActiveElection = () => studentApi.get('/mobile/election/active')

export const getBallot = (electionId) =>
  studentApi.get(`/mobile/election/${electionId}/ballot`)

export const getCandidates = (electionId) =>
  studentApi.get(`/mobile/election/${electionId}/candidates`)

export const getResults = (electionId) =>
  studentApi.get(`/mobile/election/${electionId}/results`)

export const getVoteStatus = (electionId) =>
  studentApi.get(`/mobile/vote-status/${electionId}`)

/** Campus-wide tallies — every ongoing/closed election across all year levels. */
export const getCampusStandings = () => studentApi.get('/mobile/standings/campus')

export const submitBallot = (election_id, votes) =>
  studentApi.post('/votes', { election_id, votes })
