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
  if (res.data.user.role !== 'authority') {
    throw new Error('Access denied — authority accounts only')
  }
  localStorage.setItem('jwt_token', res.data.token)
  localStorage.setItem('user_name', res.data.user.full_name)
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

// ── Review actions (per alert type) ───────────────────────────────
export function reviewAlert(alertType, alertId, action, notes) {
  if (alertType === 'crime') {
    return api.post(`/crime-reports/${alertId}/review`, { action, notes })
  }
  if (alertType === 'health') {
    return api.post(`/public-health/${alertId}/review`, { action, notes })
  }
  // missing_person / traffic pending items are resolved via their own routes;
  // for review queue purposes treat verify/reject via crime-style review when available
  return Promise.reject(new Error(`No review endpoint for type: ${alertType}`))
}

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
