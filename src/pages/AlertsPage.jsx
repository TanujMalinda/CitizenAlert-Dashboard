import { useEffect, useState } from 'react'
import { getAlerts, resolveAlert } from '../api'

const ALERT_TYPES = ['missing_person', 'disaster', 'crime', 'traffic', 'health']
const STATUSES = ['active', 'resolved', 'cancelled']
const TVM_STATUSES = [
  'pending', 'passed', 'verified',
  'pending_authority_review', 'pending_consensus', 'rejected',
]

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null)
  const [filters, setFilters] = useState({ alert_type: '', status: '', tvm_status: '' })

  function load() {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== '')
    )
    getAlerts(params).then((r) => setAlerts(r.data)).catch((e) =>
      setError(e.response?.data?.detail || 'Failed to load alerts'))
  }

  useEffect(load, [filters])

  async function handleResolve(alert_) {
    if (!confirm(`Resolve alert #${alert_.id} — "${alert_.title}"?`)) return
    setBusy(alert_.id)
    try {
      await resolveAlert(alert_.alert_type, alert_.id)
      load()
    } catch (e) {
      alert(e.response?.data?.detail || e.message)
    } finally {
      setBusy(null)
    }
  }

  if (error) return <div className="empty">{error}</div>

  return (
    <>
      <h1 className="page-title">All Alerts</h1>
      <p className="page-sub">Island-wide alert registry across all categories (UADM)</p>

      <div className="filters">
        <select
          value={filters.alert_type}
          onChange={(e) => setFilters({ ...filters, alert_type: e.target.value })}
        >
          <option value="">All types</option>
          {ALERT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filters.tvm_status}
          onChange={(e) => setFilters({ ...filters, tvm_status: e.target.value })}
        >
          <option value="">All TVM statuses</option>
          {TVM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {!alerts ? (
        <div className="empty">Loading…</div>
      ) : alerts.length === 0 ? (
        <div className="table-wrap"><div className="empty">No alerts match these filters</div></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Title</th>
                <th>Severity</th>
                <th>Status</th>
                <th>TVM</th>
                <th>District</th>
                <th>Reporter</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id}>
                  <td>#{a.id}</td>
                  <td><span className="badge type">{a.alert_type}</span></td>
                  <td>
                    <strong>{a.title}</strong>
                    <div className="desc">{a.description}</div>
                  </td>
                  <td><span className={`badge ${a.severity}`}>{a.severity}</span></td>
                  <td><span className={`badge ${a.status}`}>{a.status}</span></td>
                  <td><span className={`badge ${a.tvm_status}`}>{a.tvm_status}</span></td>
                  <td>{a.district || '—'}</td>
                  <td>{a.reporter_name || '—'}</td>
                  <td>{new Date(a.created_at).toLocaleDateString()}</td>
                  <td>
                    {a.status === 'active' && (
                      <button
                        className="btn ghost"
                        disabled={busy === a.id}
                        onClick={() => handleResolve(a)}
                      >
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
