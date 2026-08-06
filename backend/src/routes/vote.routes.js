const router    = require('express').Router()
const mongoose  = require('mongoose')
const Vote      = require('../models/Vote')
const Election  = require('../models/Election')
const Position  = require('../models/Position')
const Candidate = require('../models/Candidate')
const Student   = require('../models/Student')
const { studentOnly } = require('../middleware/auth')
const { studentCanAccessElection } = require('../constants/levels')

/**
 * POST /api/votes
 * Body: { election_id, votes: [{ position_id, candidate_id }, ...] }
 *
 * Security enforcements:
 *  1. Election must be "ongoing" AND within start/end date window (server time)
 *  2. Student must not have already voted — checked with atomic findOneAndUpdate
 *  3. Votes array capped at 50 entries (prevent payload abuse)
 *  4. Every position_id and candidate_id validated against the election
 *  5. candidate_id must belong to position_id (can't mix candidates across positions)
 *  6. No client timestamp trusted — server sets timestamp
 */
router.post('/', studentOnly, async (req, res) => {
  const { election_id, votes } = req.body
  const studentId = req.user.id

  // Basic shape validation
  if (!election_id || !mongoose.isValidObjectId(election_id)) {
    return res.status(400).json({ message: 'Valid election_id is required' })
  }
  if (!Array.isArray(votes) || votes.length === 0) {
    return res.status(400).json({ message: 'votes must be a non-empty array' })
  }
  if (votes.length > 50) {
    return res.status(400).json({ message: 'Too many votes in a single request' })
  }

  try {
    // 1. Check election is ongoing AND within date window
    const now = new Date()
    const election = await Election.findById(election_id)
    if (!election) return res.status(404).json({ message: 'Election not found' })
    if (election.status !== 'ongoing') {
      return res.status(400).json({ message: 'This election is not currently open for voting' })
    }
    if (now < new Date(election.start_date) || now > new Date(election.end_date)) {
      return res.status(400).json({ message: 'Voting is outside the allowed time window' })
    }

    const studentCheck = await Student.findById(studentId).select('level')
    if (!studentCanAccessElection(studentCheck?.level, election.audience_levels)) {
      return res.status(403).json({ message: 'This election is not available for your level' })
    }

    // 2. Atomic double-vote prevention
    // Use findOneAndUpdate to atomically check and set has_voted in a single DB operation.
    // This prevents race conditions where two simultaneous requests both pass the findOne check.
    const studentDoc = await Student.findOneAndUpdate(
      { _id: studentId, has_voted: false },  // only succeeds if NOT already voted
      { $set: { has_voted: true } },
      { new: false }                          // return original doc (before update)
    )
    if (!studentDoc) {
      // Either student not found or has_voted was already true
      return res.status(409).json({ message: 'You have already cast your vote for this election' })
    }

    try {
      // 3. Validate all vote entries — load positions and candidates for this election
      const [positions, candidates] = await Promise.all([
        Position.find({ election_id }).lean(),
        Candidate.find({ election_id }).lean(),
      ])

      const positionIds  = new Set(positions.map((p) => p._id.toString()))
      const candidateMap = new Map(candidates.map((c) => [c._id.toString(), c]))

      for (const v of votes) {
        if (!v.position_id || !v.candidate_id) {
          throw { status: 400, message: 'Each vote must include position_id and candidate_id' }
        }
        if (!mongoose.isValidObjectId(v.position_id) || !mongoose.isValidObjectId(v.candidate_id)) {
          throw { status: 400, message: 'Invalid position_id or candidate_id format' }
        }
        if (!positionIds.has(v.position_id)) {
          throw { status: 400, message: `Position ${v.position_id} does not belong to this election` }
        }
        const cand = candidateMap.get(v.candidate_id)
        if (!cand) {
          throw { status: 400, message: `Candidate ${v.candidate_id} does not exist in this election` }
        }
        if (cand.position_id.toString() !== v.position_id) {
          throw { status: 400, message: `Candidate ${v.candidate_id} does not belong to position ${v.position_id}` }
        }
      }

      // 4. Insert all votes — server-side timestamp only
      const voteDocs = votes.map((v) => ({
        election_id,
        position_id:  v.position_id,
        candidate_id: v.candidate_id,
        student_id:   studentId,
        timestamp:    now,  // server time, never client-provided
      }))

      await Vote.insertMany(voteDocs)
      res.status(201).json({ message: 'Vote submitted successfully' })

    } catch (innerErr) {
      // Rollback the has_voted flag if vote insertion failed
      await Student.findByIdAndUpdate(studentId, { $set: { has_voted: false } })
      const status  = innerErr.status || 500
      const message = innerErr.message || 'Vote submission failed'
      return res.status(status).json({ message })
    }

  } catch (err) {
    res.status(500).json({ message: 'Vote submission failed' })
  }
})

/**
 * GET /api/votes/status/:electionId
 * Returns whether the current student has voted in this election.
 * NOTE: Does NOT return which candidate they voted for.
 */
router.get('/status/:electionId', studentOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.electionId)) {
      return res.status(400).json({ message: 'Invalid election ID' })
    }
    const vote = await Vote.findOne({
      election_id: req.params.electionId,
      student_id: req.user.id,
    }).select('_id') // only return existence, not which candidate
    res.json({ has_voted: !!vote })
  } catch (err) {
    res.status(500).json({ message: 'Could not fetch vote status' })
  }
})

module.exports = router
