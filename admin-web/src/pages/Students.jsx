import { useEffect, useState, useRef, useMemo } from 'react'
import {
  Plus, Pencil, Trash2, KeyRound, Search, Eye,
  Users, FolderPlus, FileSpreadsheet, Info, Layers,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getStudents, createStudent, updateStudent, deleteStudent,
  resetStudentPassword, importStudents, getStudentBallot,
} from '../api/students'
import PageHeader from '../components/ui/PageHeader'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import SelectDropdown from '../components/ui/SelectDropdown'
import { ELECTION_LEVELS, labelForLevel } from '../constants/levels'

const EMPTY_STUDENT = { student_id: '', name: '', section: '', password: '', level: '' }
const labelCls = 'block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2'
const UNASSIGNED = '__unassigned__'
const COLORS = [
  ['rgba(35,51,180,0.18)', '#93c5fd'],
  ['rgba(255,75,58,0.18)', '#fca5a5'],
  ['rgba(6,182,212,0.18)',  '#67e8f9'],
  ['rgba(16,185,129,0.18)', '#6ee7b7'],
  ['rgba(245,158,11,0.18)', '#fcd34d'],
  ['rgba(239,68,68,0.18)',  '#fca5a5'],
]

const levelKey = (s) => s.level || UNASSIGNED
const sectionKey = (s) => s.section?.trim() || 'No Section'

export default function Students() {
  const [students, setStudents]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [activeLevel, setActiveLevel]   = useState(null)   // level id | UNASSIGNED | null
  const [activeSection, setActiveSection] = useState(null) // section name | null
  const [lvlModal, setLvlModal]         = useState(false)
  const [newLevel, setNewLevel]         = useState('')
  const [pendingLevels, setPendingLevels] = useState([])   // level ids with 0 sections yet
  const [secModal, setSecModal]         = useState(false)
  const [secName, setSecName]           = useState('')
  const [secLevel, setSecLevel]         = useState('')     // level when adding a section
  // Sections that exist but have 0 students yet: [{ section, level }]
  const [pendingSections, setPending]   = useState([])
  const [stuModal, setStuModal]         = useState(false)
  const [editingStu, setEditingStu]     = useState(null)
  const [stuSection, setStuSection]     = useState('')
  const [stuLevel, setStuLevel]         = useState('')     // inherited from level context
  const EMPTY_ROW = () => ({ id: Date.now() + Math.random(), student_id: '', name: '' })
  const [bulkRows, setBulkRows]         = useState([EMPTY_ROW()])
  const [stuForm, setStuForm]           = useState(EMPTY_STUDENT)
  const [savingStu, setSavingStu]       = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [ballotOpen, setBallotOpen]       = useState(false)
  const [ballotLoading, setBallotLoading] = useState(false)
  const [ballotData, setBallotData]       = useState(null)
  const [importingGlobal, setImportingGlobal]   = useState(false)
  const [importingLevel, setImportingLevel]     = useState(false)
  const [importingSection, setImportingSection] = useState(null)
  const [csvGuide, setCsvGuide]         = useState(false)
  const globalFileRef = useRef()
  const levelFileRef  = useRef()

  const load = () => {
    setLoading(true)
    getStudents()
      .then((r) => setStudents(r.data))
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  /** levelId → { sections: Map<sectionName, students[]> } */
  const levelsTree = useMemo(() => {
    const tree = {}
    const ensure = (lv) => {
      if (!tree[lv]) tree[lv] = { sections: {} }
      return tree[lv]
    }

    students.forEach((s) => {
      const lv = levelKey(s)
      const sec = sectionKey(s)
      const node = ensure(lv)
      if (!node.sections[sec]) node.sections[sec] = []
      node.sections[sec].push(s)
    })

    pendingLevels.forEach((lv) => ensure(lv))

    pendingSections.forEach(({ section, level }) => {
      const node = ensure(level || UNASSIGNED)
      if (!node.sections[section]) node.sections[section] = []
    })

    return tree
  }, [students, pendingLevels, pendingSections])

  const levelList = useMemo(() => {
    const ids = Object.keys(levelsTree)
    const known = ELECTION_LEVELS.map((l) => l.id).filter((id) => ids.includes(id))
    const rest = ids.filter((id) => !known.includes(id) && id !== UNASSIGNED)
    const ordered = [...known, ...rest.sort()]
    if (ids.includes(UNASSIGNED)) ordered.push(UNASSIGNED)
    return ordered
  }, [levelsTree])

  const filteredFlat = useMemo(() => {
    if (!search) return []
    const q = search.toLowerCase()
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.student_id.includes(q) ||
        s.section?.toLowerCase().includes(q) ||
        (s.level && labelForLevel(s.level).toLowerCase().includes(q))
    )
  }, [students, search])

  const levelLabel = (id) =>
    id === UNASSIGNED ? 'No Level' : labelForLevel(id)

  const countInLevel = (lv) => {
    const secs = levelsTree[lv]?.sections || {}
    return Object.values(secs).reduce((n, arr) => n + arr.length, 0)
  }

  const sectionsForLevel = (lv) => {
    const secs = levelsTree[lv]?.sections || {}
    return Object.entries(secs).sort(([a], [b]) => a.localeCompare(b))
  }

  /* ── Add Level ── */
  const handleAddLevel = (e) => {
    e.preventDefault()
    if (!newLevel) {
      toast.error('Select a year level')
      return
    }
    setPendingLevels((prev) => (prev.includes(newLevel) ? prev : [...prev, newLevel]))
    setLvlModal(false)
    setNewLevel('')
    setActiveLevel(newLevel)
    setActiveSection(null)
    toast.success(`${labelForLevel(newLevel)} added — now add sections`)
  }

  /* ── Add section under a level ── */
  const openAddSection = (levelId) => {
    if (!levelId || levelId === UNASSIGNED) {
      toast.error('Add a year level first')
      return
    }
    setSecLevel(levelId)
    setSecName('')
    setSecModal(true)
  }

  const handleAddSection = (e) => {
    e.preventDefault()
    if (!secName.trim()) return
    if (!secLevel) {
      toast.error('Select a year level first')
      return
    }
    const name = secName.trim()
    setPending((prev) =>
      prev.some((p) => p.section === name && p.level === secLevel)
        ? prev
        : [...prev, { section: name, level: secLevel }]
    )
    setPendingLevels((prev) => prev.filter((l) => l !== secLevel))
    setSecModal(false)
    setSecName('')
    setActiveLevel(secLevel)
    setActiveSection(null)
  }

  const clearPending = (section, level) => {
    setPending((prev) => prev.filter((p) => !(p.section === section && p.level === level)))
  }

  /* ── Open Add Students / Edit ── */
  const openStuModal = (section, level, student = null) => {
    setStuSection(section)
    setStuLevel(level === UNASSIGNED ? '' : level)
    setEditingStu(student)
    if (student) {
      setStuForm({
        student_id: student.student_id,
        name: student.name,
        section: student.section || section,
        password: '',
        level: student.level || level || '',
      })
    } else {
      setBulkRows([{ id: Date.now(), student_id: '', name: '' }])
    }
    setStuModal(true)
  }

  const updateRow = (id, field, value) =>
    setBulkRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))

  const addRow = () =>
    setBulkRows((prev) => [...prev, { id: Date.now() + Math.random(), student_id: '', name: '' }])

  const removeRow = (id) =>
    setBulkRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev))

  const handleStuSave = async (e) => {
    e.preventDefault()
    setSavingStu(true)
    try {
      if (editingStu) {
        const payload = { ...stuForm }
        if (!payload.password) delete payload.password
        payload.level = payload.level || null
        await updateStudent(editingStu._id, payload)
        toast.success('Student updated')
      } else {
        if (!stuLevel) {
          toast.error('This section needs a year level. Go back and add a level first.')
          setSavingStu(false)
          return
        }
        const valid = bulkRows.filter((r) => r.student_id.trim() && r.name.trim())
        if (valid.length === 0) {
          toast.error('Add at least one student with ID and name.')
          setSavingStu(false)
          return
        }
        let added = 0
        const conflictMsgs = []
        for (const row of valid) {
          try {
            await createStudent({
              student_id: row.student_id.trim(),
              name: row.name.trim(),
              section: stuSection,
              level: stuLevel || null,
            })
            added++
          } catch (err) {
            conflictMsgs.push(
              err.response?.data?.message || `${row.student_id.trim()} already exists`
            )
          }
        }
        if (added > 0) toast.success(`Added ${added} student${added !== 1 ? 's' : ''}`)
        if (conflictMsgs.length > 0) {
          conflictMsgs.slice(0, 3).forEach((msg) => toast.error(msg, { duration: 5000 }))
          if (conflictMsgs.length > 3) {
            toast.error(`…and ${conflictMsgs.length - 3} more duplicate(s)`, { duration: 4000 })
          }
        }
        if (added === 0 && conflictMsgs.length === 0) toast.error('No students added')
      }
      setStuModal(false)
      clearPending(stuSection, stuLevel)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
    } finally {
      setSavingStu(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteStudent(id)
      toast.success('Student deleted')
      load()
    } catch {
      toast.error('Delete failed')
    }
  }

  const handleDeleteSection = async (section, level) => {
    const inSection = students.filter(
      (s) => sectionKey(s) === section && levelKey(s) === (level || UNASSIGNED)
    )
    try {
      await Promise.all(inSection.map((s) => deleteStudent(s._id)))
      setPending((prev) => prev.filter((p) => !(p.section === section && p.level === level)))
      if (activeSection === section) setActiveSection(null)
      toast.success(
        `Section "${section}" deleted${
          inSection.length > 0
            ? ` with ${inSection.length} student${inSection.length !== 1 ? 's' : ''}`
            : ''
        }`
      )
      load()
    } catch {
      toast.error('Failed to delete section')
    }
  }

  const handleDeleteLevel = async (level) => {
    const inLevel = students.filter((s) => levelKey(s) === level)
    try {
      await Promise.all(inLevel.map((s) => deleteStudent(s._id)))
      setPendingLevels((prev) => prev.filter((l) => l !== level))
      setPending((prev) => prev.filter((p) => p.level !== level))
      if (activeLevel === level) {
        setActiveLevel(null)
        setActiveSection(null)
      }
      toast.success(
        `${levelLabel(level)} deleted${
          inLevel.length > 0
            ? ` with ${inLevel.length} student${inLevel.length !== 1 ? 's' : ''}`
            : ''
        }`
      )
      load()
    } catch {
      toast.error('Failed to delete level')
    }
  }

  const handleReset = async (id) => {
    try {
      const res = await resetStudentPassword(id)
      toast.success(res.data.message || 'Password cleared. Student must create a new one in the app.')
    } catch {
      toast.error('Reset failed')
    }
  }

  const handleViewBallot = async (student) => {
    if (!student?.has_voted) {
      toast.error('This student has not voted yet')
      return
    }
    setBallotOpen(true)
    setBallotLoading(true)
    setBallotData(null)
    try {
      const res = await getStudentBallot(student._id)
      setBallotData(res.data)
    } catch (err) {
      setBallotOpen(false)
      toast.error(err.response?.data?.message || 'Could not load ballot')
    } finally {
      setBallotLoading(false)
    }
  }

  const showImportResult = (res, sectionLabel) => {
    const n = res.data.imported || 0
    const duplicates = res.data.duplicates || []
    if (n > 0) {
      toast.success(
        sectionLabel
          ? `Imported ${n} students into ${sectionLabel}`
          : `Imported ${n} students`
      )
    }
    if (duplicates.length > 0) {
      const cross = duplicates.filter((d) => !d.same_section)
      const same = duplicates.filter((d) => d.same_section)
      if (cross.length > 0) {
        cross.slice(0, 3).forEach((d) => toast.error(d.message, { duration: 6000 }))
        if (cross.length > 3) {
          toast.error(`…and ${cross.length - 3} more already in another section`, {
            duration: 5000,
          })
        }
      }
      if (same.length > 0 && cross.length === 0) {
        toast.error(
          `${same.length} student(s) already exist in this section and were skipped.`,
          { duration: 5000 }
        )
      } else if (same.length > 0) {
        toast.error(`${same.length} already in the same section (skipped).`, {
          duration: 4000,
        })
      }
    }
    if (n === 0 && duplicates.length === 0) {
      toast.error(res.data.message || 'No students imported. Check file format.')
    }
  }

  const handleGlobalImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImportingGlobal(true)
    try {
      const res = await importStudents(file)
      showImportResult(res)
      load()
    } catch (err) {
      const data = err.response?.data
      if (data?.duplicates?.length) {
        showImportResult({
          data: { imported: 0, duplicates: data.duplicates, message: data.message },
        })
      } else {
        toast.error(data?.message || 'Import failed')
      }
      load()
    } finally {
      setImportingGlobal(false)
      e.target.value = ''
    }
  }

  /* ── Import into a level (section column required; level auto-filled) ── */
  const handleLevelImport = async (e, level) => {
    const file = e.target.files[0]
    if (!file) return
    const lv = level === UNASSIGNED ? null : level
    if (!lv) {
      toast.error('Cannot import into No Level — add a year level first')
      e.target.value = ''
      return
    }
    setImportingLevel(true)
    try {
      const res = await importStudents(file, null, lv)
      showImportResult(res, levelLabel(lv))
      setPendingLevels((prev) => prev.filter((l) => l !== lv))
      load()
    } catch (err) {
      const data = err.response?.data
      if (data?.duplicates?.length) {
        showImportResult(
          { data: { imported: 0, duplicates: data.duplicates, message: data.message } },
          levelLabel(lv)
        )
      } else {
        toast.error(data?.message || 'Import failed')
      }
      load()
    } finally {
      setImportingLevel(false)
      e.target.value = ''
    }
  }

  const handleSectionImport = async (e, section, level) => {
    const file = e.target.files[0]
    if (!file) return
    setImportingSection(section)
    const lv = level === UNASSIGNED ? null : level
    try {
      const res = await importStudents(file, section, lv)
      showImportResult(res, section)
      clearPending(section, lv)
      load()
    } catch (err) {
      const data = err.response?.data
      if (data?.duplicates?.length) {
        showImportResult(
          { data: { imported: 0, duplicates: data.duplicates, message: data.message } },
          section
        )
      } else {
        toast.error(data?.message || 'Import failed')
      }
      load()
    } finally {
      setImportingSection(null)
      e.target.value = ''
    }
  }

  const isSearching = search.trim().length > 0
  const availableLevelsToAdd = ELECTION_LEVELS.filter((l) => !levelList.includes(l.id))

  const renderModals = () => (
    <>
      {/* Add Level Modal */}
      <Modal open={lvlModal} onClose={() => setLvlModal(false)} title="Add Year Level" size="sm">
        <form onSubmit={handleAddLevel} className="space-y-4">
          <div>
            <label className={labelCls}>Year Level</label>
            <SelectDropdown
              options={[
                { value: '', label: 'Select level…' },
                ...availableLevelsToAdd.map((lv) => ({ value: lv.id, label: lv.label })),
              ]}
              value={newLevel}
              onChange={setNewLevel}
              placeholder="Select level…"
              minWidth={200}
              className="w-full"
            />
            <p className="text-xs text-slate-600 mt-1.5">
              Add a level first, then create sections under it.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setLvlModal(false)} className="btn-ghost" style={{ padding: '9px 16px' }}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ padding: '9px 16px' }} disabled={!newLevel || availableLevelsToAdd.length === 0}>
              Add Level
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Section Modal */}
      <Modal open={secModal} onClose={() => setSecModal(false)} title="Add Section" size="sm">
        <form onSubmit={handleAddSection} className="space-y-4">
          <div>
            <label className={labelCls}>Year Level</label>
            <input
              disabled
              className="input-dark disabled:opacity-60"
              value={secLevel ? labelForLevel(secLevel) : ''}
            />
          </div>
          <div>
            <label className={labelCls}>Section Name</label>
            <input
              required
              autoFocus
              value={secName}
              onChange={(e) => setSecName(e.target.value)}
              className="input-dark"
              placeholder="e.g. STEM A, ABM 1, BSIT 2B"
            />
            <p className="text-xs text-slate-600 mt-1.5">
              The section will appear under {secLevel ? labelForLevel(secLevel) : 'this level'}.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setSecModal(false)} className="btn-ghost" style={{ padding: '9px 16px' }}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ padding: '9px 16px' }}>Create Section</button>
          </div>
        </form>
      </Modal>

      {/* Add Students / Edit */}
      <Modal
        open={stuModal}
        onClose={() => setStuModal(false)}
        title={
          editingStu
            ? 'Edit Student'
            : `Add Students — ${stuSection}${stuLevel ? ` · ${labelForLevel(stuLevel)}` : ''}`
        }
        size={editingStu ? 'md' : 'lg'}
      >
        <form onSubmit={handleStuSave} className="space-y-4">
          {editingStu ? (
            <>
              <div>
                <label className={labelCls}>Student ID</label>
                <input value={stuForm.student_id} disabled className="input-dark disabled:opacity-50" />
              </div>
              <div>
                <label className={labelCls}>Full Name</label>
                <input
                  required
                  value={stuForm.name}
                  onChange={(e) => setStuForm({ ...stuForm, name: e.target.value })}
                  className="input-dark"
                  placeholder="Juan Dela Cruz"
                />
              </div>
              <div>
                <label className={labelCls}>Section</label>
                <input
                  value={stuForm.section}
                  onChange={(e) => setStuForm({ ...stuForm, section: e.target.value })}
                  className="input-dark"
                />
              </div>
              <div>
                <label className={labelCls}>Year level</label>
                <SelectDropdown
                  options={[
                    { value: '', label: 'Select level…' },
                    ...ELECTION_LEVELS.map((lv) => ({ value: lv.id, label: lv.label })),
                  ]}
                  value={stuForm.level || ''}
                  onChange={(level) => setStuForm({ ...stuForm, level })}
                  placeholder="Select level…"
                  minWidth={200}
                  className="w-full"
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-slate-500">
                  Level: <span className="text-slate-300 font-medium">{stuLevel ? labelForLevel(stuLevel) : '—'}</span>
                  {' · '}No password here — students create their own in the app.
                </p>
                <span className="text-xs text-slate-600">
                  {bulkRows.length} row{bulkRows.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-[1fr_1.6fr_28px] gap-2 px-1">
                <p className={labelCls} style={{ marginBottom: 0 }}>Student ID</p>
                <p className={labelCls} style={{ marginBottom: 0 }}>Full Name</p>
                <span />
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {bulkRows.map((row) => (
                  <div key={row.id} className="grid grid-cols-[1fr_1.6fr_28px] gap-2 items-center">
                    <input
                      value={row.student_id}
                      onChange={(e) => updateRow(row.id, 'student_id', e.target.value)}
                      className="input-dark"
                      placeholder="2024-001"
                    />
                    <input
                      value={row.name}
                      onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                      className="input-dark"
                      placeholder="Juan Dela Cruz"
                    />
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      disabled={bulkRows.length === 1}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addRow}
                className="flex items-center gap-2 text-xs text-blue-300 hover:text-blue-200 transition-colors mt-1"
              >
                <Plus size={13} /> Add another row
              </button>
            </>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setStuModal(false)} className="btn-ghost" style={{ padding: '9px 16px' }}>Cancel</button>
            <button type="submit" disabled={savingStu} className="btn-primary" style={{ padding: '9px 16px' }}>
              {savingStu
                ? 'Saving…'
                : editingStu
                  ? 'Save Changes'
                  : `Add ${bulkRows.filter((r) => r.student_id.trim()).length || ''} Student${
                      bulkRows.filter((r) => r.student_id.trim()).length !== 1 ? 's' : ''
                    }`}
            </button>
          </div>
        </form>
      </Modal>

      {/* Import Format Guide */}
      <Modal open={csvGuide} onClose={() => setCsvGuide(false)} title="Import Format (CSV / Excel)" size="lg">
        <div className="space-y-5 text-sm">
          <div>
            <p className="text-white font-semibold mb-1">Import All — includes level, sections &amp; students</p>
            <p className="text-slate-400 text-xs mb-2">Use when importing across multiple levels/sections.</p>
            <div className="rounded-xl p-4" style={{ background: 'rgba(35,51,180,0.08)', border: '1px solid rgba(35,51,180,0.2)' }}>
              <pre className="text-blue-200 text-xs font-mono leading-relaxed">{`student_id,name,section,level\n2024-001,Juan Dela Cruz,STEM A,grade_12\n2024-002,Maria Santos,BS Arch 5A,college_5\n2024-003,Pedro Reyes,BSIT 2B,college_2`}</pre>
              <p className="text-[11px] text-slate-600 mt-2">
                Levels: <code className="text-slate-400">grade_7</code>–<code className="text-slate-400">grade_12</code>,
                {' '}<code className="text-slate-400">college_1</code>–<code className="text-slate-400">college_5</code>.
              </p>
            </div>
          </div>
          <div>
            <p className="text-white font-semibold mb-1">Import into a Level — level auto-filled</p>
            <p className="text-slate-400 text-xs mb-2">Use Import inside a level. Include a section column (or sheet tab names).</p>
            <div className="rounded-xl p-4" style={{ background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.2)' }}>
              <pre className="text-cyan-300 text-xs font-mono leading-relaxed">{`student_id,name,section\n2024-004,Ana Lim,STEM A\n2024-005,Jose Cruz,ABM 1`}</pre>
            </div>
          </div>
          <div>
            <p className="text-white font-semibold mb-1">Import into a Section — section &amp; level auto-filled</p>
            <p className="text-slate-400 text-xs mb-2">Use Import inside a section. Only 2 columns needed.</p>
            <div className="rounded-xl p-4" style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <pre className="text-emerald-300 text-xs font-mono leading-relaxed">{`student_id,name\n2024-004,Ana Lim\n2024-005,Jose Cruz`}</pre>
            </div>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <p className="text-yellow-400 text-xs font-semibold mb-1">Notes</p>
            <ul className="text-slate-400 text-xs space-y-1 list-disc list-inside">
              <li>Accepted files: <span className="font-mono text-yellow-300">.xlsx</span>, <span className="font-mono text-yellow-300">.xls</span>, or <span className="font-mono text-yellow-300">.csv</span></li>
              <li>Flow: add <span className="text-yellow-300">level</span> → add <span className="text-yellow-300">sections</span> → add/import students</li>
              <li>No passwords on import — students create their password in the mobile app</li>
              <li>Duplicate student IDs are skipped</li>
            </ul>
          </div>
          <div className="flex justify-end">
            <button onClick={() => setCsvGuide(false)} className="btn-primary" style={{ padding: '9px 20px' }}>Got it</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete?.type === 'level') handleDeleteLevel(confirmDelete.level)
          else if (confirmDelete?.type === 'section') {
            handleDeleteSection(confirmDelete.section, confirmDelete.level)
          } else handleDelete(confirmDelete)
        }}
        title={
          confirmDelete?.type === 'level'
            ? `Delete "${levelLabel(confirmDelete?.level)}"`
            : confirmDelete?.type === 'section'
              ? `Delete "${confirmDelete?.section}"`
              : 'Delete Student'
        }
        message={
          confirmDelete?.type === 'level'
            ? `This will permanently delete this level, its sections, and all ${countInLevel(confirmDelete?.level)} student(s) inside.`
            : confirmDelete?.type === 'section'
              ? `This will permanently delete the section and all ${
                  students.filter(
                    (s) =>
                      sectionKey(s) === confirmDelete?.section &&
                      levelKey(s) === (confirmDelete?.level || UNASSIGNED)
                  ).length
                } student(s) inside it.`
              : 'This will permanently delete the student account.'
        }
        danger
      />

      <Modal
        open={ballotOpen}
        onClose={() => { setBallotOpen(false); setBallotData(null) }}
        title="Student ballot"
        size="md"
      >
        {ballotLoading ? (
          <div className="flex items-center gap-3 text-slate-500 text-sm py-10 justify-center">
            <div className="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
            Loading ballot…
          </div>
        ) : ballotData ? (
          <div className="space-y-5">
            <div
              className="rounded-xl px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <p className="text-white text-sm font-semibold">{ballotData.student?.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                <span className="font-mono">{ballotData.student?.student_id}</span>
                {ballotData.student?.section ? ` · ${ballotData.student.section}` : ''}
                {ballotData.student?.level ? ` · ${labelForLevel(ballotData.student.level)}` : ''}
              </p>
              <p className="text-[11px] text-slate-600 mt-2">View only · unlocked after voting ended</p>
            </div>
            {(ballotData.elections || []).map((block) => (
              <div key={block.election._id}>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  {block.election.title}
                </p>
                <ul className="space-y-2">
                  {(block.votes || []).map((v, i) => (
                    <li
                      key={`${block.election._id}-${i}`}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div
                        className="w-9 h-9 rounded-lg overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold"
                        style={{ background: 'rgba(35,51,180,0.2)', color: '#93c5fd' }}
                      >
                        {v.is_abstain ? (
                          <span className="text-slate-400">—</span>
                        ) : v.candidate?.photo_url ? (
                          <img
                            src={`${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')}${v.candidate.photo_url}`}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          (v.candidate?.name || '?').slice(0, 1)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-slate-500 truncate">{v.position?.title || 'Position'}</p>
                        <p className="text-sm text-slate-200 font-medium truncate">
                          {v.is_abstain ? 'Abstain' : (v.candidate?.name || '—')}
                        </p>
                        {v.candidate?.partylist && (
                          <p className="text-[11px] text-slate-600 truncate">{v.candidate.partylist}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => { setBallotOpen(false); setBallotData(null) }}
                className="btn-ghost"
                style={{ padding: '9px 16px' }}
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  )

  /* ── Section detail (students list) ── */
  if (activeLevel !== null && activeSection !== null) {
    const secStudents = students.filter(
      (s) => sectionKey(s) === activeSection && levelKey(s) === activeLevel
    )
    const secIdx = sectionsForLevel(activeLevel).findIndex(([s]) => s === activeSection)
    const [bg, tx] = COLORS[Math.max(secIdx, 0) % COLORS.length]
    const voted = secStudents.filter((s) => s.has_voted).length
    const turnout = secStudents.length > 0 ? Math.round((voted / secStudents.length) * 100) : 0

    return (
      <div>
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setActiveSection(null)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm" style={{ background: bg, color: tx }}>
                {activeSection.replace(/[^a-zA-Z0-9]/g, '').charAt(0).toUpperCase() || '#'}
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">{levelLabel(activeLevel)}</p>
                <h2 className="text-2xl font-bold text-white">{activeSection}</h2>
                <p className="text-sm text-slate-500">{secStudents.length} student{secStudents.length !== 1 ? 's' : ''} · {voted} voted · {turnout}% turnout</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="btn-ghost cursor-pointer" title="Import Excel/CSV into this section">
              <FileSpreadsheet size={14} /> {importingSection === activeSection ? 'Importing…' : 'Import'}
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                disabled={importingSection === activeSection}
                onChange={(e) => handleSectionImport(e, activeSection, activeLevel)}
              />
            </label>
            <button onClick={() => openStuModal(activeSection, activeLevel)} className="btn-primary">
              <Plus size={15} /> Add Students
            </button>
            <button
              onClick={() => setConfirmDelete({ type: 'section', section: activeSection, level: activeLevel === UNASSIGNED ? null : activeLevel })}
              title="Delete section"
              className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="rounded-2xl p-5 mb-5" style={{ background: `linear-gradient(135deg, ${bg.replace('0.18','0.12')}, rgba(255,255,255,0.02))`, border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Voter Turnout</p>
            <span className="text-sm font-bold" style={{ color: tx }}>{turnout}%</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${turnout}%`, background: 'linear-gradient(90deg, #2333b4, #2b35b7)' }} />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-slate-500">{voted} voted</span>
            <span className="text-xs text-slate-500">{secStudents.length - voted} not voted</span>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
          {secStudents.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
              <p className="text-slate-500 text-sm">No students yet in this section.</p>
              <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                <label className="btn-ghost cursor-pointer" style={{ padding: '8px 20px' }}>
                  <FileSpreadsheet size={14} /> Import
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={(e) => handleSectionImport(e, activeSection, activeLevel)}
                  />
                </label>
                <button onClick={() => openStuModal(activeSection, activeLevel)} className="btn-primary" style={{ padding: '8px 20px' }}>
                  <Plus size={14} /> Add Students
                </button>
              </div>
            </div>
          ) : (
            <StudentTable
              students={secStudents}
              onEdit={(s) => openStuModal(activeSection, activeLevel, s)}
              onDelete={(id) => setConfirmDelete(id)}
              onReset={handleReset}
              onViewBallot={handleViewBallot}
            />
          )}
        </div>
        {renderModals()}
      </div>
    )
  }

  /* ── Level detail (sections list) ── */
  if (activeLevel !== null) {
    const sections = sectionsForLevel(activeLevel)
    const total = countInLevel(activeLevel)
    const voted = students.filter((s) => levelKey(s) === activeLevel && s.has_voted).length
    const turnout = total > 0 ? Math.round((voted / total) * 100) : 0
    const lvlIdx = Math.max(levelList.indexOf(activeLevel), 0)
    const [bg, tx] = COLORS[lvlIdx % COLORS.length]
    const canAddSection = activeLevel !== UNASSIGNED

    return (
      <div>
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => { setActiveLevel(null); setActiveSection(null) }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg, color: tx }}>
                <Layers size={18} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{levelLabel(activeLevel)}</h2>
                <p className="text-sm text-slate-500">
                  {sections.length} section{sections.length !== 1 ? 's' : ''} · {total} student{total !== 1 ? 's' : ''} · {turnout}% turnout
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canAddSection && (
              <>
                <label
                  className="btn-ghost cursor-pointer"
                  title={`Import Excel/CSV into ${levelLabel(activeLevel)} (section column required)`}
                >
                  <FileSpreadsheet size={14} /> {importingLevel ? 'Importing…' : 'Import'}
                  <input
                    ref={levelFileRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    disabled={importingLevel}
                    onChange={(e) => handleLevelImport(e, activeLevel)}
                  />
                </label>
                <button onClick={() => openAddSection(activeLevel)} className="btn-primary">
                  <FolderPlus size={15} /> Add Section
                </button>
              </>
            )}
            <button
              onClick={() => setConfirmDelete({ type: 'level', level: activeLevel })}
              title="Delete level"
              className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {sections.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ border: '1px dashed rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
            <FolderPlus size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
            <p className="text-slate-400 text-sm font-medium">No sections yet</p>
            <p className="text-slate-600 text-xs mt-1 mb-4">
              Add a section under {levelLabel(activeLevel)}, or import a file (with section column).
            </p>
            {canAddSection && (
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <label className="btn-ghost cursor-pointer" style={{ padding: '8px 20px' }}>
                  <FileSpreadsheet size={14} /> Import
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    disabled={importingLevel}
                    onChange={(e) => handleLevelImport(e, activeLevel)}
                  />
                </label>
                <button onClick={() => openAddSection(activeLevel)} className="btn-primary" style={{ padding: '8px 20px' }}>
                  <FolderPlus size={14} /> Add First Section
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {sections.map(([section, sStudents], idx) => {
              const [sBg, sTx] = COLORS[idx % COLORS.length]
              const sVoted = sStudents.filter((s) => s.has_voted).length
              const sTurnout = sStudents.length > 0 ? Math.round((sVoted / sStudents.length) * 100) : 0
              return (
                <div
                  key={section}
                  className="rounded-2xl overflow-hidden cursor-pointer group transition-all hover:scale-[1.005]"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div className="flex items-center gap-4 px-5 py-4">
                    <button
                      onClick={() => setActiveSection(section)}
                      className="flex items-center gap-4 flex-1 text-left min-w-0"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
                        style={{ background: sBg, color: sTx }}
                      >
                        {section.replace(/[^a-zA-Z0-9]/g, '').charAt(0).toUpperCase() || '#'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white text-sm group-hover:text-blue-200 transition-colors">{section}</span>
                          <span className="text-xs text-slate-500">{sStudents.length} student{sStudents.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="w-28 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                            <div className="h-full rounded-full" style={{ width: `${sTurnout}%`, background: 'linear-gradient(90deg,#2333b4,#2b35b7)' }} />
                          </div>
                          <span className="text-xs text-slate-500">{sVoted}/{sStudents.length} voted · {sTurnout}%</span>
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <label
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-blue-300 hover:bg-blue-700/10 transition-colors cursor-pointer"
                        title={`Import Excel/CSV into ${section}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FileSpreadsheet size={14} />
                        {importingSection === section ? '…' : 'Import'}
                        <input
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          className="hidden"
                          onChange={(e) => handleSectionImport(e, section, activeLevel)}
                          disabled={importingSection === section}
                        />
                      </label>
                      <button
                        onClick={(e) => { e.stopPropagation(); openStuModal(section, activeLevel) }}
                        title={`Add students to ${section}`}
                        className="p-2 rounded-lg text-slate-500 hover:text-blue-300 hover:bg-blue-700/10 transition-colors"
                      >
                        <Plus size={15} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setConfirmDelete({
                            type: 'section',
                            section,
                            level: activeLevel === UNASSIGNED ? null : activeLevel,
                          })
                        }}
                        title={`Delete ${section}`}
                        className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                      <div className="p-2 text-slate-600 group-hover:text-blue-300 transition-colors">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M9 5l7 7-7 7"/></svg>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {renderModals()}
      </div>
    )
  }

  /* ── Levels list (home) ── */
  return (
    <div>
      <PageHeader
        title="Students"
        subtitle="Add a year level first, then sections under it"
        action={
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setCsvGuide(true)} className="btn-ghost">
              <Info size={14} /> Import Format
            </button>
            <button onClick={() => globalFileRef.current.click()} disabled={importingGlobal} className="btn-ghost">
              <FileSpreadsheet size={14} /> {importingGlobal ? 'Importing…' : 'Import All'}
            </button>
            <input ref={globalFileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleGlobalImport} />
            <button
              onClick={() => { setNewLevel(''); setLvlModal(true) }}
              className="btn-primary"
              disabled={availableLevelsToAdd.length === 0}
            >
              <Layers size={15} /> Add Level
            </button>
          </div>
        }
      />

      <div className="relative mb-6 max-w-sm">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, ID, section, or level…"
          className="input-dark has-icon"
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <div className="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
          Loading…
        </div>
      ) : isSearching ? (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
          {filteredFlat.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-slate-500 text-sm">No students match &quot;{search}&quot;</p>
            </div>
          ) : (
            <StudentTable
              students={filteredFlat}
              onEdit={(s) => openStuModal(sectionKey(s), levelKey(s), s)}
              onDelete={(id) => setConfirmDelete(id)}
              onReset={handleReset}
              onViewBallot={handleViewBallot}
            />
          )}
        </div>
      ) : levelList.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ border: '1px dashed rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
          <Layers size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
          <p className="text-slate-400 text-sm font-medium">No levels yet</p>
          <p className="text-slate-600 text-xs mt-1 mb-4">Start by adding a year level, then create sections under it.</p>
          <button onClick={() => { setNewLevel(''); setLvlModal(true) }} className="btn-primary" style={{ padding: '8px 20px' }}>
            <Layers size={14} /> Add First Level
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {levelList.map((lv, idx) => {
            const [bg, tx] = COLORS[idx % COLORS.length]
            const sections = sectionsForLevel(lv)
            const total = countInLevel(lv)
            const voted = students.filter((s) => levelKey(s) === lv && s.has_voted).length
            const turnout = total > 0 ? Math.round((voted / total) * 100) : 0
            return (
              <div
                key={lv}
                className="rounded-2xl overflow-hidden cursor-pointer group transition-all hover:scale-[1.005]"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="flex items-center gap-4 px-5 py-4">
                  <button
                    onClick={() => { setActiveLevel(lv); setActiveSection(null) }}
                    className="flex items-center gap-4 flex-1 text-left min-w-0"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: bg, color: tx }}
                    >
                      <Layers size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white text-sm group-hover:text-blue-200 transition-colors">
                          {levelLabel(lv)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {sections.length} section{sections.length !== 1 ? 's' : ''} · {total} student{total !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="w-28 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                          <div className="h-full rounded-full" style={{ width: `${turnout}%`, background: 'linear-gradient(90deg,#2333b4,#2b35b7)' }} />
                        </div>
                        <span className="text-xs text-slate-500">{voted}/{total} voted · {turnout}%</span>
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    {lv !== UNASSIGNED && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openAddSection(lv) }}
                        title={`Add section under ${levelLabel(lv)}`}
                        className="p-2 rounded-lg text-slate-500 hover:text-blue-300 hover:bg-blue-700/10 transition-colors"
                      >
                        <FolderPlus size={15} />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setConfirmDelete({ type: 'level', level: lv })
                      }}
                      title={`Delete ${levelLabel(lv)}`}
                      className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                    <div className="p-2 text-slate-600 group-hover:text-blue-300 transition-colors">
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M9 5l7 7-7 7"/></svg>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!isSearching && !loading && students.length > 0 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-xs text-slate-600">
            {students.length} total students · {levelList.filter((l) => l !== UNASSIGNED).length} levels
          </p>
          <p className="text-xs text-slate-600">
            {students.filter((s) => s.has_voted).length} voted (
            {students.length > 0
              ? Math.round((students.filter((s) => s.has_voted).length / students.length) * 100)
              : 0}
            % turnout)
          </p>
        </div>
      )}

      {renderModals()}
    </div>
  )
}

function StudentTable({ students, onEdit, onDelete, onReset, onViewBallot }) {
  return (
    <div className="max-h-[min(60vh,520px)] overflow-y-auto overflow-x-auto">
      <table className="w-full table-dark">
        <thead className="sticky top-0 z-10" style={{ background: '#12161f' }}>
          <tr>
            <th>Student ID</th>
            <th>Name</th>
            <th>Section</th>
            <th>Level</th>
            <th>Voted</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s._id}>
              <td><span className="font-mono text-xs text-slate-400">{s.student_id}</span></td>
              <td><span className="font-medium text-slate-200">{s.name}</span></td>
              <td><span className="text-slate-500">{s.section || '—'}</span></td>
              <td>
                <span className="text-xs text-slate-400">
                  {s.level ? labelForLevel(s.level) : <span className="text-slate-600">Not set</span>}
                </span>
              </td>
              <td>
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={
                    s.has_voted
                      ? { background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }
                      : { background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)', color: '#64748b' }
                  }
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.has_voted ? '#34d399' : '#475569' }} />
                  {s.has_voted ? 'Voted' : 'Not voted'}
                </span>
              </td>
              <td>
                <div className="flex items-center justify-end gap-1">
                  {s.has_voted && (
                    <button
                      onClick={() => onViewBallot?.(s)}
                      title="View ballot (available after voting ends)"
                      className="p-1.5 rounded-lg text-slate-600 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                    >
                      <Eye size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => onReset(s._id)}
                    title="Clear password (student creates a new one)"
                    className="p-1.5 rounded-lg text-slate-600 hover:text-yellow-400 hover:bg-yellow-400/10 transition-colors"
                  >
                    <KeyRound size={14} />
                  </button>
                  <button
                    onClick={() => onEdit(s)}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-blue-300 hover:bg-blue-700/10 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => onDelete(s._id)}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
