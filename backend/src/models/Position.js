const mongoose = require('mongoose')

const positionSchema = new mongoose.Schema(
  {
    election_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Election', required: true },
    title: { type: String, required: true, trim: true },
    max_winners: { type: Number, default: 1 },
    /**
     * Representative-style races: students only see candidates from their
     * own section (set on each candidate).
     */
    is_section_based: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
)

module.exports = mongoose.model('Position', positionSchema)
