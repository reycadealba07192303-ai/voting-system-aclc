const mongoose = require('mongoose')

const voteSchema = new mongoose.Schema(
  {
    election_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Election', required: true },
    position_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Position', required: true },
    candidate_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      default: null,
    },
    /** true when the student deliberately abstained on this position */
    is_abstain: { type: Boolean, default: false },
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false }
)

voteSchema.pre('validate', function () {
  if (this.is_abstain) {
    this.candidate_id = null
    return
  }
  if (!this.candidate_id) {
    this.invalidate('candidate_id', 'candidate_id is required unless abstaining')
  }
})

// Prevent duplicate votes per student per position (race-safe)
voteSchema.index(
  { election_id: 1, student_id: 1, position_id: 1 },
  { unique: true }
)

module.exports = mongoose.model('Vote', voteSchema)
