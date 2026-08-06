const router = require('express').Router()
const AuditLog = require('../models/AuditLog')
const { adminOnly } = require('../middleware/auth')

// GET /api/audit-logs
router.get('/', adminOnly, async (req, res) => {
  try {
    const { search } = req.query
    const filter = search
      ? {
          $or: [
            { action: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
          ],
        }
      : {}
    const logs = await AuditLog.find(filter)
      .populate('user_id', 'name email')
      .sort({ created_at: -1 })
      .limit(200)
    res.json(logs)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
