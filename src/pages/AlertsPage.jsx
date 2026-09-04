import { useEffect, useState } from 'react'
import { getAlerts, resolveAlert } from '../api'

const ALERT_TYPES = ['missing_person', 'disaster', 'crime', 'traffic', 'health']
const STATUSES = ['active', 'resolved', 'cancelled']
const TVM_STATUSES = [
  'pending', 'passed', 'verified',
  'pending_authority_review', 'pending_consensus', 'rejected',
]

// Turn a raw tvm_log action ("authority_rejectd", "tier1_failed") into a label.
function reviewOutcome(a) {
  const act = (a.review_action || '').toLowerCase()
  if (a.tvm_status === 'rejected' || act.includes('reject') || act.includes('fail'))
    return { label: 'Rejected', cls: 'rejected' }
  if (['verified', 'passed'].includes(a.tvm_status) || act.includes('verif') || act.includes('pass'))
    return { label: 'Accepted', cls: 'verified' }
  if ((a.tvm_status || '').startsWith('pending'))
    return { label: 'Pending', cls: 'pending_authority_review' }
  return null
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null)
  const [photo, setPhoto] = useState(null) // photo URL shown in lightbox
  const [filters, setFilters] = useState({ alert_type: '', status: '', tvm_status: '' })

  function load() {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== '')
    )
    params.limit = 500 // show all incidents, including rejected & duplicates
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
                <th>Review / Reason</th>
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
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      {a.photo_url && (
                        <img
                          src={a.photo_url}
                          alt="reported person"
                          onClick={() => setPhoto(a.photo_url)}
                          style={{
                            width: 44, height: 44, borderRadius: 8,
                            objectFit: 'cover', cursor: 'pointer',
                            border: '1px solid #2a3f52', flexShrink: 0,
                          }}
                        />
                      )}
                      <div>
                        <strong>{a.title}</strong>
                        <div className="desc">{a.description}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className={`badge ${a.severity}`}>{a.severity}</span></td>
                  <td><span className={`badge ${a.status}`}>{a.status}</span></td>
                  <td><span className={`badge ${a.tvm_status}`}>{a.tvm_status}</span></td>
                  <td style={{ maxWidth: 260 }}>
                    {(() => {
                      const o = reviewOutcome(a)
                      if (!o && !a.review_notes) return <span className="muted">—</span>
                      return (
                        <>
                          {o && <span className={`badge ${o.cls}`}>{o.label}</span>}
                          {a.review_notes && (
                            <div className="desc" style={{ marginTop: 4 }}>{a.review_notes}</div>
                          )}
                          {(a.reviewer_name || a.reviewed_at) && (
                            <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                              {a.reviewer_name || 'Automated TVM'}
                              {a.reviewed_at && ` · ${new Date(a.reviewed_at).toLocaleDateString()}`}
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </td>
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

      {photo && (
        <div
          onClick={() => setPhoto(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, cursor: 'zoom-out',
          }}
        >
          <img
            src={photo}
            alt="reported person"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12,
              boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
            }}
          />
        </div>
      )}
    </>
  )
}
