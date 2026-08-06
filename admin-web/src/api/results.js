import api from './axios'

export const getResults = (electionId) =>
  api.get(`/elections/${electionId}/results`)

export const getSectionMonitoring = (electionId) =>
  api.get(`/elections/${electionId}/results/monitoring`)

export const getDashboardStats = () => api.get('/dashboard')
