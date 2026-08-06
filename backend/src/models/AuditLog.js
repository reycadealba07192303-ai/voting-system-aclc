const mongoose = require('mongoose')

const auditLogSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    action: { type: String, required: true },
    description: { type: String },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
)

module.exports = mongoose.model('AuditLog', auditLogSchema)
