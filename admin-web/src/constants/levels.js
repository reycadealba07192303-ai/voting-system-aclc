/** Audience / year levels — keep in sync with backend/src/constants/levels.js */

export const ELECTION_LEVELS = [
  { id: 'grade_7', label: 'Grade 7' },
  { id: 'grade_8', label: 'Grade 8' },
  { id: 'grade_9', label: 'Grade 9' },
  { id: 'grade_10', label: 'Grade 10' },
  { id: 'grade_11', label: 'Grade 11' },
  { id: 'grade_12', label: 'Grade 12' },
  { id: 'college_1', label: 'College — 1st Year' },
  { id: 'college_2', label: 'College — 2nd Year' },
  { id: 'college_3', label: 'College — 3rd Year' },
  { id: 'college_4', label: 'College — 4th Year' },
  { id: 'college_5', label: 'College — 5th Year' },
]

export function labelForLevel(id) {
  if (id === 'junior_high') return 'Junior High'
  if (id === 'college') return 'College'
  return ELECTION_LEVELS.find((l) => l.id === id)?.label || id
}
