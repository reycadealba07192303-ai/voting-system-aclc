const router = require('express').Router({ mergeParams: true })
const path = require('path')
const multer = require('multer')
const Candidate = require('../models/Candidate')
const { adminOnly } = require('../middleware/auth')
const requireAdminPassword = require('../middleware/requireAdminPassword')
const { logAction } = require('../utils/audit')

// Multer setup — save to uploads/candidates/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/candidates'))
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`)
  },
})
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
    const ext = path.extname(file.originalname || '').toLowerCase()
    const allowedExt = new Set(['.jpg', '.jpeg', '.png', '.webp'])
    if (allowed.has(file.mimetype) && allowedExt.has(ext)) cb(null, true)
    else cb(new Error('Only JPG, PNG, or WebP images are allowed'))
  },
})

// GET all candidates for election
router.get('/', adminOnly, async (req, res) => {
  try {
    const candidates = await Candidate.find({ election_id: req.params.electionId })
      .populate('position_id', 'title')
      .sort({ name: 1 })
    res.json(candidates)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST create candidate
router.post('/', adminOnly, upload.single('photo'), async (req, res) => {
  try {
    const { name, position_id, partylist, platform, biodata } = req.body
    if (!name || !position_id) {
      return res.status(400).json({ message: 'Name and position are required' })
    }
    const photo_url = req.file ? `/uploads/candidates/${req.file.filename}` : undefined
    const candidate = await Candidate.create({
      election_id: req.params.electionId,
      position_id,
      name,
      photo_url,
      partylist,
      platform,
      biodata,
    })
    await logAction(req.user.id, 'create_candidate', `Added candidate: ${name}`)
    res.status(201).json(candidate)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PUT update candidate
router.put('/:candidateId', adminOnly, upload.single('photo'), async (req, res) => {
  try {
    const updates = { ...req.body }
    if (req.file) updates.photo_url = `/uploads/candidates/${req.file.filename}`
    const candidate = await Candidate.findOneAndUpdate(
      { _id: req.params.candidateId, election_id: req.params.electionId },
      { $set: updates },
      { new: true }
    ).populate('position_id', 'title')
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' })
    await logAction(req.user.id, 'update_candidate', `Updated candidate: ${candidate.name}`)
    res.json(candidate)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// DELETE candidate — requires fresh password re-auth
router.delete('/:candidateId', adminOnly, requireAdminPassword, async (req, res) => {
  try {
    const candidate = await Candidate.findOneAndDelete({
      _id: req.params.candidateId,
      election_id: req.params.electionId,
    })
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' })
    await logAction(req.user.id, 'delete_candidate', `Deleted candidate: ${candidate.name}`)
    res.json({ message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Delete failed' })
  }
})

module.exports = router
