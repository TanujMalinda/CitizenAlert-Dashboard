import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:8000/api' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.clear()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────
export async function login(email, password) {
  const res = await api.post('/auth/login', { email, password })
  if (!['authority', 'super_admin'].includes(res.data.user.role)) {
    throw new Error('Access denied — authority accounts only')
  }
  localStorage.setItem('jwt_token', res.data.token)
  localStorage.setItem('user_name', res.data.user.full_name)
  localStorage.setItem('user_role', res.data.user.role)
  return res.data
}

export async function registerAuthority(data) {
  const res = await api.post('/auth/register-authority', data)
  return res.data
}

export function logout() {
  localStorage.clear()
}

export function isLoggedIn() {
  return !!localStorage.getItem('jwt_token')
}

export function userName() {
  return localStorage.getItem('user_name') || 'Authority'
}

// ── Authority Dashboard ───────────────────────────────────────────
export const getStats   = () => api.get('/authority/stats').then(r => r.data)
export const getPending = () => api.get('/authority/pending').then(r => r.data)
export const getAlerts  = (params) => api.get('/authority/alerts', { params }).then(r => r.data)
export const getTvmLog  = (params) => api.get('/authority/tvm-log', { params }).then(r => r.data)

// Accepted / rejected decision history. decision: 'accepted' | 'rejected'
export const getReviewedAlerts = (params) =>
  api.get('/authority/reviewed', { params }).then(r => r.data)

// TVM configuration + live pipeline figures (powers the TVM Mechanism page)
export const getTvmOverview = () =>
  api.get('/authority/tvm-overview').then(r => r.data)

// Step-by-step scoring walkthrough for one alert
export const getTvmExplain = (alertId) =>
  api.get(`/authority/alerts/${alertId}/tvm-explain`).then(r => r.data)

// ── Review actions ────────────────────────────────────────────────
export function reviewAlert(alertType, alertId, action, notes) {
  // Unified authority review endpoint handles all alert types
  return api.post(`/authority/alerts/${alertId}/review`, { action, notes })
}

// Overturn a rejection — republishes the alert and records the override.
export const reinstateAlert = (alertId, notes) =>
  api.post(`/authority/alerts/${alertId}/reinstate`, { notes }).then(r => r.data)

// Set/clear an alert's CAP-style affected area.
// payload: { mode: 'polygon'|'line_buffer'|'clear', coordinates: [[lat,lng],...], buffer_m }
export const setAlertArea = (alertId, payload) =>
  api.post(`/authority/alerts/${alertId}/area`, payload).then(r => r.data)

// ── Authority Registration Management (super_admin only) ──────────
export const getRegistrations = (status = 'pending_approval') =>
  api.get('/authority/registrations', { params: { status } }).then(r => r.data)

export const approveRegistration = (userId, notes) =>
  api.post(`/authority/registrations/${userId}/approve`, { notes }).then(r => r.data)

export const rejectRegistration = (userId, notes) =>
  api.post(`/authority/registrations/${userId}/reject`, { notes }).then(r => r.data)

export function resolveAlert(alertType, alertId) {
  if (alertType === 'crime') {
    return api.patch(`/crime-reports/${alertId}/resolve`)
  }
  if (alertType === 'missing_person') {
    return api.patch(`/missing-persons/${alertId}/resolve`)
  }
  if (alertType === 'disaster') {
    return api.patch(`/disaster-alerts/${alertId}/status`, { status: 'resolved' })
  }
  if (alertType === 'health') {
    return api.patch(`/public-health/${alertId}/status`, { status: 'resolved' })
  }
  if (alertType === 'traffic') {
    return api.patch(`/traffic-hazards/${alertId}/resolve`, { status: 'resolved' })
  }
  return Promise.reject(new Error(`Unknown alert type: ${alertType}`))
}

export function createDisasterAlert(data) {
  return api.post('/disaster-alerts/', data).then(r => r.data)
}

export default api
