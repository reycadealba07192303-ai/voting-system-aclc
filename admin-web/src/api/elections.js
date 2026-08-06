import api from './axios'

export const getElections = () => api.get('/elections')
export const getElection = (id) => api.get(`/elections/${id}`)
export const createElection = (data) => api.post('/elections', data)
export const updateElection = (id, data) => api.put(`/elections/${id}`, data)
export const deleteElection = (id, password) =>
  api.delete(`/elections/${id}`, { data: { password } })
export const openElection = (id) => api.patch(`/elections/${id}/open`)
export const closeElection = (id, password) =>
  api.patch(`/elections/${id}/close`, { password })
