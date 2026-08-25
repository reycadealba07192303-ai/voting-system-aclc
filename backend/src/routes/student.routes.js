const router = require('express').Router()
const bcrypt = require('bcrypt')
const multer = require('multer')
const XLSX = require('xlsx')
const Student = require('../models/Student')
const Vote = require('../models/Vote')
const { adminOnly } = require('../middleware/auth')
const { logAction } = require('../utils/audit')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
})

// GET all students (with optional search)
router.get('/', adminOnly, async (req, res) => {
  try {
    const { search } = req.query
    const filter = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { student_id: { $regex: search, $options: 'i' } },
            { section: { $regex: search, $options: 'i' } },
          ],
        }
      : {}
    const students = await Student.find(filter)
      .select('-password_hash')
      .sort({ name: 1 })
    res.json(students)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET distinct sections grouped by year level (for election audience picker)
router.get('/sections-by-level', adminOnly, async (req, res) => {
  try {
    const rows = await Student.aggregate([
      {
        $match: {
          section: { $exists: true, $nin: [null, ''] },
          level: { $exists: true, $nin: [null, ''] },
        },
      },
      {
        $group: {
          _id: { level: '$level', section: '$section' },
        },
      },
      { $sort: { '_id.section': 1 } },
    ])
    const byLevel = {}
    for (const row of rows) {
      const level = row._id.level
      const section = String(row._id.section || '').trim()
      if (!level || !section) continue
      if (!byLevel[level]) byLevel[level] = []
      if (!byLevel[level].includes(section)) byLevel[level].push(section)
    }
    res.json(byLevel)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST create student (no password — student creates it in the app)
router.post('/', adminOnly, async (req, res) => {
  try {
    const { student_id, name, section, level } = req.body
    if (!student_id || !name) {
      return res.status(400).json({ message: 'student_id and name are required' })
    }
    const { isValidLevel } = require('../constants/levels')
    if (level && !isValidLevel(level)) {
      return res.status(400).json({ message: 'Invalid student level' })
    }
    const existing = await Student.findOne({ student_id })
    if (existing) {
      const sameSection =
        (existing.section || '').trim().toLowerCase() ===
        (section || '').trim().toLowerCase()
      return res.status(409).json({
        message: sameSection
          ? `Student ID ${student_id} already exists in section "${existing.section || '—'}".`
          : `Student ID ${student_id} (${existing.name}) is already enrolled in section "${existing.section || '—'}". Cannot add to "${section || '—'}".`,
        code: 'DUPLICATE_STUDENT',
        existing: {
          student_id: existing.student_id,
          name: existing.name,
          section: existing.section,
        },
      })
    }

    const student = await Student.create({
      student_id,
      name,
      section,
      level: level || null,
      password_hash: null,
    })
    await logAction(req.user.id, 'create_student', `Added student: ${name} (${student_id})`)
    res.status(201).json({
      _id: student._id,
      student_id: student.student_id,
      name: student.name,
      section: student.section,
      level: student.level,
      has_voted: student.has_voted,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PUT update student
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const { name, section, password, level } = req.body
    const updates = {}
    if (name) updates.name = name
    if (section !== undefined) updates.section = section
    if (level !== undefined) {
      const { isValidLevel } = require('../constants/levels')
      if (level && !isValidLevel(level)) {
        return res.status(400).json({ message: 'Invalid student level' })
      }
      updates.level = level || null
    }
    if (password) updates.password_hash = await bcrypt.hash(password, 12)

    const student = await Student.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true }).select('-password_hash')
    if (!student) return res.status(404).json({ message: 'Student not found' })
    await logAction(req.user.id, 'update_student', `Updated student: ${student.name}`)
    res.json(student)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// DELETE student
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id)
    if (!student) return res.status(404).json({ message: 'Student not found' })
    await logAction(req.user.id, 'delete_student', `Deleted student: ${student.name}`)
    res.json({ message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PATCH clear password — student must create a new one in the app
router.patch('/:id/reset-password', adminOnly, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
    if (!student) return res.status(404).json({ message: 'Student not found' })
    student.password_hash = null
    await student.save({ validateModifiedOnly: true })
    await logAction(req.user.id, 'reset_password', `Cleared password for student: ${student.name}`)
    res.json({
      message: 'Password cleared. Student must create a new password in the app.',
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

/**
 * GET /api/students/:id/ballot
 * View-only: which candidates this student voted for.
 * Unlocks only after the related election(s) are closed.
 */
router.get('/:id/ballot', adminOnly, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).select('-password_hash')
    if (!student) return res.status(404).json({ message: 'Student not found' })

    const votes = await Vote.find({ student_id: student._id })
      .populate('election_id', 'title status')
      .populate('position_id', 'title')
      .populate('candidate_id', 'name partylist photo_url')
      .sort({ timestamp: 1 })

    if (!votes.length) {
      return res.status(404).json({ message: 'This student has no recorded votes' })
    }

    const byElection = new Map()
    for (const v of votes) {
      const election = v.election_id
      if (!election?._id) continue
      const eid = election._id.toString()
      if (!byElection.has(eid)) {
        byElection.set(eid, {
          election: {
            _id: election._id,
            title: election.title,
            status: election.status,
          },
          votes: [],
        })
      }
      byElection.get(eid).votes.push({
        position: v.position_id
          ? { _id: v.position_id._id, title: v.position_id.title }
          : null,
        candidate: v.is_abstain
          ? null
          : v.candidate_id
            ? {
                _id: v.candidate_id._id,
                name: v.candidate_id.name,
                partylist: v.candidate_id.partylist,
                photo_url: v.candidate_id.photo_url,
              }
            : null,
        is_abstain: !!v.is_abstain,
        timestamp: v.timestamp,
      })
    }

    const elections = [...byElection.values()]
    const closed = elections.filter((e) => e.election.status === 'closed')
    const openOrDraft = elections.filter((e) => e.election.status !== 'closed')

    if (!closed.length) {
      return res.status(403).json({
        locked: true,
        message: 'Ballot view unlocks only after the voting session has ended.',
        pending_elections: openOrDraft.map((e) => ({
          _id: e.election._id,
          title: e.election.title,
          status: e.election.status,
        })),
      })
    }

    await logAction(
      req.user.id,
      'view_ballot',
      `Viewed ballot for ${student.name} (${student.student_id})`
    )

    res.json({
      student: {
        _id: student._id,
        student_id: student.student_id,
        name: student.name,
        section: student.section,
      },
      elections: closed,
      view_only: true,
    })
  } catch (err) {
    res.status(500).json({ message: 'Could not load ballot' })
  }
})

function isExcelFile(file) {
  const name = (file.originalname || '').toLowerCase()
  const mime = (file.mimetype || '').toLowerCase()
  return (
    name.endsWith('.xlsx') ||
    name.endsWith('.xls') ||
    mime.includes('spreadsheet') ||
    mime.includes('excel') ||
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mime === 'application/vnd.ms-excel'
  )
}

function looksLikeBinaryGarbage(value) {
  if (!value) return true
  // Reject control chars / ZIP/XML leftovers from reading xlsx as text
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(value)) return true
  if (/PK\x03\x04|docProps\/|_rels\/|xl\/worksheets|\[Content_Types\]/i.test(value)) return true
  return false
}

function isValidStudentId(id) {
  if (!id || id.length > 64) return false
  if (looksLikeBinaryGarbage(id)) return false
  // Allow typical school IDs: letters, digits, hyphen, underscore, slash, period
  return /^[A-Za-z0-9][A-Za-z0-9\-_/.\s]{0,62}$/.test(id)
}

function normalizeHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

function pickField(row, keys) {
  for (const key of keys) {
    if (row[key] != null && String(row[key]).trim() !== '') {
      return String(row[key]).trim()
    }
  }
  return ''
}

function parseCsv(buffer) {
  // Reject obvious xlsx/zip masquerading as csv
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
    throw new Error('This looks like an Excel file. Upload .xlsx directly, or save as CSV.')
  }

  const content = buffer.toString('utf-8').replace(/^\uFEFF/, '')
  const lines = content.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length === 0) return []

  const first = lines[0].toLowerCase()
  const hasHeader = first.includes('student_id') || first.includes('student id')
  const dataLines = hasHeader ? lines.slice(1) : lines

  return dataLines.map((line) => {
    // Simple CSV split that respects quoted fields
    const cols = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (ch === ',' && !inQuotes) {
        cols.push(cur.trim())
        cur = ''
      } else {
        cur += ch
      }
    }
    cols.push(cur.trim())

    return {
      student_id: (cols[0] || '').replace(/^"|"$/g, ''),
      name: (cols[1] || '').replace(/^"|"$/g, ''),
      section: (cols[2] || '').replace(/^"|"$/g, ''),
    }
  })
}

function mapExcelRow(row, fallbackSection = '') {
  const normalized = {}
  for (const [k, v] of Object.entries(row)) {
    normalized[normalizeHeader(k)] = v
  }
  const student_id = pickField(normalized, [
    'student_id',
    'studentid',
    'id',
    'lrn',
  ])
  const name = pickField(normalized, [
    'name',
    'full_name',
    'fullname',
    'student_name',
  ])
  let section = pickField(normalized, [
    'section',
    'class',
    'strand',
    'grade_section',
  ])
  const levelRaw = pickField(normalized, [
    'level',
    'year_level',
    'grade_level',
    'audience',
  ])
  // If section column empty, use the sheet tab name (e.g. HERCULES / ATHENA / ZEUS)
  if (!section && fallbackSection) section = fallbackSection
  return { student_id, name, section, level: normalizeImportedLevel(levelRaw) }
}

function normalizeImportedLevel(raw) {
  if (!raw) return null
  const s = String(raw).trim().toLowerCase().replace(/[\s-]+/g, '_')
  const aliases = {
    grade_7: 'grade_7',
    g7: 'grade_7',
    grade7: 'grade_7',
    '7': 'grade_7',
    grade_8: 'grade_8',
    g8: 'grade_8',
    grade8: 'grade_8',
    '8': 'grade_8',
    grade_9: 'grade_9',
    g9: 'grade_9',
    grade9: 'grade_9',
    '9': 'grade_9',
    grade_10: 'grade_10',
    g10: 'grade_10',
    grade10: 'grade_10',
    '10': 'grade_10',
    junior_high: 'grade_7',
    jhs: 'grade_7',
    juniorhigh: 'grade_7',
    grade_11: 'grade_11',
    g11: 'grade_11',
    grade11: 'grade_11',
    '11': 'grade_11',
    grade_12: 'grade_12',
    g12: 'grade_12',
    grade12: 'grade_12',
    '12': 'grade_12',
    college_1: 'college_1',
    college1: 'college_1',
    '1st_year': 'college_1',
    first_year: 'college_1',
    year_1: 'college_1',
    college_2: 'college_2',
    college2: 'college_2',
    '2nd_year': 'college_2',
    second_year: 'college_2',
    year_2: 'college_2',
    college_3: 'college_3',
    college3: 'college_3',
    '3rd_year': 'college_3',
    third_year: 'college_3',
    year_3: 'college_3',
    college_4: 'college_4',
    college4: 'college_4',
    '4th_year': 'college_4',
    fourth_year: 'college_4',
    year_4: 'college_4',
    college_5: 'college_5',
    college5: 'college_5',
    '5th_year': 'college_5',
    fifth_year: 'college_5',
    year_5: 'college_5',
    architecture: 'college_5',
    archi: 'college_5',
    college: 'college_1',
    tertiary: 'college_1',
  }
  return aliases[s] || null
}

function parseExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false })
  if (!workbook.SheetNames.length) return []

  const allRows = []

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const rawRows = XLSX.utils.sheet_to_json(sheet, {
      defval: '',
      raw: false,
    })
    if (!rawRows.length) continue

    // Sheet tab name as section fallback (HERCULES, ATHENA, ZEUS, …)
    const fallbackSection = String(sheetName || '').trim()

    for (const row of rawRows) {
      allRows.push(mapExcelRow(row, fallbackSection))
    }
  }

  return allRows
}

function parseImportFile(file) {
  if (isExcelFile(file)) return parseExcel(file.buffer)
  return parseCsv(file.buffer)
}

// POST import students from CSV or Excel (.xlsx / .xls)
router.post('/import', adminOnly, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' })

    const forcedSection = (req.body.section || '').trim()
    const forcedLevel = normalizeImportedLevel(req.body.level || '')
    let rows
    try {
      rows = parseImportFile(req.file)
    } catch (parseErr) {
      return res.status(400).json({ message: parseErr.message || 'Could not read file' })
    }

    if (!rows.length) {
      return res.status(400).json({
        message: 'No data rows found. Check that the sheet has student_id and name columns.',
      })
    }

    let imported = 0
    let skipped = 0
    const errors = []
    const duplicates = []

    for (const row of rows) {
      let student_id = (row.student_id || '').trim()
      let name = (row.name || '').trim()
      let section = forcedSection || (row.section || '').trim()
      const level = forcedLevel || row.level || null

      if (!student_id && !name) {
        skipped++
        continue
      }

      if (!isValidStudentId(student_id) || !name || looksLikeBinaryGarbage(name)) {
        skipped++
        errors.push(`Skipped invalid row: "${student_id}" / "${name}"`)
        continue
      }

      if (!section) {
        skipped++
        errors.push(`Skipped ${student_id}: missing section`)
        continue
      }

      if (looksLikeBinaryGarbage(section) || section.length > 80) {
        skipped++
        errors.push(`Skipped ${student_id}: invalid section`)
        continue
      }

      try {
        const exists = await Student.findOne({ student_id })
        if (exists) {
          skipped++
          const sameSection =
            (exists.section || '').trim().toLowerCase() === section.trim().toLowerCase()
          duplicates.push({
            student_id,
            name: exists.name,
            existing_section: exists.section || '—',
            attempted_section: section,
            same_section: sameSection,
            message: sameSection
              ? `${student_id} (${exists.name}) already exists in "${exists.section || '—'}".`
              : `${student_id} (${exists.name}) is already in "${exists.section || '—'}" — cannot add to "${section}".`,
          })
          continue
        }

        await Student.create({
          student_id,
          name,
          section,
          level,
          password_hash: null,
        })
        imported++
      } catch (e) {
        errors.push(`Row skipped: ${student_id} — ${e.message}`)
      }
    }

    if (imported === 0 && duplicates.length > 0 && errors.length === 0) {
      return res.status(409).json({
        message: `${duplicates.length} student(s) already exist and were not imported.`,
        imported,
        skipped,
        duplicates: duplicates.slice(0, 30),
        errors: [],
      })
    }

    if (imported === 0 && errors.length > 0) {
      return res.status(400).json({
        message:
          'No students imported. Use a .csv or .xlsx with columns student_id, name, section.',
        imported,
        skipped,
        duplicates: duplicates.slice(0, 30),
        errors: errors.slice(0, 10),
      })
    }

    await logAction(
      req.user.id,
      'import_students',
      `Imported ${imported} students${forcedSection ? ` into ${forcedSection}` : ''}`
    )
    res.json({
      imported,
      skipped,
      duplicates: duplicates.slice(0, 30),
      errors: errors.slice(0, 20),
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
