const { studentCanAccessElection, normalizeLevels } = require('../constants/levels')

function normalizeAudienceSections(levels, raw) {
  const allowed = new Set(normalizeLevels(levels))
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out = {}
  for (const [level, list] of Object.entries(raw)) {
    if (!allowed.has(level) || !Array.isArray(list)) continue
    const cleaned = [
      ...new Set(list.map((s) => String(s || '').trim()).filter(Boolean)),
    ]
    if (cleaned.length) out[level] = cleaned
  }
  return out
}

function studentInAudience(student, election) {
  if (!studentCanAccessElection(student?.level, election?.audience_levels)) {
    return false
  }
  const selected = election?.audience_sections?.[student.level]
  if (!Array.isArray(selected) || selected.length === 0) return true
  const section = String(student?.section || '').trim().toLowerCase()
  if (!section) return false
  return selected.some((s) => String(s).trim().toLowerCase() === section)
}

function isSectionBasedPosition(position) {
  if (position?.is_section_based === true) return true
  return /represent/i.test(String(position?.title || ''))
}

function sameSection(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()
}

module.exports = {
  normalizeAudienceSections,
  studentInAudience,
  isSectionBasedPosition,
  sameSection,
}
