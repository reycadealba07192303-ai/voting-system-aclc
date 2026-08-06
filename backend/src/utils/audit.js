const AuditLog = require('../models/AuditLog')

async function logAction(userId, action, description) {
  try {
    await AuditLog.create({ user_id: userId, action, description })
  } catch (err) {
    console.error('Audit log error:', err.message)
  }
}

module.exports = { logAction }
