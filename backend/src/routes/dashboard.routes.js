const router = require('express').Router()
const Student = require('../models/Student')
const Candidate = require('../models/Candidate')
const Vote = require('../models/Vote')
const Election = require('../models/Election')
const { adminOnly } = require('../middleware/auth')

// GET /api/dashboard
router.get('/', adminOnly, async (req, res) => {
  try {
    const [totalStudents, totalCandidates, activeElection] = await Promise.all([
      Student.countDocuments(),
      Candidate.countDocuments(),
      Election.findOne({ status: 'ongoing' }),
    ])

    let votesCast = 0
    let turnout = null

    if (activeElection) {
      // Eligible students = those whose level is in this election's audience
      const levels = activeElection.audience_levels || []
      const eligibleFilter = levels.length
        ? { level: { $in: levels } }
        : {}
      const eligibleStudents = await Student.countDocuments(eligibleFilter)
      const uniqueVoters = await Vote.distinct('student_id', { election_id: activeElection._id })
      votesCast = uniqueVoters.length
      turnout = eligibleStudents > 0 ? Math.round((votesCast / eligibleStudents) * 100) : 0
    }

    res.json({ totalStudents, totalCandidates, votesCast, turnout, activeElection })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
