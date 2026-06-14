import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getStats } from '../api'

const TYPE_LABELS = {
  missing_person: 'Missing Persons',
  disaster: 'Disasters',
  crime: 'Crime Reports',
  traffic: 'Traffic Hazards',
  health: 'Public Health',
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getStats().then(setStats).catch((e) =>
      setError(e.response?.data?.detail || 'Failed to load stats'))
  }, [])

  if (error) return <div className="empty">{error}</div>
  if (!stats) return <div className="empty">Loading…</div>

  const t = stats.totals

  return (
    <>
      <h1 className="page-title">Overview</h1>
      <p className="page-sub">System-wide alert statistics across all five public safety domains</p>

      <div className="cards">
        <div className="card accent">
          <div className="label">Total Alerts</div>
          <div className="value">{t.total ?? 0}</div>
        </div>
        <div className="card ok">
          <div className="label">Active</div>
          <div className="value">{t.active ?? 0}</div>
        </div>
        <div className="card warn">
          <div className="label">Pending Review</div>
          <div className="value">{t.pending_review ?? 0}</div>
        </div>
        <div className="card ok">
          <div className="label">Verified</div>
          <div className="value">{t.verified ?? 0}</div>
        </div>
        <div className="card bad">
          <div className="label">Rejected</div>
          <div className="value">{t.rejected ?? 0}</div>
        </div>
        <div className="card accent">
          <div className="label">Registered Users</div>
          <div className="value">{stats.registered_users}</div>
        </div>
      </div>

      {t.pending_review > 0 && (
        <p className="mb-24">
          ⚠️ <strong>{t.pending_review}</strong> alert(s) awaiting Tier-3 authority review —{' '}
          <Link to="/review">open the Review Queue →</Link>
        </p>
      )}

      <h2 className="page-title" style={{ fontSize: 17 }}>By Alert Category</h2>
      <div className="table-wrap" style={{ marginTop: 12 }}>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Total</th>
              <th>Active</th>
              <th>Pending Review</th>
              <th>Verified</th>
              <th>Rejected</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(TYPE_LABELS).map(([key, label]) => {
              const row = stats.by_type[key]
              return (
                <tr key={key}>
                  <td><span className="badge type">{label}</span></td>
                  <td>{row?.total ?? 0}</td>
                  <td>{row?.active ?? 0}</td>
                  <td>{row?.pending_review ?? 0}</td>
                  <td>{row?.verified ?? 0}</td>
                  <td>{row?.rejected ?? 0}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
