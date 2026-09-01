const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const { LEVEL_IDS } = require('../constants/levels')

const studentSchema = new mongoose.Schema(
  {
    student_id: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    section: { type: String, trim: true },
    /** Year level used to match election audience_levels */
    level: {
      type: String,
      default: null,
      validate: {
        validator(v) {
          return v == null || v === '' || LEVEL_IDS.includes(v)
        },
        message: 'Invalid student level',
      },
      set(v) {
        if (v == null || v === '') return null
        return v
      },
    },
    // null = student has not created a password yet
    password_hash: { type: String, default: null },
    /**
     * True once the student has cast a ballot in at least one election.
     * Kept for admin turnout views; the per-election gate is voted_elections.
     */
    has_voted: { type: Boolean, default: false },
    /**
     * Elections this student has already cast a ballot in. A student may be in
     * the audience of several at once (campus-wide + their program's
     * representative race), so voting is claimed per election, not globally.
     */
    voted_elections: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Election' },
    ],
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
)

studentSchema.pre('save', async function () {
  if (!this.isModified('password_hash')) return
  if (this.password_hash == null || this.password_hash === '') {
    this.password_hash = null
    return
  }
  // Already bcrypt-hashed
  if (String(this.password_hash).startsWith('$2')) return
  this.password_hash = await bcrypt.hash(this.password_hash, 12)
})

studentSchema.methods.comparePassword = function (plain) {
  if (!this.password_hash || !String(this.password_hash).startsWith('$2')) {
    return Promise.resolve(false)
  }
  return bcrypt.compare(plain, this.password_hash)
}

studentSchema.methods.hasPassword = function () {
  return !!(this.password_hash && String(this.password_hash).startsWith('$2'))
}

module.exports = mongoose.model('Student', studentSchema)
