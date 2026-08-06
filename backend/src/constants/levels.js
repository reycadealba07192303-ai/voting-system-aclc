/** Audience / year levels for elections and students. */

const COLLEGE_YEARS = [
  { id: 'college_1', label: 'College — 1st Year' },
  { id: 'college_2', label: 'College — 2nd Year' },
  { id: 'college_3', label: 'College — 3rd Year' },
  { id: 'college_4', label: 'College — 4th Year' },
  { id: 'college_5', label: 'College — 5th Year' },
]

const ELECTION_LEVELS = [
  { id: 'grade_7', label: 'Grade 7' },
  { id: 'grade_8', label: 'Grade 8' },
  { id: 'grade_9', label: 'Grade 9' },
  { id: 'grade_10', label: 'Grade 10' },
  { id: 'grade_11', label: 'Grade 11' },
  { id: 'grade_12', label: 'Grade 12' },
  ...COLLEGE_YEARS,
]

/** Legacy ids kept for older records. */
const LEGACY_LEVELS = {
  junior_high: ['grade_7', 'grade_8', 'grade_9', 'grade_10'],
  college: ['college_1', 'college_2', 'college_3', 'college_4', 'college_5'],
}

const COLLEGE_YEAR_IDS = COLLEGE_YEARS.map((l) => l.id)

const LEVEL_IDS = [
  ...ELECTION_LEVELS.map((l) => l.id),
  ...Object.keys(LEGACY_LEVELS),
]

function isValidLevel(level) {
  return LEVEL_IDS.includes(level)
}

function normalizeLevels(input) {
  if (!Array.isArray(input)) return []
  const unique = [...new Set(input.map((v) => String(v).trim()).filter(Boolean))]
  return unique.filter(isValidLevel)
}

function labelForLevel(id) {
  if (id === 'junior_high') return 'Junior High'
  if (id === 'college') return 'College'
  return ELECTION_LEVELS.find((l) => l.id === id)?.label || id
}

function expandAudienceLevels(audienceLevels) {
  const levels = Array.isArray(audienceLevels) ? audienceLevels : []
  const out = new Set()
  for (const l of levels) {
    if (LEGACY_LEVELS[l]) {
      LEGACY_LEVELS[l].forEach((y) => out.add(y))
      out.add(l)
    } else {
      out.add(l)
    }
  }
  return out
}

/**
 * Student may access an election if their level is in audience_levels.
 * Empty audience_levels = legacy elections → allow all (backward compatible).
 */
function studentCanAccessElection(studentLevel, audienceLevels) {
  const levels = Array.isArray(audienceLevels) ? audienceLevels : []
  if (levels.length === 0) return true
  if (!studentLevel) return false

  const allowed = expandAudienceLevels(levels)

  if (LEGACY_LEVELS[studentLevel]) {
    return LEGACY_LEVELS[studentLevel].some((y) => allowed.has(y)) || allowed.has(studentLevel)
  }

  return allowed.has(studentLevel)
}

module.exports = {
  ELECTION_LEVELS,
  COLLEGE_YEARS,
  COLLEGE_YEAR_IDS,
  LEVEL_IDS,
  isValidLevel,
  normalizeLevels,
  labelForLevel,
  studentCanAccessElection,
}
