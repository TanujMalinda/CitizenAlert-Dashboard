import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getStats } from '../api'
import { DonutChart, BarChart, LineChart } from '../components/Charts'

const TYPE_LABELS = {
  missing_person: 'Missing Persons',
  disaster: 'Disasters',
  crime: 'Crime Reports',
  traffic: 'Traffic Hazards',
  health: 'Public Health',
}

const TYPE_COLORS = {
  missing_person: '#4FC3F7',
  disaster: '#FFA726',
  crime: '#EF5350',
  traffic: '#FFB74D',
  health: '#66BB6A',
}

// Short weekday + day-of-month label, e.g. "Mon 7"
function dayLabel(iso) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
}

// Back-fill the last 14 days so the trend line has no gaps even on quiet days.
function buildDailySeries(daily) {
  const counts = Object.fromEntries((daily || []).map((d) => [d.day, Number(d.total)]))
  const out = []
  const today = new Date()
  for (let i = 13; i >= 0; i--) {
    const dt = new Date(today)
    dt.setDate(today.getDate() - i)
    const iso = dt.toISOString().slice(0, 10)
    out.push({ label: dayLabel(iso), value: counts[iso] || 0 })
  }
  return out
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

  // ── Chart data (all derived from real /stats aggregates) ──────────
  const typeData = Object.entries(TYPE_LABELS)
    .map(([key, label]) => ({
      label,
      value: stats.by_type[key]?.total ?? 0,
      color: TYPE_COLORS[key],
    }))

  const reviewData = [
    { label: 'Verified', value: t.verified ?? 0, color: '#66BB6A' },
    { label: 'Pending Review', value: t.pending_review ?? 0, color: '#FFA726' },
    { label: 'Rejected', value: t.rejected ?? 0, color: '#EF5350' },
  ]

  const districtData = (stats.by_district || []).map((d) => ({
    label: d.district,
    value: Number(d.total),
  }))
  const topDistrict = districtData[0]

  const dailySeries = buildDailySeries(stats.daily)

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
      <div className="table-wrap" style={{ marginTop: 12, marginBottom: 28 }}>
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

      {/* ── Charts ─────────────────────────────────────────────────── */}
      <div className="chart-grid">
        <section className="chart-card wide">
          <h3 className="chart-title">Alert Volume — last 14 days</h3>
          <LineChart data={dailySeries} color="#4FC3F7" />
        </section>

        <section className="chart-card">
          <h3 className="chart-title">Alerts by Category</h3>
          <DonutChart data={typeData} />
        </section>

        <section className="chart-card">
          <h3 className="chart-title">
            Most Affected Areas
            {topDistrict && (
              <span className="chart-note"> · {topDistrict.label} leads</span>
            )}
          </h3>
          <BarChart data={districtData} color="#FFA726" />
        </section>

        <section className="chart-card">
          <h3 className="chart-title">Review Status</h3>
          <DonutChart data={reviewData} />
        </section>
      </div>
    </>
  )
}
