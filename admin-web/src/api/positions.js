import api from './axios'

export const getPositions = (electionId) =>
  api.get(`/elections/${electionId}/positions`)
export const createPosition = (electionId, data) =>
  api.post(`/elections/${electionId}/positions`, data)
export const updatePosition = (electionId, positionId, data) =>
  api.put(`/elections/${electionId}/positions/${positionId}`, data)
export const deletePosition = (electionId, positionId) =>
  api.delete(`/elections/${electionId}/positions/${positionId}`)
