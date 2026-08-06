import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, UserSquare2, ChevronDown, ChevronUp, ListOrdered } from 'lucide-react'
import toast from 'react-hot-toast'
import { getElections } from '../api/elections'
import { getCandidates, createCandidate, updateCandidate, deleteCandidate } from '../api/candidates'
import { getPositions } from '../api/positions'
import PageHeader from '../components/ui/PageHeader'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import ElectionSelect from '../components/ui/ElectionSelect'
import SelectDropdown from '../components/ui/SelectDropdown'

const EMPTY_FORM = { name: '', partylist: '', platform: '', position_id: '' }
const labelCls   = 'block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2'

export default function Candidates() {
  const [elections, setElections]         = useState([])
  const [selectedElection, setSelected]   = useState('')
  const [positions, setPositions]         = useState([])
  const [candidates, setCandidates]       = useState([])
  const [loading, setLoading]             = useState(false)
  const [expandedPos, setExpandedPos]     = useState(null) // position._id

  const [modalOpen, setModalOpen]         = useState(false)
  const [editing, setEditing]             = useState(null)
  const [form, setForm]                   = useState(EMPTY_FORM)
  const [photoFile, setPhotoFile]         = useState(null)
  const [saving, setSaving]               = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    getElections().then((r) => {
      setElections(r.data)
      if (r.data.length > 0) setSelected(r.data[0]._id)
    })
  }, [])

  useEffect(() => {
    if (!selectedElection) return
    setLoading(true)
    Promise.all([getCandidates(selectedElection), getPositions(selectedElection)])
      .then(([cRes, pRes]) => {
        setCandidates(cRes.data)
        setPositions(pRes.data)
        if (pRes.data.length > 0) setExpandedPos(pRes.data[0]._id)
      })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false))
  }, [selectedElection])

  const candidatesForPosition = (posId) =>
    candidates.filter((c) => (c.position_id?._id || c.position_id) === posId)

  const openModal = (positionId, candidate = null) => {
    setEditing(candidate)
    setForm(candidate
      ? { name: candidate.name, partylist: candidate.partylist || '', platform: candidate.platform || '', position_id: candidate.position_id?._id || candidate.position_id || positionId }
      : { ...EMPTY_FORM, position_id: positionId })
    setPhotoFile(null)
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.position_id) {
      toast.error('Select a position')
      return
    }
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (photoFile) fd.append('photo', photoFile)
      editing
        ? await updateCandidate(selectedElection, editing._id, fd)
        : await createCandidate(selectedElection, fd)
      toast.success(editing ? 'Candidate updated' : 'Candidate added')
      setModalOpen(false)
      const r = await getCandidates(selectedElection)
      setCandidates(r.data)
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async (password) => {
    await deleteCandidate(selectedElection, confirmDelete, password)
    toast.success('Deleted')
    setCandidates((prev) => prev.filter((c) => c._id !== confirmDelete))
  }

  const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'

  return (
    <div>
      <PageHeader title="Candidates" subtitle="Manage candidates grouped by position" />

      {/* Election selector */}
      <div className="mb-6">
        <ElectionSelect
          elections={elections}
          value={selectedElection}
          onChange={setSelected}
          placeholder="Select election…"
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <div className="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
          Loading…
        </div>
      ) : positions.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ border: '1px dashed rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
          <UserSquare2 size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.12)' }} />
          <p className="text-slate-500 text-sm">No positions yet for this election.</p>
          <p className="text-slate-600 text-xs mt-1">Add positions from the Elections page first.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {positions.map((pos) => {
            const posCandidates = candidatesForPosition(pos._id)
            const isOpen = expandedPos === pos._id

            return (
              <div key={pos._id} className="rounded-2xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>

                {/* Position header */}
                <div className="flex items-center gap-3 px-5 py-4 cursor-pointer"
                  onClick={() => setExpandedPos(isOpen ? null : pos._id)}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(35,51,180,0.2)', border: '1px solid rgba(35,51,180,0.3)' }}>
                    <UserSquare2 size={15} style={{ color: '#93c5fd' }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white text-sm">{pos.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {posCandidates.length} candidate{posCandidates.length !== 1 ? 's' : ''} · max {pos.max_winners} winner{pos.max_winners !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button className="btn-primary shrink-0" style={{ padding: '6px 12px', fontSize: '12px' }}
                    onClick={(e) => { e.stopPropagation(); openModal(pos._id) }}>
                    <Plus size={12} /> Add
                  </button>
                  <div className="ml-1 text-slate-500">
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* Candidates grid */}
                {isOpen && (
                  <div className="px-5 pb-5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {posCandidates.length === 0 ? (
                      <div className="py-8 text-center rounded-xl mt-4"
                        style={{ border: '1px dashed rgba(255,255,255,0.07)' }}>
                        <p className="text-xs text-slate-600">No candidates yet. Click Add above.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mt-4">
                        {posCandidates.map((c) => (
                          <div key={c._id} className="rounded-xl overflow-hidden group"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            {/* Photo */}
                            <div className="relative">
                              {c.photo_url
                                ? <img src={`${apiBase}${c.photo_url}`} alt={c.name} className="w-full h-28 object-cover" />
                                : <div className="w-full h-28 flex items-center justify-center"
                                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                                    <UserSquare2 size={32} style={{ color: 'rgba(255,255,255,0.1)' }} />
                                  </div>
                              }
                              {/* Hover actions */}
                              <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ background: 'rgba(0,0,0,0.5)' }}>
                                <button onClick={() => openModal(pos._id, c)}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                                  style={{ background: 'rgba(35,51,180,0.8)' }}>
                                  <Pencil size={13} className="text-white" />
                                </button>
                                <button onClick={() => setConfirmDelete(c._id)}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                                  style={{ background: 'rgba(239,68,68,0.8)' }}>
                                  <Trash2 size={13} className="text-white" />
                                </button>
                              </div>
                            </div>
                            {/* Info */}
                            <div className="p-3">
                              <p className="text-white text-xs font-semibold truncate">{c.name}</p>
                              {c.partylist && <p className="text-slate-500 text-xs mt-0.5 truncate">{c.partylist}</p>}
                            </div>
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

      {/* Add / Edit Modal — no biodata */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Candidate' : 'Add Candidate'} size="md">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className={labelCls}>Full Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-dark" placeholder="e.g. Juan Dela Cruz" />
          </div>
          <div>
            <label className={labelCls}>Position</label>
            <SelectDropdown
              options={[
                { value: '', label: 'Select position' },
                ...positions.map((p) => ({ value: p._id, label: p.title })),
              ]}
              value={form.position_id}
              onChange={(position_id) => setForm({ ...form, position_id })}
              placeholder="Select position"
              icon={ListOrdered}
              minWidth={200}
              className="w-full"
              emptyLabel="No positions"
            />
          </div>
          <div>
            <label className={labelCls}>Partylist / Team</label>
            <input value={form.partylist} onChange={(e) => setForm({ ...form, partylist: e.target.value })}
              className="input-dark" placeholder="e.g. Team Unity" />
          </div>
          <div>
            <label className={labelCls}>Platform</label>
            <textarea rows={3} value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}
              className="input-dark" style={{ resize: 'none' }}
              placeholder="Candidate's platform and advocacies…" />
          </div>
          <div>
            <label className={labelCls}>Photo {editing && <span className="normal-case text-slate-600 ml-1">(leave blank to keep)</span>}</label>
            <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files[0])}
              className="input-dark file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-700/20 file:text-blue-300 cursor-pointer" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost" style={{ padding: '9px 16px' }}>Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary" style={{ padding: '9px 16px' }}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Candidate'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete} onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Candidate"
        message="Are you sure you want to remove this candidate? Confirm with your admin password."
        danger
        requirePassword
      />
    </div>
  )
}
