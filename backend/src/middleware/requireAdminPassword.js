const Admin = require('../models/Admin')

/**
 * Require the admin's current password in the request body for high-impact actions.
 * Expects `password` (or `confirm_password`) on req.body.
 */
async function requireAdminPassword(req, res, next) {
  try {
    const password = req.body?.password || req.body?.confirm_password
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ message: 'Admin password confirmation is required' })
    }

    const admin = await Admin.findById(req.user.id)
    if (!admin) return res.status(404).json({ message: 'Admin not found' })

    const match = await admin.comparePassword(password) 
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    next()
  } catch {
    res.status(500).json({ message: 'Password verification failed' })
  }
}

module.exports = requireAdminPassword
