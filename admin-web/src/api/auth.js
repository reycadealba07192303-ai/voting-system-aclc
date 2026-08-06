import api from './axios'

export const loginAdmin = (email, password) =>
  api.post('/auth/admin/login', { email, password })

export const registerAdmin = (name, email, password) =>
  api.post('/auth/admin/register', { name, email, password })

export const changeAdminPassword = (current_password, new_password) =>
  api.patch('/auth/admin/change-password', { current_password, new_password })
