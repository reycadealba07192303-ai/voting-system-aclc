const { body } = require('express-validator')
const validate = require('./validate')

const adminLoginRules = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').isString().notEmpty().withMessage('Password is required'),
  validate,
]

const adminRegisterRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 80 }).withMessage('Name is too long'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').isString().notEmpty().withMessage('Password is required'),
  validate,
]

const studentLoginRules = [
  body('student_id').trim().notEmpty().withMessage('Student ID is required'),
  body('password').isString().notEmpty().withMessage('Password is required'),
  validate,
]

const studentSetPasswordRules = [
  body('student_id').trim().notEmpty().withMessage('Student ID is required'),
  body('new_password').isString().notEmpty().withMessage('Password is required'),
  validate,
]

const studentLookupRules = [
  body('student_id').trim().notEmpty().withMessage('Student ID is required'),
  validate,
]

module.exports = {
  adminLoginRules,
  adminRegisterRules,
  studentLoginRules,
  studentSetPasswordRules,
  studentLookupRules,
}
