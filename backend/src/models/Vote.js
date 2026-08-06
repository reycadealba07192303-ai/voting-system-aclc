const mongoose = require('mongoose')

const voteSchema = new mongoose.Schema(
  {
    election_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Election', required: true },
    position_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Position', required: true },
    candidate_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false }
)

// Prevent duplicate votes per student per position (race-safe)
voteSchema.index(
  { election_id: 1, student_id: 1, position_id: 1 },
  { unique: true }
)

module.exports = mongoose.model('Vote', voteSchema)
