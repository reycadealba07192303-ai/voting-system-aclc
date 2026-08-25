/**
 * Mobile-facing read-only routes (student token required)
 * These return the data the Flutter app needs without exposing admin-only fields.
 */
const router = require('express').Router()
const Election = require('../models/Election')
const Position = require('../models/Position')
const Candidate = require('../models/Candidate')
const Vote = require('../models/Vote')
const Student = require('../models/Student')
const { studentOnly } = require('../middleware/auth')
const { studentInAudience, isSectionBasedPosition } = require('../utils/audience')
const { buildElectionResults } = require('../utils/electionResults')

async function loadStudentLevel(req) {
  const student = await Student.findById(req.user.id).select('level section name student_id has_voted')
  return student
}

async function assertElectionAccess(req, electionId) {
  const [student, election] = await Promise.all([
    loadStudentLevel(req),
    Election.findById(electionId),
  ])
  if (!election) return { error: { status: 404, message: 'Election not found' } }
  if (!studentInAudience(student, election)) {
    return {
      error: {
        status: 403,
        message: 'This election is not available for your year level or section',
      },
    }
  }
  return { student, election }
}

// GET current election for this student's level (ongoing, else latest closed for final tallies)
router.get('/election/active', studentOnly, async (req, res) => {
  try {
    const student = await loadStudentLevel(req)
    if (!student?.level) {
      return res.json(null)
    }

    const pickForStudent = (list) =>
      list.find((election) => studentInAudience(student, election)) || null

    const ongoing = await Election.find({
      status: 'ongoing',
      audience_levels: student.level,
    }).sort({ created_at: -1 })

    let election = pickForStudent(ongoing)

    // Keep final standings visible after voting closes
    if (!election) {
      const closed = await Election.find({
        status: 'closed',
        audience_levels: student.level,
      }).sort({ created_at: -1 })
      election = pickForStudent(closed)
    }

    if (!election) return res.json(null)
    res.json(election)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET positions for an election (with candidates nested)
router.get('/election/:electionId/ballot', studentOnly, async (req, res) => {
  try {
    const access = await assertElectionAccess(req, req.params.electionId)
    if (access.error) return res.status(access.error.status).json({ message: access.error.message })

    const positions = await Position.find({ election_id: req.params.electionId }).lean()
    const candidates = await Candidate.find({ election_id: req.params.electionId })
      .select('name photo_url partylist platform biodata position_id section')
      .lean()

    const ballot = positions.map((pos) => {
      const posId = pos._id.toString()
      return {
        _id: pos._id,
        title: pos.title,
        max_winners: pos.max_winners,
        is_section_based: isSectionBasedPosition(pos),
        candidates: candidates.filter(
          (c) => c.position_id && c.position_id.toString() === posId
        ),
      }
    })

    res.json(ballot)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET all candidates grouped by partylist (for directory)
router.get('/election/:electionId/candidates', studentOnly, async (req, res) => {
  try {
    const access = await assertElectionAccess(req, req.params.electionId)
    if (access.error) return res.status(access.error.status).json({ message: access.error.message })

    const candidates = await Candidate.find({ election_id: req.params.electionId })
      .populate('position_id', 'title')
      .sort({ partylist: 1, name: 1 })
    res.json(candidates)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET sections list (distinct sections from students)
router.get('/sections', studentOnly, async (req, res) => {
  try {
    const sections = await Student.distinct('section')
    const result = sections
      .filter(Boolean)
      .sort()
      .map((s) => ({ section: s }))
    res.json(result)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET students in a section
router.get('/sections/:section/students', studentOnly, async (req, res) => {
  try {
    const students = await Student.find({ section: req.params.section })
      .select('student_id name section level has_voted')
      .sort({ name: 1 })
    res.json(students)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET student's own vote status
router.get('/vote-status/:electionId', studentOnly, async (req, res) => {
  try {
    const access = await assertElectionAccess(req, req.params.electionId)
    if (access.error) return res.status(access.error.status).json({ message: access.error.message })

    const votes = await Vote.find({
      election_id: req.params.electionId,
      student_id: req.user.id,
    })
      .populate('candidate_id', 'name partylist photo_url')
      .populate('position_id', 'title')
    res.json({
      has_voted: votes.length > 0,
      votes: votes.map((v) => ({
        _id: v._id,
        position_id: v.position_id,
        candidate_id: v.candidate_id,
        is_abstain: v.is_abstain,
        timestamp: v.timestamp,
      })),
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET live standings for an election (student-facing)
router.get('/election/:electionId/results', studentOnly, async (req, res) => {
  try {
    const access = await assertElectionAccess(req, req.params.electionId)
    if (access.error) return res.status(access.error.status).json({ message: access.error.message })

    const { electionId } = req.params
    const [positions, candidates, votes, voterIds] = await Promise.all([
      Position.find({ election_id: electionId }),
      Candidate.find({ election_id: electionId }).select('name photo_url partylist position_id'),
      Vote.find({ election_id: electionId }),
      Vote.distinct('student_id', { election_id: electionId }),
    ])

    const results = buildElectionResults(
      positions,
      candidates,
      votes,
      voterIds.length
    )

    res.json(results)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
