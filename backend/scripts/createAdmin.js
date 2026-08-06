/**
 * Script to create an admin account.
 * Usage: node scripts/createAdmin.js
 *
 * Edit the ADMIN_DATA below before running.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const mongoose = require('mongoose')
const Admin = require('../src/models/Admin')

const ADMIN_DATA = {
  name: 'Admin',
  email: 'admin@school.edu',
  password_hash: 'admin123', // plain text — will be hashed automatically
  role: 'admin',
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('✅ Connected to MongoDB')

  const existing = await Admin.findOne({ email: ADMIN_DATA.email })
  if (existing) {
    console.log(`⚠️  Admin with email "${ADMIN_DATA.email}" already exists.`)
    process.exit(0)
  }

  const admin = await Admin.create(ADMIN_DATA)
  console.log('✅ Admin created successfully!')
  console.log(`   Name  : ${admin.name}`)
  console.log(`   Email : ${admin.email}`)
  console.log(`   ID    : ${admin._id}`)
  console.log('\nYou can now log in with:')
  console.log(`   Email    : ${ADMIN_DATA.email}`)
  console.log(`   Password : ${ADMIN_DATA.password_hash}`)

  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
