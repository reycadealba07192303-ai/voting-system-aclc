const fs = require('fs')
const path = require('path')
const router = require('express').Router()
const Election = require('../models/Election')
const Candidate = require('../models/Candidate')
const Position = require('../models/Position')
const Vote = require('../models/Vote')
const Student = require('../models/Student')
const { adminOnly } = require('../middleware/auth')
const requireAdminPassword = require('../middleware/requireAdminPassword')
const { logAction } = require('../utils/audit')
const { normalizeLevels } = require('../constants/levels')

// GET all elections
router.get('/', adminOnly, async (req, res) => {
  try {
    const elections = await Election.find().sort({ created_at: -1 })
    res.json(elections)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET single election
router.get('/:id', adminOnly, async (req, res) => {
  try {
    const election = await Election.findById(req.params.id)
    if (!election) return res.status(404).json({ message: 'Election not found' })
    res.json(election)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST create election
router.post('/', adminOnly, async (req, res) => {
  try {
    const { title, description, start_date, end_date } = req.body
    const audience_levels = normalizeLevels(req.body.audience_levels)

    if (!title || !start_date || !end_date) {
      return res.status(400).json({ message: 'Title, start date, and end date are required' })
    }
    if (audience_levels.length === 0) {
      return res.status(400).json({
        message: 'Select at least one audience level (e.g. Grade 11, College)',
      })
    }

    const election = await Election.create({
      title,
      description,
      start_date,
      end_date,
      audience_levels,
    })
    await logAction(
      req.user.id,
      'create_election',
      `Created election: ${title} [${audience_levels.join(', ')}]`
    )
    res.status(201).json(election)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PUT update election
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const updates = { ...req.body }
    if (updates.audience_levels !== undefined) {
      updates.audience_levels = normalizeLevels(updates.audience_levels)
      if (updates.audience_levels.length === 0) {
        return res.status(400).json({
          message: 'Select at least one audience level (e.g. Grade 11, College)',
        })
      }
    }

    const election = await Election.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    )
    if (!election) return res.status(404).json({ message: 'Election not found' })
    await logAction(req.user.id, 'update_election', `Updated election: ${election.title}`)
    res.json(election)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// DELETE election — requires fresh password re-auth; cascades related data
router.delete('/:id', adminOnly, requireAdminPassword, async (req, res) => {
  try {
    const electionId = req.params.id
    const election = await Election.findById(electionId)
    if (!election) return res.status(404).json({ message: 'Election not found' })

    const [voterIds, candidates] = await Promise.all([
      Vote.distinct('student_id', { election_id: electionId }),
      Candidate.find({ election_id: electionId }).select('photo_url'),
    ])

    await Promise.all([
      Vote.deleteMany({ election_id: electionId }),
      Candidate.deleteMany({ election_id: electionId }),
      Position.deleteMany({ election_id: electionId }),
      Election.findByIdAndDelete(electionId),
    ])

    if (voterIds.length) {
      await Student.updateMany(
        { _id: { $in: voterIds } },
        { $set: { has_voted: false } }
      )
    }

    // Best-effort photo cleanup (ignore missing files)
    for (const c of candidates) {
      if (!c.photo_url) continue
      const filePath = path.join(__dirname, '../..', c.photo_url.replace(/^\//, ''))
      fs.promises.unlink(filePath).catch(() => {})
    }

    await logAction(req.user.id, 'delete_election', `Deleted election: ${election.title}`)
    res.json({ message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Delete failed' })
  }
})

// PATCH open election
router.patch('/:id/open', adminOnly, async (req, res) => {
  try {
    const election = await Election.findById(req.params.id)
    if (!election) return res.status(404).json({ message: 'Election not found' })
    if (election.status !== 'draft') {
      return res.status(400).json({ message: 'Only draft elections can be opened' })
    }
    if (!election.audience_levels?.length) {
      return res.status(400).json({
        message: 'Set at least one audience level before opening this election',
      })
    }
    election.status = 'ongoing'
    await election.save()
    await logAction(req.user.id, 'open_election', `Opened election: ${election.title}`)
    res.json(election)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PATCH close election — requires fresh password re-auth
router.patch('/:id/close', adminOnly, requireAdminPassword, async (req, res) => {
  try {
    const election = await Election.findById(req.params.id)
    if (!election) return res.status(404).json({ message: 'Election not found' })
    if (election.status !== 'ongoing') {
      return res.status(400).json({ message: 'Only ongoing elections can be closed' })
    }
    election.status = 'closed'
    await election.save()
    await logAction(req.user.id, 'close_election', `Closed election: ${election.title}`)
    res.json(election)
  } catch (err) {
    res.status(500).json({ message: 'Close failed' })
  }
})

module.exports = router
