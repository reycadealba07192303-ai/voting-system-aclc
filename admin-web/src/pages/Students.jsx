import { useEffect, useState, useRef, useMemo } from 'react'
import {
  Plus, Pencil, Trash2, KeyRound, Search, Eye,
  Users, FolderPlus, FileSpreadsheet, Info,
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
const COLORS = [
  ['rgba(99,102,241,0.18)', '#a5b4fc'],
  ['rgba(139,92,246,0.18)', '#c4b5fd'],
  ['rgba(6,182,212,0.18)',  '#67e8f9'],
  ['rgba(16,185,129,0.18)', '#6ee7b7'],
  ['rgba(245,158,11,0.18)', '#fcd34d'],
  ['rgba(239,68,68,0.18)',  '#fca5a5'],
]

export default function Students() {
  const [students, setStudents]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [expanded, setExpanded]         = useState(new Set())
  const [activeSection, setActiveSection] = useState(null)
  const [secModal, setSecModal]         = useState(false)
  const [secName, setSecName]           = useState('')
  // Sections that exist but have 0 students yet (created manually, not from DB)
  const [pendingSections, setPending]   = useState([])
  const [stuModal, setStuModal]         = useState(false)
  const [editingStu, setEditingStu]     = useState(null)        // null = bulk add, object = edit single
  const [stuSection, setStuSection]     = useState('')          // section context for the modal
  // Bulk add rows: [{ student_id, name }]
  const EMPTY_ROW = () => ({ id: Date.now() + Math.random(), student_id: '', name: '' })
  const [bulkRows, setBulkRows]         = useState([EMPTY_ROW()])
  const [bulkLevel, setBulkLevel]       = useState('')
  const [stuForm, setStuForm]           = useState(EMPTY_STUDENT) // used for edit-single only
  const [savingStu, setSavingStu]       = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [ballotOpen, setBallotOpen]       = useState(false)
  const [ballotLoading, setBallotLoading] = useState(false)
  const [ballotData, setBallotData]       = useState(null)
  const [importingGlobal, setImportingGlobal]   = useState(false)
  const [importingSection, setImportingSection] = useState(null)
  const [csvGuide, setCsvGuide]         = useState(false)
  const globalFileRef  = useRef()
  const sectionFileRefs = useRef({})

  const load = () => {
    setLoading(true)
    getStudents()
      .then((r) => setStudents(r.data))
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const sections = useMemo(() => {
    const map = {}
    students.forEach((s) => {
      const key = s.section?.trim() || 'No Section'
      if (!map[key]) map[key] = []
      map[key].push(s)
    })
    // Add pending sections (created manually, no students yet)
    pendingSections.forEach((sec) => {
      if (!map[sec]) map[sec] = []
    })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [students, pendingSections])

  const filteredFlat = useMemo(() => {
    if (!search) return []
    const q = search.toLowerCase()
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.student_id.includes(q) || s.section?.toLowerCase().includes(q)
    )
  }, [students, search])

  const toggle = (sec) => setExpanded((prev) => {
    const n = new Set(prev); n.has(sec) ? n.delete(sec) : n.add(sec); return n
  })

  /* ── Add section → show it immediately in the list ── */
  const handleAddSection = (e) => {
    e.preventDefault()
    if (!secName.trim()) return
    const name = secName.trim()
    // Add to pending so it appears even with 0 students
    setPending((prev) => prev.includes(name) ? prev : [...prev, name])
    // Auto-expand it so user sees it right away
    setExpanded((prev) => new Set([...prev, name]))
    setSecModal(false)
    setSecName('')
  }

  // When a student gets added to a section, remove it from pending
  const clearPending = (section) => {
    setPending((prev) => prev.filter((s) => s !== section))
  }

  /* ── Open Add Students modal (bulk) or Edit single ── */
  const openStuModal = (section, student = null) => {
    setStuSection(section)
    setEditingStu(student)
    if (student) {
      // Edit mode — single form
      setStuForm({
        student_id: student.student_id,
        name: student.name,
        section: student.section || section,
        password: '',
        level: student.level || '',
      })
    } else {
      // Add mode — bulk rows
      setBulkRows([{ id: Date.now(), student_id: '', name: '' }])
      setBulkLevel('')
    }
    setStuModal(true)
  }

  /* ── Bulk row helpers ── */
  const updateRow = (id, field, value) =>
    setBulkRows((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r))

  const addRow = () =>
    setBulkRows((prev) => [...prev, { id: Date.now() + Math.random(), student_id: '', name: '' }])

  const removeRow = (id) =>
    setBulkRows((prev) => prev.length > 1 ? prev.filter((r) => r.id !== id) : prev)

  const handleStuSave = async (e) => {
    e.preventDefault()
    setSavingStu(true)
    try {
      if (editingStu) {
        // ── Edit single student ──
        const payload = { ...stuForm }
        if (!payload.password) delete payload.password
        payload.level = payload.level || null
        await updateStudent(editingStu._id, payload)
        toast.success('Student updated')
      } else {
        // ── Bulk add ──
        if (!bulkLevel) {
          toast.error('Select a year level for these students')
          setSavingStu(false)
          return
        }
        const valid = bulkRows.filter((r) => r.student_id.trim() && r.name.trim())
        if (valid.length === 0) { toast.error('Add at least one student with ID and name.'); setSavingStu(false); return }
        let added = 0
        const conflictMsgs = []
        for (const row of valid) {
          try {
            await createStudent({
              student_id: row.student_id.trim(),
              name: row.name.trim(),
              section: stuSection,
              level: bulkLevel || null,
            })
            added++
          } catch (err) {
            conflictMsgs.push(
              err.response?.data?.message ||
                `${row.student_id.trim()} already exists`
            )
          }
        }
        if (added > 0) {
          toast.success(`Added ${added} student${added !== 1 ? 's' : ''}`)
        }
        if (conflictMsgs.length > 0) {
          // Show first few conflicts clearly
          conflictMsgs.slice(0, 3).forEach((msg) => toast.error(msg, { duration: 5000 }))
          if (conflictMsgs.length > 3) {
            toast.error(`…and ${conflictMsgs.length - 3} more duplicate(s)`, { duration: 4000 })
          }
        }
        if (added === 0 && conflictMsgs.length === 0) {
          toast.error('No students added')
        }
      }
      setStuModal(false)
      clearPending(stuSection)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
    } finally {
      setSavingStu(false)
    }
  }

  const handleDelete = async (id) => {
    try { await deleteStudent(id); toast.success('Student deleted'); load() }
    catch { toast.error('Delete failed') }
  }

  const handleDeleteSection = async (section) => {
    const inSection = students.filter((s) => (s.section?.trim() || 'No Section') === section)
    try {
      await Promise.all(inSection.map((s) => deleteStudent(s._id)))
      setPending((prev) => prev.filter((s) => s !== section))
      // If we're viewing this section's detail, go back to list
      if (activeSection === section) setActiveSection(null)
      toast.success(`Section "${section}" deleted${inSection.length > 0 ? ` with ${inSection.length} student${inSection.length !== 1 ? 's' : ''}` : ''}`)
      load()
    } catch { toast.error('Failed to delete section') }
  }

  const handleReset = async (id) => {
    try {
      const res = await resetStudentPassword(id)
      toast.success(res.data.message || 'Password cleared. Student must create a new one in the app.')
    } catch { toast.error('Reset failed') }
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
      const data = err.response?.data
      setBallotOpen(false)
      toast.error(data?.message || 'Could not load ballot')
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

  /* ── Global import (section column required) ── */
  const handleGlobalImport = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setImportingGlobal(true)
    try {
      const res = await importStudents(file)
      showImportResult(res)
      load()
    } catch (err) {
      const data = err.response?.data
      if (data?.duplicates?.length) {
        showImportResult({ data: { imported: 0, duplicates: data.duplicates, message: data.message } })
      } else {
        toast.error(data?.message || 'Import failed')
      }
      load()
    }
    finally { setImportingGlobal(false); e.target.value = '' }
  }

  /* ── Per-section import (only student_id, name — section auto-injected) ── */
  const handleSectionImport = async (e, section) => {
    const file = e.target.files[0]; if (!file) return
    setImportingSection(section)
    try {
      const res = await importStudents(file, section)
      showImportResult(res, section)
      clearPending(section)
      load()
    } catch (err) {
      const data = err.response?.data
      if (data?.duplicates?.length) {
        showImportResult({ data: { imported: 0, duplicates: data.duplicates, message: data.message } }, section)
      } else {
        toast.error(data?.message || 'Import failed')
      }
      load()
    }
    finally { setImportingSection(null); e.target.value = '' }
  }

  const isSearching = search.trim().length > 0

  /* ── Shared modals rendered in both views ── */
  const renderModals = () => (
    <>
      {/* Add Section Modal */}
      <Modal open={secModal} onClose={() => setSecModal(false)} title="Add Section" size="sm">
        <form onSubmit={handleAddSection} className="space-y-4">
          <div>
            <label className={labelCls}>Section Name</label>
            <input required autoFocus value={secName} onChange={(e) => setSecName(e.target.value)}
              className="input-dark" placeholder="e.g. 12-STEM A, Grade 11-ABM, STEM 1A" />
            <p className="text-xs text-slate-600 mt-1.5">The section will appear in the list right away.</p>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setSecModal(false)} className="btn-ghost" style={{ padding: '9px 16px' }}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ padding: '9px 16px' }}>Create Section</button>
          </div>
        </form>
      </Modal>

      {/* Add Students (bulk) / Edit Student Modal */}
      <Modal open={stuModal} onClose={() => setStuModal(false)}
        title={editingStu ? 'Edit Student' : `Add Students — ${stuSection}`}
        size={editingStu ? 'md' : 'lg'}>
        <form onSubmit={handleStuSave} className="space-y-4">
          {editingStu ? (
            <>
              <div>
                <label className={labelCls}>Student ID</label>
                <input value={stuForm.student_id} disabled className="input-dark disabled:opacity-50" />
              </div>
              <div>
                <label className={labelCls}>Full Name</label>
                <input required value={stuForm.name} onChange={(e) => setStuForm({ ...stuForm, name: e.target.value })}
                  className="input-dark" placeholder="Juan Dela Cruz" />
              </div>
              <div>
                <label className={labelCls}>Section</label>
                <input value={stuForm.section} onChange={(e) => setStuForm({ ...stuForm, section: e.target.value })}
                  className="input-dark" />
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
                <p className="text-xs text-slate-600 mt-1">Determines which elections this student can see.</p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-slate-500">No password set here — students create their own in the mobile app.</p>
                <span className="text-xs text-slate-600">{bulkRows.length} row{bulkRows.length !== 1 ? 's' : ''}</span>
              </div>
              <div>
                <label className={labelCls}>Year level (for all rows below)</label>
                <SelectDropdown
                  options={[
                    { value: '', label: 'Select level…' },
                    ...ELECTION_LEVELS.map((lv) => ({ value: lv.id, label: lv.label })),
                  ]}
                  value={bulkLevel}
                  onChange={setBulkLevel}
                  placeholder="Select level…"
                  minWidth={200}
                  className="w-full"
                />
              </div>
              <div className="grid grid-cols-[1fr_1.6fr_28px] gap-2 px-1">
                <p className={labelCls} style={{ marginBottom: 0 }}>Student ID</p>
                <p className={labelCls} style={{ marginBottom: 0 }}>Full Name</p>
                <span />
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {bulkRows.map((row) => (
                  <div key={row.id} className="grid grid-cols-[1fr_1.6fr_28px] gap-2 items-center">
                    <input value={row.student_id} onChange={(e) => updateRow(row.id, 'student_id', e.target.value)}
                      className="input-dark" placeholder="2024-001" />
                    <input value={row.name} onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                      className="input-dark" placeholder="Juan Dela Cruz" />
                    <button type="button" onClick={() => removeRow(row.id)} disabled={bulkRows.length === 1}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addRow}
                className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors mt-1">
                <Plus size={13} /> Add another row
              </button>
            </>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setStuModal(false)} className="btn-ghost" style={{ padding: '9px 16px' }}>Cancel</button>
            <button type="submit" disabled={savingStu} className="btn-primary" style={{ padding: '9px 16px' }}>
              {savingStu ? 'Saving…' : editingStu ? 'Save Changes'
                : `Add ${bulkRows.filter(r => r.student_id.trim()).length || ''} Student${bulkRows.filter(r => r.student_id.trim()).length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </Modal>

      {/* Import Format Guide Modal */}
      <Modal open={csvGuide} onClose={() => setCsvGuide(false)} title="Import Format (CSV / Excel)" size="lg">
        <div className="space-y-5 text-sm">
          <div>
            <p className="text-white font-semibold mb-1">Import All — includes sections &amp; students</p>
            <p className="text-slate-400 text-xs mb-2">Use when importing students across multiple sections at once.</p>
            <div className="rounded-xl p-4" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <pre className="text-indigo-300 text-xs font-mono leading-relaxed">{`student_id,name,section,level\n2024-001,Juan Dela Cruz,12-STEM A,grade_12\n2024-002,Maria Santos,BS Arch 5A,college_5\n2024-003,Pedro Reyes,BSIT 2B,college_2`}</pre>
              <p className="text-[11px] text-slate-600 mt-2">
                Levels: <code className="text-slate-400">grade_7</code>–<code className="text-slate-400">grade_12</code>,
                {' '}<code className="text-slate-400">college_1</code>–<code className="text-slate-400">college_5</code>.
              </p>
            </div>
          </div>
          <div>
            <p className="text-white font-semibold mb-1">Import into a Section — section auto-filled</p>
            <p className="text-slate-400 text-xs mb-2">Use the Import icon inside a section. Only 2 columns needed.</p>
            <div className="rounded-xl p-4" style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <pre className="text-emerald-300 text-xs font-mono leading-relaxed">{`student_id,name\n2024-004,Ana Lim\n2024-005,Jose Cruz`}</pre>
            </div>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <p className="text-yellow-400 text-xs font-semibold mb-1">Notes</p>
            <ul className="text-slate-400 text-xs space-y-1 list-disc list-inside">
              <li>Accepted files: <span className="font-mono text-yellow-300">.xlsx</span>, <span className="font-mono text-yellow-300">.xls</span>, or <span className="font-mono text-yellow-300">.csv</span></li>
              <li>Excel with multiple sheets (e.g. HERCULES, ATHENA, ZEUS) — <span className="text-yellow-300">Import All</span> reads every sheet</li>
              <li>If the section column is empty, the sheet tab name is used as the section</li>
              <li>Header row: <span className="font-mono text-yellow-300">student_id</span>, <span className="font-mono text-yellow-300">name</span>, <span className="font-mono text-yellow-300">section</span></li>
              <li>No passwords on import — students create their password in the mobile app</li>
              <li>Duplicate student IDs are silently skipped</li>
              <li>Admin &quot;Reset password&quot; clears it so the student can create a new one</li>
            </ul>
          </div>
          <div className="flex justify-end">
            <button onClick={() => setCsvGuide(false)} className="btn-primary" style={{ padding: '9px 20px' }}>Got it</button>
          </div>
        </div>
      </Modal>

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!confirmDelete} onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete?.type === 'section') handleDeleteSection(confirmDelete.section)
          else handleDelete(confirmDelete)
        }}
        title={confirmDelete?.type === 'section' ? `Delete "${confirmDelete?.section}"` : 'Delete Student'}
        message={confirmDelete?.type === 'section'
          ? `This will permanently delete the section and all ${students.filter((s) => (s.section?.trim() || 'No Section') === confirmDelete?.section).length} student(s) inside it.`
          : 'This will permanently delete the student account.'}
        danger
      />

      {/* View-only ballot (after voting session ends) */}
      <Modal
        open={ballotOpen}
        onClose={() => { setBallotOpen(false); setBallotData(null) }}
        title="Student ballot"
        size="md"
      >
        {ballotLoading ? (
          <div className="flex items-center gap-3 text-slate-500 text-sm py-10 justify-center">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
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
                        style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}
                      >
                        {v.candidate?.photo_url ? (
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
                        <p className="text-sm text-slate-200 font-medium truncate">{v.candidate?.name || '—'}</p>
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
  if (activeSection !== null) {
    const secStudents = students.filter((s) => (s.section?.trim() || 'No Section') === activeSection)
    const secIdx = sections.findIndex(([s]) => s === activeSection)
    const [bg, tx] = COLORS[Math.max(secIdx, 0) % COLORS.length]
    const voted = secStudents.filter((s) => s.has_voted).length
    const turnout = secStudents.length > 0 ? Math.round((voted / secStudents.length) * 100) : 0

    return (
      <div>
        {/* Back header */}
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
                <h2 className="text-2xl font-bold text-white">{activeSection}</h2>
                <p className="text-sm text-slate-500">{secStudents.length} student{secStudents.length !== 1 ? 's' : ''} · {voted} voted · {turnout}% turnout</p>
              </div>
            </div>
          </div>
          {/* Section actions */}
          <div className="flex items-center gap-2">
            <label className="btn-ghost cursor-pointer" title="Import Excel/CSV into this section">
              <FileSpreadsheet size={14} /> Import
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => handleSectionImport(e, activeSection)} />
            </label>
            <button onClick={() => openStuModal(activeSection)} className="btn-primary">
              <Plus size={15} /> Add Students
            </button>
            <button
              onClick={() => { setConfirmDelete({ type: 'section', section: activeSection }) }}
              title="Delete section"
              className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Turnout bar */}
        <div className="rounded-2xl p-5 mb-5" style={{ background: `linear-gradient(135deg, ${bg.replace('0.18','0.12')}, rgba(255,255,255,0.02))`, border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Voter Turnout</p>
            <span className="text-sm font-bold" style={{ color: tx }}>{turnout}%</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${turnout}%`, background: `linear-gradient(90deg, #6366f1, #8b5cf6)` }} />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-slate-500">{voted} voted</span>
            <span className="text-xs text-slate-500">{secStudents.length - voted} not voted</span>
          </div>
        </div>

        {/* Students table */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
          {secStudents.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
              <p className="text-slate-500 text-sm">No students yet in this section.</p>
              <button onClick={() => openStuModal(activeSection)} className="btn-primary mt-4" style={{ padding: '8px 20px' }}>
                <Plus size={14} /> Add Students
              </button>
            </div>
          ) : (
            <StudentTable
              students={secStudents}
              onEdit={(s) => openStuModal(activeSection, s)}
              onDelete={(id) => setConfirmDelete(id)}
              onReset={handleReset}
              onViewBallot={handleViewBallot}
            />
          )}
        </div>

        {/* Modals still rendered */}
        {renderModals()}
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle="Manage students organized by section"
        action={
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setCsvGuide(true)} className="btn-ghost">
              <Info size={14} /> Import Format
            </button>
            <button onClick={() => globalFileRef.current.click()} disabled={importingGlobal} className="btn-ghost">
              <FileSpreadsheet size={14} /> {importingGlobal ? 'Importing…' : 'Import All'}
            </button>
            <input ref={globalFileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleGlobalImport} />
            <button onClick={() => { setSecName(''); setSecModal(true) }} className="btn-primary">
              <FolderPlus size={15} /> Add Section
            </button>
          </div>
        }
      />

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, ID, or section…"
          className="input-dark has-icon"
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          Loading…
        </div>
      ) : isSearching ? (
        /* ── Search results ── */
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
          {filteredFlat.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-slate-500 text-sm">No students match "{search}"</p>
            </div>
          ) : (
            <StudentTable students={filteredFlat} onEdit={(s) => openStuModal(s.section, s)} onDelete={(id) => setConfirmDelete(id)} onReset={handleReset} onViewBallot={handleViewBallot} />
          )}
        </div>
      ) : sections.length === 0 ? (
        /* ── Empty ── */
        <div className="rounded-2xl p-12 text-center" style={{ border: '1px dashed rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
          <Users size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
          <p className="text-slate-400 text-sm font-medium">No sections yet</p>
          <p className="text-slate-600 text-xs mt-1 mb-4">Start by adding a section, or import a CSV file.</p>
          <button onClick={() => { setSecName(''); setSecModal(true) }} className="btn-primary" style={{ padding: '8px 20px' }}>
            <FolderPlus size={14} /> Add First Section
          </button>
        </div>
      ) : (
        /* ── Sections accordion ── */
        <div className="space-y-2">
          {sections.map(([section, sStudents], idx) => {
            const isOpen  = expanded.has(section)
            const [bg, tx] = COLORS[idx % COLORS.length]
            const voted   = sStudents.filter((s) => s.has_voted).length
            const turnout = sStudents.length > 0 ? Math.round((voted / sStudents.length) * 100) : 0

            // Create a hidden file input ref per section
            if (!sectionFileRefs.current[section]) {
              sectionFileRefs.current[section] = { current: null }
            }

            return (
              <div key={section}
                className="rounded-2xl overflow-hidden cursor-pointer group transition-all hover:scale-[1.005]"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                {/* Clickable section row — navigates to detail view */}
                <div className="flex items-center gap-4 px-5 py-4">
                  <button onClick={() => setActiveSection(section)} className="flex items-center gap-4 flex-1 text-left min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
                      style={{ background: bg, color: tx }}>
                      {section.replace(/[^a-zA-Z0-9]/g, '').charAt(0).toUpperCase() || '#'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white text-sm group-hover:text-indigo-300 transition-colors">{section}</span>
                        <span className="text-xs text-slate-500">{sStudents.length} student{sStudents.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="w-28 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                          <div className="h-full rounded-full" style={{ width: `${turnout}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' }} />
                        </div>
                        <span className="text-xs text-slate-500">{voted}/{sStudents.length} voted · {turnout}%</span>
                      </div>
                    </div>
                  </button>

                  {/* Icon actions — stop propagation so they don't navigate */}
                  <div className="flex items-center gap-1 shrink-0">
                    <label
                      className="p-2 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                      title={`Import Excel/CSV into ${section}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FileSpreadsheet size={15} />
                      <input type="file" accept=".csv,.xlsx,.xls" className="hidden"
                        onChange={(e) => handleSectionImport(e, section)}
                        disabled={importingSection === section}
                      />
                    </label>
                    <button
                      onClick={(e) => { e.stopPropagation(); openStuModal(section) }}
                      title={`Add students to ${section}`}
                      className="p-2 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                    >
                      <Plus size={15} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete({ type: 'section', section }) }}
                      title={`Delete ${section}`}
                      className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                    {/* Chevron indicates it's clickable */}
                    <div className="p-2 text-slate-600 group-hover:text-indigo-400 transition-colors">
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M9 5l7 7-7 7"/></svg>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer summary */}
      {!isSearching && !loading && students.length > 0 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-xs text-slate-600">{students.length} total students · {sections.length} sections</p>
          <p className="text-xs text-slate-600">
            {students.filter((s) => s.has_voted).length} voted ({students.length > 0 ? Math.round(students.filter((s) => s.has_voted).length / students.length * 100) : 0}% turnout)
          </p>
        </div>
      )}

      {renderModals()}
    </div>
  )
}

/* ── Reusable student rows table (scrolls when long) ── */
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
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={s.has_voted
                    ? { background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }
                    : { background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)', color: '#64748b' }
                  }>
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
                  <button onClick={() => onReset(s._id)} title="Clear password (student creates a new one)"
                    className="p-1.5 rounded-lg text-slate-600 hover:text-yellow-400 hover:bg-yellow-400/10 transition-colors">
                    <KeyRound size={14} />
                  </button>
                  <button onClick={() => onEdit(s)}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => onDelete(s._id)}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
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
