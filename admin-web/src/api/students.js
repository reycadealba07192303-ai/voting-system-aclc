import api from './axios'

export const getStudents = (params) => api.get('/students', { params })
export const createStudent = (data) => api.post('/students', data)
export const updateStudent = (id, data) => api.put(`/students/${id}`, data)
export const deleteStudent = (id) => api.delete(`/students/${id}`)
export const resetStudentPassword = (id) =>
  api.patch(`/students/${id}/reset-password`)

/** View-only ballot — available after the election is closed. */
export const getStudentBallot = (id) => api.get(`/students/${id}/ballot`)

export const getSectionsByLevel = () => api.get('/students/sections-by-level')

/** Import CSV or Excel. Pass `section`/`level` to force values for 2-column files. */
export const importStudents = (file, section, level) => {
  const form = new FormData()
  form.append('file', file)
  if (section) form.append('section', section)
  if (level) form.append('level', level)
  return api.post('/students/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
