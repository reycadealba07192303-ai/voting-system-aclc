import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, PlayCircle, StopCircle, Vote, ChevronDown, ChevronUp, ListOrdered } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getElections, createElection, updateElection, deleteElection, openElection, closeElection,
} from '../api/elections'
import { getPositions, createPosition, updatePosition, deletePosition } from '../api/positions'
import PageHeader from '../components/ui/PageHeader'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import LevelMultiSelect from '../components/ui/LevelMultiSelect'
import { labelForLevel } from '../constants/levels'

const EMPTY_FORM = { title: '', description: '', start_date: '', end_date: '', audience_levels: [] }
const EMPTY_POS  = { title: '', max_winners: 1 }
const labelCls   = 'block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2'

export default function Elections() {
  const navigate = useNavigate()
  const [elections, setElections]           = useState([])
  const [loading, setLoading]               = useState(true)
  const [expanded, setExpanded]             = useState(null)
  const [positionsMap, setPositionsMap]     = useState({})
  const [posLoading, setPosLoading]         = useState(false)

  const [modalOpen, setModalOpen]           = useState(false)
  const [editing, setEditing]               = useState(null)
  const [form, setForm]                     = useState(EMPTY_FORM)
  const [saving, setSaving]                 = useState(false)
  const [confirmDelete, setConfirmDelete]   = useState(null)
  const [confirmClose, setConfirmClose]     = useState(null)

  const [posModal, setPosModal]             = useState(false)
  const [posEditing, setPosEditing]         = useState(null)
  const [posForm, setPosForm]               = useState(EMPTY_POS)
  const [posSaving, setPosSaving]           = useState(false)
  const [confirmDelPos, setConfirmDelPos]   = useState(null)

  const load = () => {
    setLoading(true)
    getElections()
      .then((r) => setElections(r.data))
      .catch(() => toast.error('Failed to load elections'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const toggleExpand = async (elId) => {
    if (expanded === elId) { setExpanded(null); return }
    setExpanded(elId)
    if (positionsMap[elId]) return
    setPosLoading(true)
    try {
      const r = await getPositions(elId)
      setPositionsMap((prev) => ({ ...prev, [elId]: r.data }))
    } catch {
      toast.error('Failed to load positions')
    } finally {
      setPosLoading(false)
    }
  }

  const reloadPositions = async (elId) => {
    const r = await getPositions(elId)
    setPositionsMap((prev) => ({ ...prev, [elId]: r.data }))
  }

  const openElModal = (election = null) => {
    setEditing(election)
    setForm(election
      ? {
          title: election.title,
          description: election.description || '',
          start_date: election.start_date?.slice(0, 10) || '',
          end_date: election.end_date?.slice(0, 10) || '',
          audience_levels: election.audience_levels || [],
        }
      : { ...EMPTY_FORM, audience_levels: [] })
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    if (!form.audience_levels?.length) {
      toast.error('Select at least one audience level')
      setSaving(false)
      return
    }
    try {
      editing ? await updateElection(editing._id, form) : await createElection(form)
      toast.success(editing ? 'Election updated' : 'Election created')
      setModalOpen(false); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async (password) => {
    await deleteElection(confirmDelete, password)
    toast.success('Deleted')
    load()
  }

  const handleOpen  = async (id) => {
    try { await openElection(id);  toast.success('Election opened');  load() }
    catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }
  const handleClose = async (password) => {
    await closeElection(confirmClose, password)
    toast.success('Election closed')
    load()
  }

  const openPosModal = (elId, position = null) => {
    setPosEditing(position ? { ...position, electionId: elId } : { electionId: elId })
    setPosForm(position ? { title: position.title, max_winners: position.max_winners } : EMPTY_POS)
    setPosModal(true)
  }

  const handlePosSave = async (e) => {
    e.preventDefault(); setPosSaving(true)
    const { electionId, _id } = posEditing
    try {
      _id
        ? await updatePosition(electionId, _id, posForm)
        : await createPosition(electionId, posForm)
      toast.success(_id ? 'Position updated' : 'Position created')
      setPosModal(false)
      await reloadPositions(electionId)
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed') }
    finally { setPosSaving(false) }
  }

  const handlePosDelete = async ({ electionId, positionId }) => {
    try {
      await deletePosition(electionId, positionId)
      toast.success('Position deleted')
      await reloadPositions(electionId)
    } catch { toast.error('Delete failed') }
  }

  return (
    <div>
      <PageHeader
        title="Elections"
        subtitle="Create and manage elections and their positions"
        action={
          <button onClick={() => openElModal()} className="btn-primary">
            <Plus size={15} /> New Election
          </button>
        }
      />

      {loading ? (
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          Loading…
        </div>
      ) : elections.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ border: '1px dashed rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
          <Vote size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
          <p className="text-slate-500 text-sm">No elections yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {elections.map((el) => {
            const isExpanded = expanded === el._id
            const positions  = positionsMap[el._id] || []

            return (
              <div key={el._id} className="rounded-2xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>

                <div className="flex items-center gap-4 px-5 py-4">
                  <button
                    type="button"
                    onClick={() => navigate(`/elections/${el._id}`)}
                    className="flex-1 min-w-0 text-left group"
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                        {el.title}
                      </h3>
                      <Badge label={el.status} variant={el.status} />
                    </div>
                    <p className="text-xs text-slate-500">
                      {new Date(el.start_date).toLocaleDateString()} — {new Date(el.end_date).toLocaleDateString()}
                    </p>
                    {(el.audience_levels || []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {el.audience_levels.map((lv) => (
                          <span
                            key={lv}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                            style={{
                              background: 'rgba(99,102,241,0.15)',
                              border: '1px solid rgba(99,102,241,0.28)',
                              color: '#a5b4fc',
                            }}
                          >
                            {labelForLevel(lv)}
                          </span>
                        ))}
                      </div>
                    )}
                    {el.description && <p className="text-xs text-slate-600 mt-1 truncate">{el.description}</p>}
                    <p className="text-[11px] text-indigo-400/80 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      View all candidates →
                    </p>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggleExpand(el._id)} title="Manage positions"
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isExpanded
                          ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                          : 'text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 border border-transparent'
                      }`}>
                      <ListOrdered size={13} />
                      Positions
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>

                    {el.status === 'draft' && (
                      <button onClick={() => handleOpen(el._id)} title="Open election"
                        className="p-2 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition-colors">
                        <PlayCircle size={17} />
                      </button>
                    )}
                    {el.status === 'ongoing' && (
                      <button onClick={() => setConfirmClose(el._id)} title="Close election"
                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                        <StopCircle size={17} />
                      </button>
                    )}
                    <button onClick={() => openElModal(el)}
                      className="p-2 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => setConfirmDelete(el._id)}
                      className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center justify-between py-3 mb-2">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Positions</p>
                      <button onClick={() => openPosModal(el._id)} className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                        <Plus size={12} /> Add Position
                      </button>
                    </div>

                    {posLoading && !positionsMap[el._id] ? (
                      <div className="flex items-center gap-2 text-slate-600 text-xs py-2">
                        <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        Loading…
                      </div>
                    ) : positions.length === 0 ? (
                      <div className="text-center py-6 rounded-xl" style={{ border: '1px dashed rgba(255,255,255,0.07)' }}>
                        <p className="text-slate-600 text-xs">No positions yet. Add one above.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {positions.map((pos, idx) => (
                          <div key={pos._id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <span className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0"
                              style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
                              {idx + 1}
                            </span>
                            <span className="flex-1 text-sm text-slate-200 font-medium">{pos.title}</span>
                            <span className="text-xs text-slate-600 mr-2">
                              {pos.max_winners === 1 ? '1 winner' : `${pos.max_winners} winners`}
                            </span>
                            <button onClick={() => openPosModal(el._id, pos)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => setConfirmDelPos({ electionId: el._id, positionId: pos._id })}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing?._id ? 'Edit Election' : 'New Election'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className={labelCls}>Title</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input-dark" placeholder="e.g. SSG Election 2025–2026" />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2} className="input-dark" style={{ resize: 'none' }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Start Date</label>
              <input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="input-dark" style={{ colorScheme: 'dark' }} />
            </div>
            <div>
              <label className={labelCls}>End Date</label>
              <input type="date" required value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="input-dark" style={{ colorScheme: 'dark' }} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Audience levels</label>
            <p className="text-xs text-slate-600 mb-2">
              Open the dropdown and check the levels that can see this election (Grade 7–12 and College 1st–5th Year).
            </p>
            <LevelMultiSelect
              value={form.audience_levels || []}
              onChange={(audience_levels) => setForm({ ...form, audience_levels })}
              placeholder="Select levels…"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost" style={{ padding: '9px 16px' }}>Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary" style={{ padding: '9px 16px' }}>
              {saving ? 'Saving…' : editing?._id ? 'Save Changes' : 'Create Election'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={posModal} onClose={() => setPosModal(false)} title={posEditing?._id ? 'Edit Position' : 'Add Position'} size="sm">
        <form onSubmit={handlePosSave} className="space-y-4">
          <div>
            <label className={labelCls}>Position Title</label>
            <input required value={posForm.title} onChange={(e) => setPosForm({ ...posForm, title: e.target.value })}
              className="input-dark" placeholder="e.g. President, Secretary…" />
          </div>
          <div>
            <label className={labelCls}>Max Winners</label>
            <input type="number" min="1" max="10" required value={posForm.max_winners}
              onChange={(e) => setPosForm({ ...posForm, max_winners: Number(e.target.value) })}
              className="input-dark" />
            <p className="text-xs text-slate-600 mt-1">Set to 1 for single winner, higher for multi-winner positions (e.g. Senators).</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setPosModal(false)} className="btn-ghost" style={{ padding: '9px 16px' }}>Cancel</button>
            <button type="submit" disabled={posSaving} className="btn-primary" style={{ padding: '9px 16px' }}>
              {posSaving ? 'Saving…' : posEditing?._id ? 'Save Changes' : 'Add Position'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmClose} onClose={() => setConfirmClose(null)}
        onConfirm={handleClose}
        title="Close Election"
        message="Closing stops all further voting. Confirm with your admin password."
        confirmLabel="Close Election"
        danger
        requirePassword
      />

      <ConfirmDialog
        open={!!confirmDelete} onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Election"
        message="This will permanently delete the election and all associated data. This cannot be undone."
        danger
        requirePassword
      />

      <ConfirmDialog
        open={!!confirmDelPos} onClose={() => setConfirmDelPos(null)}
        onConfirm={() => handlePosDelete(confirmDelPos)}
        title="Delete Position"
        message="This will permanently remove this position from the election."
        danger
      />
    </div>
  )
}
