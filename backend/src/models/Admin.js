const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true },
    role: { type: String, default: 'admin' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
)

// Hash password before save
adminSchema.pre('save', async function () {
  if (!this.isModified('password_hash')) return
  this.password_hash = await bcrypt.hash(this.password_hash, 12)
})

// Compare plain password with hash
adminSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password_hash)
}

module.exports = mongoose.model('Admin', adminSchema)
