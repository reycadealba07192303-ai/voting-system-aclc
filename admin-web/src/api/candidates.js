import api from './axios'

export const getCandidates = (electionId) =>
  api.get(`/elections/${electionId}/candidates`)
export const createCandidate = (electionId, data) =>
  api.post(`/elections/${electionId}/candidates`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
export const updateCandidate = (electionId, candidateId, data) =>
  api.put(`/elections/${electionId}/candidates/${candidateId}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
export const deleteCandidate = (electionId, candidateId, password) =>
  api.delete(`/elections/${electionId}/candidates/${candidateId}`, { data: { password } })
