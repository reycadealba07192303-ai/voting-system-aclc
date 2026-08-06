/**
 * Password strength helpers for admin / student accounts.
 */

function validateStudentPassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters'
  }
  return null
}

/** Admin: min 10 chars, upper, lower, number */
function validateAdminPassword(password) {
  if (typeof password !== 'string' || password.length < 10) {
    return 'Admin password must be at least 10 characters'
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Admin password must include uppercase, lowercase, and a number'
  }
  return null
}

module.exports = { validateStudentPassword, validateAdminPassword }
