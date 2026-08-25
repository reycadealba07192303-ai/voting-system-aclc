const router = require('express').Router({ mergeParams: true })
const Position = require('../models/Position')
const { adminOnly } = require('../middleware/auth')
const { logAction } = require('../utils/audit')

// GET all positions for an election
router.get('/', adminOnly, async (req, res) => {
  try {
    const positions = await Position.find({ election_id: req.params.electionId }).sort({ created_at: 1 })
    res.json(positions)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST create position
router.post('/', adminOnly, async (req, res) => {
  try {
    const { title, max_winners, is_section_based } = req.body
    if (!title) return res.status(400).json({ message: 'Title is required' })
    const sectionBased =
      is_section_based === true || is_section_based === 'true' || /represent/i.test(title)
    const position = await Position.create({
      election_id: req.params.electionId,
      title,
      max_winners: max_winners || 1,
      is_section_based: sectionBased,
    })
    await logAction(req.user.id, 'create_position', `Created position: ${title}`)
    res.status(201).json(position)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PUT update position
router.put('/:positionId', adminOnly, async (req, res) => {
  try {
    const allowed = {}
    if (req.body.title !== undefined) allowed.title = req.body.title
    if (req.body.max_winners !== undefined) allowed.max_winners = req.body.max_winners
    if (req.body.is_section_based !== undefined) {
      allowed.is_section_based =
        req.body.is_section_based === true || req.body.is_section_based === 'true'
    } else if (typeof req.body.title === 'string' && /represent/i.test(req.body.title)) {
      allowed.is_section_based = true
    }
    const position = await Position.findOneAndUpdate(
      { _id: req.params.positionId, election_id: req.params.electionId },
      { $set: allowed },
      { new: true }
    )
    if (!position) return res.status(404).json({ message: 'Position not found' })
    await logAction(req.user.id, 'update_position', `Updated position: ${position.title}`)
    res.json(position)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// DELETE position
router.delete('/:positionId', adminOnly, async (req, res) => {
  try {
    const position = await Position.findOneAndDelete({
      _id: req.params.positionId,
      election_id: req.params.electionId,
    })
    if (!position) return res.status(404).json({ message: 'Position not found' })
    await logAction(req.user.id, 'delete_position', `Deleted position: ${position.title}`)
    res.json({ message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
