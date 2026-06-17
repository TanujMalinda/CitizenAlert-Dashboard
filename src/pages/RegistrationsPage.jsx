import { useEffect, useState } from 'react'
import { getRegistrations, approveRegistration, rejectRegistration } from '../api'

const STATUS_TABS = [
  { value: 'pending_approval', label: '⏳ Pending' },
  { value: 'active',           label: '✅ Approved' },
  { value: 'rejected',         label: '✗ Rejected'  },
]

export default function RegistrationsPage() {
  const [status, setStatus]   = useState('pending_approval')
  const [items, setItems]     = useState(null)
  const [error, setError]     = useState(null)
  const [busy, setBusy]       = useState(null)
  const [modal, setModal]     = useState(null) // { user, action }
  const [notes, setNotes]     = useState('')

  function load(s = status) {
    setItems(null)
    setError(null)
    getRegistrations(s)
      .then((r) => setItems(r.data))
      .catch((e) =>
        setError(e.response?.data?.error?.message || 'Failed to load registrations'))
  }

  useEffect(() => { load(status) }, [status])

  async function submitDecision() {
    const { user, action } = modal
    setBusy(user.id)
    try {
      if (action === 'approve') {
        await approveRegistration(user.id, notes || null)
      } else {
        await rejectRegistration(user.id, notes || null)
      }
      setModal(null)
      setNotes('')
      load(status)
    } catch (e) {
      alert(e.response?.data?.error?.message || e.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <h1 className="page-title">Authority Registrations</h1>
      <p className="page-sub">
        Review and approve or reject authority account requests submitted from the dashboard or mobile app.
        Approved accounts can immediately log in to the CitizenAlert system.
      </p>

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            style={{
              padding: '6px 16px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontWeight: status === tab.value ? 700 : 400,
              background: status === tab.value ? '#4fc3f7' : '#1a2332',
              color:      status === tab.value ? '#0d1b2a' : '#90a4ae',
              fontSize: 13,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <div className="empty" style={{ color: '#ef5350' }}>{error}</div>}

      {!items && !error && <div className="empty">Loading…</div>}

      {items && items.length === 0 && (
        <div className="table-wrap">
          <div className="empty">
            {status === 'pending_approval' ? '✅ No pending registrations' :
             status === 'active'           ? 'No approved authorities yet' :
                                            'No rejected registrations'}
          </div>
        </div>
      )}

      {items && items.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Designation</th>
                <th>Department</th>
                <th>Employee ID</th>
                <th>District</th>
                <th>Submitted</th>
                {status === 'pending_approval' && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id}>
                  <td>#{u.id}</td>
                  <td><strong>{u.full_name}</strong></td>
                  <td style={{ color: '#90a4ae' }}>{u.email}</td>
                  <td>{u.designation || '—'}</td>
                  <td>{u.department  || '—'}</td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontSize: 12,
                      background: '#1a2332', padding: '2px 8px', borderRadius: 4 }}>
                      {u.employee_id || '—'}
                    </span>
                  </td>
                  <td>{u.district || '—'}</td>
                  <td style={{ whiteSpace: 'nowrap', color: '#90a4ae', fontSize: 12 }}>
                    {new Date(u.created_at).toLocaleString()}
                  </td>
                  {status === 'pending_approval' && (
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        className="btn verify"
                        disabled={busy === u.id}
                        onClick={() => { setModal({ user: u, action: 'approve' }); setNotes('') }}
                      >
                        ✓ Approve
                      </button>
                      <button
                        className="btn reject"
                        disabled={busy === u.id}
                        onClick={() => { setModal({ user: u, action: 'reject' }); setNotes('') }}
                      >
                        ✗ Reject
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>
              {modal.action === 'approve' ? '✓ Approve' : '✗ Reject'} — {modal.user.full_name}
            </h2>
            <p style={{ color: '#90a4ae', fontSize: 13, margin: '4px 0 16px' }}>
              {modal.user.designation} · {modal.user.department} · ID: {modal.user.employee_id}
            </p>

            {modal.action === 'approve' ? (
              <div style={{ padding: '10px 14px', background: '#0d2b1a',
                borderRadius: 8, border: '1px solid #2e7d32', marginBottom: 16 }}>
                <p style={{ color: '#81c784', fontSize: 13, margin: 0 }}>
                  This will activate their account. They can log in immediately after approval.
                </p>
              </div>
            ) : (
              <div style={{ padding: '10px 14px', background: '#2b0d0d',
                borderRadius: 8, border: '1px solid #c62828', marginBottom: 16 }}>
                <p style={{ color: '#ef9a9a', fontSize: 13, margin: 0 }}>
                  This will block their account. They will not be able to log in.
                </p>
              </div>
            )}

            <label>Notes (optional — recorded for audit)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                modal.action === 'approve'
                  ? 'e.g. Verified via police HQ call'
                  : 'e.g. Could not verify employee ID'
              }
            />
            <div className="actions">
              <button className="btn ghost" onClick={() => setModal(null)}>Cancel</button>
              <button
                className={`btn ${modal.action === 'approve' ? 'verify' : 'reject'}`}
                disabled={busy === modal.user.id}
                onClick={submitDecision}
              >
                {busy === modal.user.id
                  ? 'Processing…'
                  : modal.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
