import { useEffect, useState } from 'react'
import { getReviewedAlerts, reinstateAlert } from '../api'

const ALERT_TYPES = ['missing_person', 'disaster', 'crime', 'traffic', 'health']

// The API returns errors as { error: { message } }; older handlers use { detail }.
function errMsg(e, fallback) {
  return e.response?.data?.error?.message
      || e.response?.data?.detail
      || fallback
      || e.message
}

// Turn a raw tvm_log action into a readable decision label.
function decisionLabel(action) {
  const a = (action || '').toLowerCase()
  if (a.includes('reinstat')) return 'Reinstated by authority'
  if (a.includes('reject') || a.includes('fail')) return 'Rejected'
  if (a.includes('consensus')) return 'Auto-verified by crowd consensus'
  if (a.includes('auto_verified')) return 'Auto-verified'
  if (a.includes('verif')) return 'Verified by authority'
  if (a.includes('pass')) return 'Passed automated checks'
  return action || '—'
}

export default function ReviewedAlertsPage() {
  const [tab, setTab] = useState('accepted')
  const [type, setType] = useState('')
  const [rows, setRows] = useState(null)
  const [counts, setCounts] = useState({ accepted: 0, rejected: 0 })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null)
  const [photo, setPhoto] = useState(null)
  const [confirmFor, setConfirmFor] = useState(null) // alert being reinstated
  const [notes, setNotes] = useState('')

  function load() {
    setRows(null)
    setError(null)
    const params = { decision: tab, limit: 500 }
    if (type) params.alert_type = type
    getReviewedAlerts(params)
      .then((r) => {
        setRows(r.data)
        if (r.counts) setCounts(r.counts)
      })
      .catch((e) => setError(errMsg(e, 'Failed to load reviewed alerts')))
  }

  useEffect(load, [tab, type])

  async function submitReinstate() {
    const a = confirmFor
    setBusy(a.id)
    try {
      await reinstateAlert(a.id, notes || null)
      setConfirmFor(null)
      setNotes('')
      load()
    } catch (e) {
      alert(errMsg(e))
    } finally {
      setBusy(null)
    }
  }

  const rejected = tab === 'rejected'

  return (
    <>
      <h1 className="page-title">Reviewed Alerts</h1>
      <p className="page-sub">
        Every alert that has been through verification. Rejected alerts show why they
        were turned down and can be accepted if the decision was wrong.
      </p>

      <div className="tabs">
        <button
          className={`tab ${tab === 'accepted' ? 'active' : ''}`}
          onClick={() => setTab('accepted')}
        >
          ✓ Accepted <span className="tab-count">{counts.accepted}</span>
        </button>
        <button
          className={`tab ${tab === 'rejected' ? 'active' : ''}`}
          onClick={() => setTab('rejected')}
        >
          ✗ Rejected <span className="tab-count">{counts.rejected}</span>
        </button>
      </div>

      <div className="filters">
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {ALERT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {error ? (
        <div className="table-wrap"><div className="empty">{error}</div></div>
      ) : !rows ? (
        <div className="empty">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="table-wrap">
          <div className="empty">
            {rejected
              ? '✅ No rejected alerts — nothing has been turned down yet'
              : 'No accepted alerts match this filter'}
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Title / Description</th>
                <th>Severity</th>
                <th>{rejected ? 'Reason for rejection' : 'How it was accepted'}</th>
                <th>Decided by</th>
                <th>District</th>
                <th>Reporter</th>
                {rejected && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>#{a.id}</td>
                  <td><span className="badge type">{a.alert_type}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      {a.photo_url && (
                        <img
                          src={a.photo_url}
                          alt="evidence"
                          onClick={() => setPhoto(a.photo_url)}
                          style={{
                            width: 44, height: 44, borderRadius: 8,
                            objectFit: 'cover', cursor: 'pointer',
                            border: '1px solid #2a3f52', flexShrink: 0,
                          }}
                        />
                      )}
                      <div>
                        <strong>{a.title || '(untitled)'}</strong>
                        <div className="desc">{a.description}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className={`badge ${a.severity}`}>{a.severity}</span></td>
                  <td style={{ maxWidth: 300 }}>
                    <span className={`badge ${rejected ? 'rejected' : 'verified'}`}>
                      {decisionLabel(a.decision_action)}
                    </span>
                    {a.decision_reason && (
                      <div className="desc" style={{ marginTop: 5 }}>
                        {a.decision_reason}
                      </div>
                    )}
                    {!a.decision_reason && !a.decision_action && (
                      <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                        No reason recorded
                      </div>
                    )}
                  </td>
                  <td>
                    {a.decided_by || '—'}
                    {a.decided_at && (
                      <div className="muted" style={{ fontSize: 11 }}>
                        {new Date(a.decided_at).toLocaleString()}
                      </div>
                    )}
                  </td>
                  <td>{a.district || '—'}</td>
                  <td>{a.reporter_name || 'Anonymous'}</td>
                  {rejected && (
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        className="btn verify"
                        disabled={busy === a.id}
                        onClick={() => { setConfirmFor(a); setNotes('') }}
                      >
                        ✓ Accept anyway
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmFor && (
        <div className="modal-overlay" onClick={() => setConfirmFor(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>✓ Accept rejected alert #{confirmFor.id}</h2>
            <p className="desc" style={{ maxWidth: '100%' }}>
              This overturns the rejection and publishes “{confirmFor.title || 'this alert'}”
              to citizens. The original rejection stays in the audit log.
            </p>
            {confirmFor.decision_reason && (
              <>
                <label>Original rejection reason</label>
                <div className="desc" style={{ maxWidth: '100%' }}>
                  {confirmFor.decision_reason}
                </div>
              </>
            )}
            <label>Why is this being accepted? (recorded in the audit log)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Verified with the reporter — the automated check was wrong"
            />
            <div className="actions">
              <button className="btn ghost" onClick={() => setConfirmFor(null)}>Cancel</button>
              <button
                className="btn verify"
                disabled={busy === confirmFor.id}
                onClick={submitReinstate}
              >
                Confirm accept
              </button>
            </div>
          </div>
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
            alt="evidence"
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
