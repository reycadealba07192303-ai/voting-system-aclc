import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  getBallot,
  getCandidates,
  getMyElections,
  getResults,
  getVoteStatus,
  submitBallot,
} from '../api/studentApi'
import { useStudentAuth } from './StudentAuthContext'

const ElectionContext = createContext(null)

/** How often Home/Results quietly re-pull the tally, matching the old app. */
const LIVE_SYNC_MS = 8000

/** Remembers which race the student was last looking at, across reloads. */
const SELECTED_KEY = 'sp_selected_election'

function readSelected() {
  try {
    return localStorage.getItem(SELECTED_KEY) || null
  } catch {
    return null
  }
}

function writeSelected(id) {
  try {
    if (id) localStorage.setItem(SELECTED_KEY, id)
    else localStorage.removeItem(SELECTED_KEY)
  } catch {
    // storage is a convenience here, never a requirement
  }
}

/**
 * Pick the race to land on: keep the student's own choice when it is still in
 * the list, otherwise the first one still waiting on their ballot, otherwise
 * the first open race, otherwise anything.
 */
function chooseElection(list, preferredId) {
  if (!list.length) return null
  if (preferredId) {
    const kept = list.find((e) => String(e._id) === String(preferredId))
    if (kept) return kept
  }
  return (
    list.find((e) => e.status === 'ongoing' && !e.has_voted) ||
    list.find((e) => e.status === 'ongoing') ||
    list[0]
  )
}

export function ElectionProvider({ children }) {
  const { isLoggedIn } = useStudentAuth()

  const [elections, setElections] = useState([])
  const [selectedId, setSelectedId] = useState(readSelected)
  const [ballot, setBallot] = useState([])
  const [candidates, setCandidates] = useState([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [resultsLoading, setResultsLoading] = useState(false)

  // Reading the live selection inside callbacks without making them re-fire.
  // The mutators below write it straight through, so it is never a frame behind.
  const selectedRef = useRef(selectedId)
  useEffect(() => {
    selectedRef.current = selectedId
  }, [selectedId])

  const election = useMemo(
    () => elections.find((e) => String(e._id) === String(selectedId)) || null,
    [elections, selectedId]
  )

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

  /**
   * Pull the student's full slate of races. Returns the one now selected so
   * callers can immediately fetch its ballot, roster, or tally.
   */
  const loadElections = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const { data } = await getMyElections()
      const list = Array.isArray(data) ? data : []
      setElections(list)
      const picked = chooseElection(list, selectedRef.current)
      const pickedId = picked ? String(picked._id) : null
      if (pickedId !== selectedRef.current) {
        selectedRef.current = pickedId
        setSelectedId(pickedId)
        writeSelected(pickedId)
      }
      if (!picked) setResults([])
      return picked
    } catch {
      if (!silent) {
        setElections([])
        setResults([])
      }
      return null
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  /** Switch races — the ballot and roster belong to the old one, so drop them. */
  const selectElection = useCallback(
    (electionId) => {
      const id = electionId ? String(electionId) : null
      if (id === selectedRef.current) return
      selectedRef.current = id
      setSelectedId(id)
      writeSelected(id)
      setBallot([])
      setCandidates([])
      setResults([])
    },
    []
  )

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

  /** Refresh the slate + tallies without flashing a full-screen loader. */
  const syncLive = useCallback(async () => {
    const picked = await loadElections({ silent: true })
    if (picked?._id) await loadResultsFor(picked._id, { silent: true })
    else setResults([])
  }, [loadElections, loadResultsFor])

  const fetchVoteStatus = useCallback((electionId) => getVoteStatus(electionId), [])

  /** Flip the cached ballot flag for one race so the UI settles immediately. */
  const markVotedIn = useCallback((electionId, voted = true) => {
    setElections((prev) =>
      prev.map((e) =>
        String(e._id) === String(electionId) ? { ...e, has_voted: voted } : e
      )
    )
  }, [])

  const submitVote = useCallback(
    async (electionId, votes) => {
      const res = await submitBallot(electionId, votes)
      markVotedIn(electionId, true)
      return res
    },
    [markVotedIn]
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

  const pendingElections = useMemo(
    () => elections.filter((e) => e.status === 'ongoing' && !e.has_voted),
    [elections]
  )

  const hasVotedIn = useCallback(
    (electionId) =>
      elections.find((e) => String(e._id) === String(electionId))?.has_voted === true,
    [elections]
  )

  const value = useMemo(
    () => ({
      elections,
      election,
      pendingElections,
      ballot,
      candidates,
      results,
      loading,
      resultsLoading,
      isOngoing: election?.status === 'ongoing',
      isClosed: election?.status === 'closed',
      hasVoted: election?.has_voted === true,
      hasVotedIn,
      selectElection,
      loadElections,
      loadBallotFor,
      loadCandidatesFor,
      loadResultsFor,
      markVotedIn,
      syncLive,
      fetchVoteStatus,
      submitVote,
    }),
    [
      elections,
      election,
      pendingElections,
      ballot,
      candidates,
      results,
      loading,
      resultsLoading,
      hasVotedIn,
      selectElection,
      loadElections,
      loadBallotFor,
      loadCandidatesFor,
      loadResultsFor,
      markVotedIn,
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
