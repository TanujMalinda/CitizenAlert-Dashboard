import { useEffect, useState } from 'react'
import { getTvmLog } from '../api'

export default function TvmLogPage() {
  const [logs, setLogs] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getTvmLog({ limit: 200 }).then((r) => setLogs(r.data)).catch((e) =>
      setError(e.response?.data?.detail || 'Failed to load TVM log'))
  }, [])

  if (error) return <div className="empty">{error}</div>
  if (!logs) return <div className="empty">Loading…</div>

  return (
    <>
      <h1 className="page-title">TVM Audit Log</h1>
      <p className="page-sub">
        Every decision made by the Tiered Verification Mechanism — used for
        Section 4.6 evaluation metrics (accuracy, false-positive reduction, verification time)
      </p>

      {logs.length === 0 ? (
        <div className="table-wrap"><div className="empty">No TVM log entries yet</div></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Alert</th>
                <th>Tier</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Notes</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>#{l.id}</td>
                  <td>
                    {l.alert_id ? (
                      <>
                        #{l.alert_id} {l.alert_type && <span className="badge type">{l.alert_type}</span>}
                        <div className="desc">{l.alert_title}</div>
                      </>
                    ) : '—'}
                  </td>
                  <td><span className="badge medium">Tier {l.tier}</span></td>
                  <td>{l.action}</td>
                  <td>{l.actor_name || 'System'}</td>
                  <td className="desc">{l.notes || '—'}</td>
                  <td>{new Date(l.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
