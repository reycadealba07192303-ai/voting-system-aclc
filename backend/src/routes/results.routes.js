const router = require('express').Router({ mergeParams: true })
const Vote = require('../models/Vote')
const Candidate = require('../models/Candidate')
const Position = require('../models/Position')
const Student = require('../models/Student')
const Election = require('../models/Election')
const { adminOnly } = require('../middleware/auth')
const { buildElectionResults } = require('../utils/electionResults')

// GET /api/elections/:electionId/results
router.get('/', adminOnly, async (req, res) => {
  try {
    const { electionId } = req.params
    const [positions, candidates, votes, voterIds] = await Promise.all([
      Position.find({ election_id: electionId }),
      Candidate.find({ election_id: electionId }),
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

// GET /api/elections/:electionId/monitoring
router.get('/monitoring', adminOnly, async (req, res) => {
  try {
    const { electionId } = req.params
    const election = await Election.findById(electionId).select('audience_levels')
    const levels = election?.audience_levels || []
    const studentFilter = levels.length ? { level: { $in: levels } } : {}

    const students = await Student.find(studentFilter).select('student_id name section has_voted level')
    const votes = await Vote.find({ election_id: electionId }).distinct('student_id')
    const votedSet = new Set(votes.map((id) => id.toString()))

    const sectionMap = {}
    for (const s of students) {
      const sec = s.section || 'No Section'
      if (!sectionMap[sec]) sectionMap[sec] = { total: 0, voted: 0 }
      sectionMap[sec].total++
      if (votedSet.has(s._id.toString())) sectionMap[sec].voted++
    }

    const monitoring = Object.entries(sectionMap)
      .map(([section, data]) => ({
        section,
        total: data.total,
        voted: data.voted,
        notVoted: data.total - data.voted,
        turnout: data.total > 0 ? Math.round((data.voted / data.total) * 100) : 0,
      }))
      .sort((a, b) => a.section.localeCompare(b.section))

    res.json(monitoring)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
