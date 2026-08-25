const router    = require('express').Router()
const mongoose  = require('mongoose')
const Vote      = require('../models/Vote')
const Election  = require('../models/Election')
const Position  = require('../models/Position')
const Candidate = require('../models/Candidate')
const Student   = require('../models/Student')
const { studentOnly } = require('../middleware/auth')
const { studentInAudience } = require('../utils/audience')

/**
 * POST /api/votes
 * Body: { election_id, votes: [{ position_id, candidate_id? , is_abstain? }, ...] }
 *
 * One entry per position on the ballot. Missing candidate = abstain.
 */
router.post('/', studentOnly, async (req, res) => {
  const { election_id, votes } = req.body
  const studentId = req.user.id

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
    const now = new Date()
    const election = await Election.findById(election_id)
    if (!election) return res.status(404).json({ message: 'Election not found' })
    if (election.status !== 'ongoing') {
      return res.status(400).json({ message: 'This election is not currently open for voting' })
    }
    if (now < new Date(election.start_date) || now > new Date(election.end_date)) {
      return res.status(400).json({ message: 'Voting is outside the allowed time window' })
    }

    const studentCheck = await Student.findById(studentId).select('level section')
    if (!studentInAudience(studentCheck, election)) {
      return res.status(403).json({ message: 'This election is not available for your year level or section' })
    }

    const studentDoc = await Student.findOneAndUpdate(
      { _id: studentId, has_voted: false },
      { $set: { has_voted: true } },
      { new: false }
    )
    if (!studentDoc) {
      return res.status(409).json({ message: 'You have already cast your vote for this election' })
    }

    try {
      const [positions, candidates] = await Promise.all([
        Position.find({ election_id }).lean(),
        Candidate.find({ election_id }).lean(),
      ])

      const positionIds  = new Set(positions.map((p) => p._id.toString()))
      const candidateMap = new Map(candidates.map((c) => [c._id.toString(), c]))
      const seenPositions = new Set()

      if (votes.length !== positions.length) {
        throw {
          status: 400,
          message: `Submit one choice per position (${positions.length} required)`,
        }
      }

      for (const v of votes) {
        if (!v.position_id || !mongoose.isValidObjectId(v.position_id)) {
          throw { status: 400, message: 'Each vote must include a valid position_id' }
        }
        if (!positionIds.has(v.position_id)) {
          throw { status: 400, message: `Position ${v.position_id} does not belong to this election` }
        }
        if (seenPositions.has(v.position_id)) {
          throw { status: 400, message: `Duplicate vote for position ${v.position_id}` }
        }
        seenPositions.add(v.position_id)

        const isAbstain = v.is_abstain === true || v.candidate_id == null || v.candidate_id === ''

        if (isAbstain) continue

        if (!mongoose.isValidObjectId(v.candidate_id)) {
          throw { status: 400, message: 'Invalid candidate_id format' }
        }
        const cand = candidateMap.get(v.candidate_id)
        if (!cand) {
          throw { status: 400, message: `Candidate ${v.candidate_id} does not exist in this election` }
        }
        if (cand.position_id.toString() !== v.position_id) {
          throw {
            status: 400,
            message: `Candidate ${v.candidate_id} does not belong to position ${v.position_id}`,
          }
        }
      }

      const voteDocs = votes.map((v) => {
        const isAbstain = v.is_abstain === true || v.candidate_id == null || v.candidate_id === ''
        return {
          election_id,
          position_id: v.position_id,
          candidate_id: isAbstain ? null : v.candidate_id,
          is_abstain: isAbstain,
          student_id: studentId,
          timestamp: now,
        }
      })

      await Vote.insertMany(voteDocs)
      res.status(201).json({ message: 'Vote submitted successfully' })
    } catch (innerErr) {
      await Student.findByIdAndUpdate(studentId, { $set: { has_voted: false } })
      const status  = innerErr.status || 500
      const message = innerErr.message || 'Vote submission failed'
      return res.status(status).json({ message })
    }
  } catch (err) {
    res.status(500).json({ message: 'Vote submission failed' })
  }
})

router.get('/status/:electionId', studentOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.electionId)) {
      return res.status(400).json({ message: 'Invalid election ID' })
    }
    const vote = await Vote.findOne({
      election_id: req.params.electionId,
      student_id: req.user.id,
    }).select('_id')
    res.json({ has_voted: !!vote })
  } catch (err) {
    res.status(500).json({ message: 'Could not fetch vote status' })
  }
})

module.exports = router
