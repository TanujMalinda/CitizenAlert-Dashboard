import { useEffect, useState } from 'react'
import { getPending, reviewAlert, resolveAlert } from '../api'

const REVIEWABLE = ['crime', 'health']

export default function ReviewQueuePage() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null) // alert id being acted on
  const [notesFor, setNotesFor] = useState(null) // { id, type, action }
  const [notes, setNotes] = useState('')

  function load() {
    getPending().then((r) => setItems(r.data)).catch((e) =>
      setError(e.response?.data?.detail || 'Failed to load review queue'))
  }

  useEffect(load, [])

  async function submitReview() {
    const { id, type, action } = notesFor
    setBusy(id)
    try {
      await reviewAlert(type, id, action, notes || null)
      setNotesFor(null)
      setNotes('')
      load()
    } catch (e) {
      alert(e.response?.data?.detail || e.message)
    } finally {
      setBusy(null)
    }
  }

  async function handleResolve(item) {
    if (!confirm(`Resolve alert #${item.id} — "${item.title}"?`)) return
    setBusy(item.id)
    try {
      await resolveAlert(item.alert_type, item.id)
      load()
    } catch (e) {
      alert(e.response?.data?.detail || e.message)
    } finally {
      setBusy(null)
    }
  }

  if (error) return <div className="empty">{error}</div>
  if (!items) return <div className="empty">Loading…</div>

  return (
    <>
      <h1 className="page-title">TVM Review Queue — Tier 3</h1>
      <p className="page-sub">
        Alerts escalated for mandatory authority review, ordered by severity then age.
        Verify to publish publicly; reject to remove from the public feed.
      </p>

      {items.length === 0 ? (
        <div className="table-wrap"><div className="empty">✅ No alerts pending review</div></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Title / Description</th>
                <th>Severity</th>
                <th>District</th>
                <th>Reporter</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>#{item.id}</td>
                  <td><span className="badge type">{item.alert_type}</span></td>
                  <td>
                    <strong>{item.title}</strong>
                    <div className="desc">{item.description}</div>
                    <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                      📍 {item.latitude?.toFixed(4)}, {item.longitude?.toFixed(4)}
                    </div>
                  </td>
                  <td><span className={`badge ${item.severity}`}>{item.severity}</span></td>
                  <td>{item.district || '—'}</td>
                  <td>{item.reporter_name || 'Anonymous'}</td>
                  <td>{new Date(item.created_at).toLocaleString()}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {REVIEWABLE.includes(item.alert_type) ? (
                      <>
                        <button
                          className="btn verify"
                          disabled={busy === item.id}
                          onClick={() => setNotesFor({ id: item.id, type: item.alert_type, action: 'verify' })}
                        >
                          ✓ Verify
                        </button>
                        <button
                          className="btn reject"
                          disabled={busy === item.id}
                          onClick={() => setNotesFor({ id: item.id, type: item.alert_type, action: 'reject' })}
                        >
                          ✗ Reject
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn ghost"
                        disabled={busy === item.id}
                        onClick={() => handleResolve(item)}
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

      {notesFor && (
        <div className="modal-overlay" onClick={() => setNotesFor(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>
              {notesFor.action === 'verify' ? '✓ Verify' : '✗ Reject'} alert #{notesFor.id}
            </h2>
            <label>Review notes (recorded in TVM audit log)</label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes for the audit trail…"
            />
            <div className="actions">
              <button className="btn ghost" onClick={() => setNotesFor(null)}>Cancel</button>
              <button
                className={`btn ${notesFor.action === 'verify' ? 'verify' : 'reject'}`}
                disabled={busy === notesFor.id}
                onClick={submitReview}
              >
                Confirm {notesFor.action}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
