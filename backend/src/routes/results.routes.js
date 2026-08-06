const router = require('express').Router({ mergeParams: true })
const Vote = require('../models/Vote')
const Candidate = require('../models/Candidate')
const Position = require('../models/Position')
const Student = require('../models/Student')
const Election = require('../models/Election')
const { adminOnly } = require('../middleware/auth')

// GET /api/elections/:electionId/results
router.get('/', adminOnly, async (req, res) => {
  try {
    const { electionId } = req.params
    const positions = await Position.find({ election_id: electionId })
    const candidates = await Candidate.find({ election_id: electionId })
    const votes = await Vote.find({ election_id: electionId })

    const results = positions.map((pos) => {
      const posCandidates = candidates.filter(
        (c) => c.position_id.toString() === pos._id.toString()
      )
      const candidateResults = posCandidates.map((c) => ({
        _id: c._id,
        name: c.name,
        photo_url: c.photo_url,
        partylist: c.partylist,
        votes: votes.filter((v) => v.candidate_id.toString() === c._id.toString()).length,
      }))
      candidateResults.sort((a, b) => b.votes - a.votes)

      const winners = candidateResults.slice(0, pos.max_winners).filter((c) => c.votes > 0)

      return { _id: pos._id, title: pos.title, candidates: candidateResults, winners }
    })

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

    // Group by section
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
