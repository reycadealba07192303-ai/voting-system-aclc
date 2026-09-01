const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')
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
const { normalizeWindowDate, validateWindow } = require('../utils/electionWindow')
const { normalizeAudienceSections } = require('../utils/audience')

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
    const audience_sections = normalizeAudienceSections(
      audience_levels,
      req.body.audience_sections
    )

    if (!title || !start_date || !end_date) {
      return res.status(400).json({ message: 'Title, start date, and end date are required' })
    }
    if (audience_levels.length === 0) {
      return res.status(400).json({
        message: 'Select at least one audience level (e.g. Grade 11, College)',
      })
    }

    const from = normalizeWindowDate(start_date, 'start')
    const to = normalizeWindowDate(end_date, 'end')
    const windowError = validateWindow(from, to)
    if (windowError) return res.status(400).json({ message: windowError })

    const election = await Election.create({
      title,
      description,
      start_date: from,
      end_date: to,
      audience_levels,
      audience_sections,
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
      updates.audience_sections = normalizeAudienceSections(
        updates.audience_levels,
        updates.audience_sections ?? {}
      )
    } else if (updates.audience_sections !== undefined) {
      const current = await Election.findById(req.params.id).select('audience_levels').lean()
      if (!current) return res.status(404).json({ message: 'Election not found' })
      updates.audience_sections = normalizeAudienceSections(
        current.audience_levels,
        updates.audience_sections
      )
    }

    // Either date may be edited on its own, so check the resulting window
    // against whatever the election already has.
    if (updates.start_date !== undefined || updates.end_date !== undefined) {
      const current = await Election.findById(req.params.id).select('start_date end_date').lean()
      if (!current) return res.status(404).json({ message: 'Election not found' })

      if (updates.start_date !== undefined) {
        updates.start_date = normalizeWindowDate(updates.start_date, 'start')
      }
      if (updates.end_date !== undefined) {
        updates.end_date = normalizeWindowDate(updates.end_date, 'end')
      }

      const windowError = validateWindow(
        updates.start_date ?? current.start_date,
        updates.end_date ?? current.end_date
      )
      if (windowError) return res.status(400).json({ message: windowError })
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
      // Drop only this election's claim — a student may still hold a ballot in
      // another race, so has_voted is recomputed rather than blanket-cleared.
      // sanitizeFilter is on globally, so every $-operator must be trusted.
      await Student.updateMany(
        { _id: mongoose.trusted({ $in: voterIds }) },
        { $pull: { voted_elections: electionId } }
      )
      const stillVoting = await Vote.distinct('student_id', {
        student_id: mongoose.trusted({ $in: voterIds }),
      })
      const stillVotingIds = new Set(stillVoting.map((id) => String(id)))
      const cleared = voterIds.filter((id) => !stillVotingIds.has(String(id)))
      if (cleared.length) {
        await Student.updateMany(
          { _id: mongoose.trusted({ $in: cleared }) },
          { $set: { has_voted: false } }
        )
      }
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
    if (election.status !== 'draft' && election.status !== 'closed') {
      return res.status(400).json({ message: 'Only draft or closed elections can be opened' })
    }
    if (!election.audience_levels?.length) {
      return res.status(400).json({
        message: 'Set at least one audience level before opening this election',
      })
    }
    // Otherwise the election opens but every student is turned away by the
    // voting-window check with no hint of why.
    if (new Date() > new Date(election.end_date)) {
      return res.status(400).json({
        message: 'This election\'s end date has already passed — update the dates before opening it',
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
