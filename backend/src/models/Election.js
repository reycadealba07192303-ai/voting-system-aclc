const mongoose = require('mongoose')
const { LEVEL_IDS } = require('../constants/levels')

const electionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    status: { type: String, enum: ['draft', 'ongoing', 'closed'], default: 'draft' },
    /** Which student levels can see/vote in this election */
    audience_levels: {
      type: [{ type: String, enum: LEVEL_IDS }],
      default: [],
    },
    /**
     * Optional section allow-list per level.
     * Shape: { grade_11: ['STEM A', 'ABM 1'], college_1: ['BSIT 1A'] }
     * Missing or empty array for a level = every section in that level.
     */
    audience_sections: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
)

module.exports = mongoose.model('Election', electionSchema)
