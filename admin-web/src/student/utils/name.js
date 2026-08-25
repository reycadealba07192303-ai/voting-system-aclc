/**
 * Student records come from an admin import, so names arrive in two shapes:
 * "ALCIDO, JOHN PAUL" (surname first) and "John Paul Alcido". Splitting on
 * whitespace alone turns the first one into "ALCIDO," — hence the comma check.
 */
function parts(name) {
  const raw = String(name || '').trim()
  if (!raw) return []
  const comma = raw.indexOf(',')
  if (comma > -1) {
    const surname = raw.slice(0, comma).trim()
    const given = raw.slice(comma + 1).trim()
    return given ? [...given.split(/\s+/), surname] : [surname]
  }
  return raw.split(/\s+/)
}

/** Title-cased given name, safe to drop into a greeting. */
export function firstNameOf(name, fallback = 'Student') {
  const first = parts(name)[0]
  if (!first) return fallback
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
}

/** Up to two initials — given name first, then surname. */
export function initialsOf(name, fallback = 'S') {
  const list = parts(name)
  if (!list.length) return fallback
  const picked = list.length > 1 ? [list[0], list[list.length - 1]] : [list[0]]
  return picked.map((w) => w[0] || '').join('').toUpperCase() || fallback
}
