import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  getActiveElection,
  getBallot,
  getCandidates,
  getResults,
  getVoteStatus,
  submitBallot,
} from '../api/studentApi'
import { useStudentAuth } from './StudentAuthContext'

const ElectionContext = createContext(null)

/** How often Home/Results quietly re-pull the tally, matching the old app. */
const LIVE_SYNC_MS = 8000

export function ElectionProvider({ children }) {
  const { isLoggedIn } = useStudentAuth()

  const [election, setElection] = useState(null)
  const [ballot, setBallot] = useState([])
  const [candidates, setCandidates] = useState([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [resultsLoading, setResultsLoading] = useState(false)

  const loadResultsFor = useCallback(async (electionId, { silent = false } = {}) => {
    if (!electionId) {
      setResults([])
      return []
    }
    if (!silent) setResultsLoading(true)
    try {
      const { data } = await getResults(electionId)
      setResults(Array.isArray(data) ? data : [])
      return data
    } catch {
      if (!silent) setResults([])
      return []
    } finally {
      if (!silent) setResultsLoading(false)
    }
  }, [])

  const loadActiveElection = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getActiveElection()
      setElection(data || null)
      if (!data) setResults([])
      return data || null
    } catch {
      setElection(null)
      setResults([])
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const loadBallotFor = useCallback(async (electionId) => {
    setLoading(true)
    try {
      const { data } = await getBallot(electionId)
      const list = Array.isArray(data) ? data : []
      setBallot(list)
      // Older ballots can come back without nested candidates — fall back to the
      // flat directory so the wizard still has people to show.
      if (list.length && list.every((p) => !p.candidates?.length)) {
        try {
          const res = await getCandidates(electionId)
          setCandidates(Array.isArray(res.data) ? res.data : [])
        } catch {
          setCandidates([])
        }
      }
      return list
    } catch {
      setBallot([])
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const loadCandidatesFor = useCallback(async (electionId) => {
    setLoading(true)
    try {
      const { data } = await getCandidates(electionId)
      setCandidates(Array.isArray(data) ? data : [])
      return data
    } catch {
      setCandidates([])
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  /** Refresh election + tallies without flashing a full-screen loader. */
  const syncLive = useCallback(async () => {
    try {
      const { data } = await getActiveElection()
      setElection(data || null)
      if (data?._id) await loadResultsFor(data._id, { silent: true })
      else setResults([])
    } catch {
      // keep whatever is already on screen
    }
  }, [loadResultsFor])

  const fetchVoteStatus = useCallback((electionId) => getVoteStatus(electionId), [])

  const submitVote = useCallback(
    (electionId, votes) => submitBallot(electionId, votes),
    []
  )

  // Poll while the tab is visible so standings stay live on Home and the receipt.
  useEffect(() => {
    if (!isLoggedIn) return undefined
    const tick = () => {
      if (document.visibilityState === 'visible') syncLive()
    }
    const timer = setInterval(tick, LIVE_SYNC_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [isLoggedIn, syncLive])

  const value = useMemo(
    () => ({
      election,
      ballot,
      candidates,
      results,
      loading,
      resultsLoading,
      isOngoing: election?.status === 'ongoing',
      isClosed: election?.status === 'closed',
      loadActiveElection,
      loadBallotFor,
      loadCandidatesFor,
      loadResultsFor,
      syncLive,
      fetchVoteStatus,
      submitVote,
    }),
    [
      election,
      ballot,
      candidates,
      results,
      loading,
      resultsLoading,
      loadActiveElection,
      loadBallotFor,
      loadCandidatesFor,
      loadResultsFor,
      syncLive,
      fetchVoteStatus,
      submitVote,
    ]
  )

  return <ElectionContext.Provider value={value}>{children}</ElectionContext.Provider>
}

export function useElection() {
  const ctx = useContext(ElectionContext)
  if (!ctx) throw new Error('useElection must be used within ElectionProvider')
  return ctx
}
