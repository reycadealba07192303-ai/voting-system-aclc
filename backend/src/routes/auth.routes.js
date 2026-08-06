const router = require('express').Router()
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const Admin = require('../models/Admin')
const Student = require('../models/Student')
const { adminOnly } = require('../middleware/auth')
const {
  adminLoginRules,
  adminRegisterRules,
  studentLoginRules,
  studentSetPasswordRules,
  studentLookupRules,
} = require('../middleware/authValidators')
const {
  validateStudentPassword,
  validateAdminPassword,
} = require('../utils/passwordPolicy')
const { logAction } = require('../utils/audit')

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '4h',
  })
}

function studentPayload(student) {
  return {
    _id: student._id,
    student_id: student.student_id,
    name: student.name,
    section: student.section,
    level: student.level || null,
    has_voted: student.has_voted,
  }
}

// POST /api/auth/admin/register — create admin account
router.post('/admin/register', adminRegisterRules, async (req, res) => {
  try {
    if (process.env.ALLOW_ADMIN_REGISTER === 'false') {
      return res.status(403).json({ message: 'Admin registration is disabled' })
    }

    const name = String(req.body.name || '').trim()
    const email = String(req.body.email || '').toLowerCase().trim()
    const password = req.body.password

    const policyErr = validateAdminPassword(password)
    if (policyErr) return res.status(400).json({ message: policyErr })

    const existing = await Admin.findOne({ email })
    if (existing) {
      return res.status(409).json({ message: 'An admin with this email already exists' })
    }

    const admin = await Admin.create({
      name,
      email,
      password_hash: password, // pre-save hook hashes
    })

    const token = signToken({ id: admin._id, role: 'admin', email: admin.email })
    await logAction(admin._id, 'register_admin', `Registered admin: ${admin.email}`)

    res.status(201).json({
      token,
      admin: { _id: admin._id, name: admin.name, email: admin.email, role: admin.role },
    })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'An admin with this email already exists' })
    }
    res.status(500).json({ message: 'Registration failed' })
  }
})

// POST /api/auth/admin/login
router.post('/admin/login', adminLoginRules, async (req, res) => {
  try {
    const { email, password } = req.body

    const admin = await Admin.findOne({ email: String(email).toLowerCase().trim() })
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const match = await admin.comparePassword(password)
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const token = signToken({ id: admin._id, role: 'admin', email: admin.email })

    res.json({
      token,
      admin: { _id: admin._id, name: admin.name, email: admin.email, role: admin.role },
    })
  } catch (err) {
    res.status(500).json({ message: 'Login failed' })
  }
})

// PATCH /api/auth/admin/change-password — raise password strength for admins
router.patch('/admin/change-password', adminOnly, async (req, res) => {
  try {
    const { current_password, new_password } = req.body
    if (!current_password || !new_password) {
      return res.status(400).json({ message: 'current_password and new_password are required' })
    }

    const policyErr = validateAdminPassword(new_password)
    if (policyErr) return res.status(400).json({ message: policyErr })

    const admin = await Admin.findById(req.user.id)
    if (!admin) return res.status(404).json({ message: 'Admin not found' })

    const match = await admin.comparePassword(current_password)
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    admin.password_hash = new_password // pre-save hook hashes
    await admin.save()
    await logAction(req.user.id, 'change_password', 'Admin changed their password')

    res.json({ message: 'Password updated successfully' })
  } catch (err) {
    res.status(500).json({ message: 'Could not update password' })
  }
})

// POST /api/auth/student/lookup — check if ID exists & whether they have a password
router.post('/student/lookup', studentLookupRules, async (req, res) => {
  try {
    const student_id = String(req.body.student_id || '').trim()
    const student = await Student.findOne({ student_id })
    if (!student) {
      return res.status(404).json({
        exists: false,
        message: 'Student ID not found. Ask your admin to add your record first.',
      })
    }

    res.json({
      exists: true,
      has_password: student.hasPassword(),
      student: {
        student_id: student.student_id,
        name: student.name,
        section: student.section,
        level: student.level || null,
      },
    })
  } catch (err) {
    res.status(500).json({ message: 'Lookup failed' })
  }
})

// POST /api/auth/student/login — existing accounts only (must already have password)
router.post('/student/login', studentLoginRules, async (req, res) => {
  try {
    const student_id = String(req.body.student_id || '').trim()
    const password = req.body.password

    const student = await Student.findOne({ student_id })
    if (!student) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    if (!student.hasPassword()) {
      return res.status(403).json({
        message: 'No password yet. Create your password first.',
        needs_password: true,
      })
    }

    const match = await student.comparePassword(password)
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const token = signToken({
      id: student._id,
      role: 'student',
      student_id: student.student_id,
    })

    res.json({
      token,
      student: studentPayload(student),
    })
  } catch (err) {
    res.status(500).json({ message: 'Login failed' })
  }
})

// POST /api/auth/student/set-password — first-time password create (no current password)
router.post('/student/set-password', studentSetPasswordRules, async (req, res) => {
  try {
    const student_id = String(req.body.student_id || '').trim()
    const new_password = req.body.new_password || ''

    const policyErr = validateStudentPassword(new_password)
    if (policyErr) return res.status(400).json({ message: policyErr })

    const student = await Student.findOne({ student_id })
    if (!student) {
      return res.status(404).json({ message: 'Student ID not found' })
    }

    if (student.hasPassword()) {
      return res.status(409).json({
        message: 'This account already has a password. Please sign in instead.',
      })
    }

    student.password_hash = await bcrypt.hash(new_password, 12)
    await student.save({ validateModifiedOnly: true })

    const token = signToken({
      id: student._id,
      role: 'student',
      student_id: student.student_id,
    })

    res.json({
      message: 'Password created successfully',
      token,
      student: studentPayload(student),
    })
  } catch (err) {
    res.status(500).json({ message: 'Could not create password' })
  }
})

module.exports = router
