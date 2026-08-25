/**
 * Election voting-window helpers.
 *
 * The admin form uses <input type="date">, which submits a bare "YYYY-MM-DD".
 * Passed straight to Mongoose that becomes midnight UTC, so a one-day election
 * ends the same instant it starts — a zero-length window nobody can vote in.
 *
 * Date-only values are therefore read in server-local time and widened to cover
 * the whole day: the start date opens at 00:00:00.000, the end date closes at
 * 23:59:59.999. Values that already carry a time (a full ISO string, a Date)
 * are left exactly as given.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/**
 * @param {unknown} value  raw start_date/end_date from the request body
 * @param {'start'|'end'} edge  which end of the window this value is
 */
function normalizeWindowDate(value, edge) {
  if (typeof value !== 'string' || !DATE_ONLY.test(value)) return value
  const [year, month, day] = value.split('-').map(Number)
  return edge === 'end'
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0)
}

/**
 * @returns {string|null} an error message, or null when the window is usable
 */
function validateWindow(start, end) {
  const from = new Date(start)
  const to = new Date(end)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return 'Start date and end date must be valid dates'
  }
  if (to <= from) {
    return 'End date must be after the start date'
  }
  return null
}

module.exports = { normalizeWindowDate, validateWindow }
