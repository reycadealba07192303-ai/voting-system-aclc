const mongoose = require('mongoose')

const candidateSchema = new mongoose.Schema(
  {
    election_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Election', required: true },
    position_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Position', required: true },
    name: { type: String, required: true, trim: true },
    photo_url: { type: String },
    partylist: { type: String, trim: true },
    platform: { type: String, trim: true },
    biodata: { type: String, trim: true },
    /** Section this candidate runs for (required for section-based / representative races). */
    section: { type: String, trim: true, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
)

module.exports = mongoose.model('Candidate', candidateSchema)
