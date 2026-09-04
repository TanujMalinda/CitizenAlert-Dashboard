import { useEffect, useState } from 'react'
import { getTvmOverview, getAlerts, getTvmExplain } from '../api'

// Which tier each logged action belongs to, for the trace timeline colouring.
function actionKind(action) {
  const a = (action || '').toLowerCase()
  if (a.includes('fail') || a.includes('reject')) return 'bad'
  if (a.includes('reinstat')) return 'warn'
  if (a.includes('verif') || a.includes('pass') || a.includes('confirm')) return 'good'
  if (a.includes('escalat')) return 'warn'
  return 'neutral'
}

function prettyAction(a) {
  return (a || '').replace(/_/g, ' ')
}

export default function TvmMechanismPage() {
  const [ov, setOv] = useState(null)
  const [error, setError] = useState(null)

  // per-alert walkthrough
  const [alerts, setAlerts] = useState([])
  const [picked, setPicked] = useState('')
  const [ex, setEx] = useState(null)

  useEffect(() => {
    getTvmOverview()
      .then(setOv)
      .catch((e) => setError(
        e.response?.data?.error?.message || 'Failed to load TVM overview'))
    getAlerts({ limit: 200 }).then((r) => setAlerts(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!picked) { setEx(null); return }
    setEx(null)
    getTvmExplain(picked).then(setEx).catch(() => setEx(false))
  }, [picked])

  if (error) return <div className="empty">{error}</div>
  if (!ov) return <div className="empty">Loading…</div>

  const cfg = ov.config
  const bands = ov.score_bands || {}

  // Total times each action fired, for the counts shown on the flow.
  const count = (name) =>
    (ov.tier_activity || [])
      .filter((t) => (t.action || '').includes(name))
      .reduce((s, t) => s + Number(t.total || 0), 0)

  const statusCount = (s) =>
    (ov.by_status || []).find((r) => r.tvm_status === s)?.total ?? 0

  const weights = Object.entries(cfg.weights || {})

  return (
    <>
      <h1 className="page-title">TVM Mechanism</h1>
      <p className="page-sub">
        How every citizen report is verified before it reaches the public. The
        weights and thresholds below are read directly from the running
        verification service, and the counts are from live data.
      </p>

      {/* ── Structure chart ───────────────────────────────────────── */}
      <div className="tvm-flow">
        <div className="tvm-node start">
          Citizen submits a report
          <small>with location, description and optional photo</small>
        </div>

        <div className="tvm-arrow">▼</div>

        {/* TIER 1 */}
        <div className="tvm-tier">
          <div className="tvm-tier-head">
            <span className="tvm-badge t1">TIER 1</span>
            <strong>Automated filter</strong>
            <span className="tvm-fire">{count('filter')} runs</span>
          </div>
          <p className="desc" style={{ maxWidth: '100%' }}>
            Hard gates — a report must pass all of these before it is scored.
          </p>
          <ul className="tvm-checks">
            {(ov.tier1_checks || []).map((c) => <li key={c}>{c}</li>)}
          </ul>
          <div className="tvm-split">
            <span className="tvm-out bad">✗ fails → rejected ({count('filter_fail')})</span>
            <span className="tvm-out good">✓ passes ({count('filter_pass')})</span>
          </div>
        </div>

        <div className="tvm-arrow">▼</div>

        {/* TIER 2 */}
        <div className="tvm-tier">
          <div className="tvm-tier-head">
            <span className="tvm-badge t2">TIER 2</span>
            <strong>Confidence scoring</strong>
            <span className="tvm-fire">{count('score_calculated')} scored</span>
          </div>
          <p className="desc" style={{ maxWidth: '100%' }}>
            A weighted score from 0.00 to 1.00. Mean score on live data:{' '}
            <strong>{bands.mean_score ?? '—'}</strong>
          </p>

          <div className="tvm-weights">
            {weights.map(([k, v]) => (
              <div className="tvm-weight" key={k}>
                <div className="tvm-weight-label">
                  <span>{k.replace(/_/g, ' ')}</span>
                  <strong>{v}</strong>
                </div>
                <div className="tvm-bar">
                  <div className="tvm-bar-fill" style={{ width: `${v * 100 / 0.30}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* threshold routing */}
          <div className="tvm-thresholds">
            <div className="tvm-band bad">
              <strong>&lt; {cfg.authority_review_threshold}</strong>
              <span>auto-rejected</span>
              <em>{bands.auto_reject_band ?? 0} alerts</em>
            </div>
            <div className="tvm-band warn">
              <strong>{cfg.authority_review_threshold} – {cfg.auto_verify_threshold}</strong>
              <span>escalate to Tier 3</span>
              <em>{bands.review_band ?? 0} alerts</em>
            </div>
            <div className="tvm-band good">
              <strong>≥ {cfg.auto_verify_threshold}</strong>
              <span>auto-verified</span>
              <em>{bands.auto_verify_band ?? 0} alerts</em>
            </div>
          </div>
        </div>

        <div className="tvm-arrow">▼ borderline scores only</div>

        {/* TIER 3 */}
        <div className="tvm-tier">
          <div className="tvm-tier-head">
            <span className="tvm-badge t3">TIER 3</span>
            <strong>Authority review</strong>
            <span className="tvm-fire">{count('escalated')} escalated</span>
          </div>
          <p className="desc" style={{ maxWidth: '100%' }}>
            A human decides. Every decision is written to the audit log with a
            reason, and a rejection can later be overturned.
          </p>
          <div className="tvm-split">
            <span className="tvm-out good">✓ verified ({count('authority_verif')})</span>
            <span className="tvm-out bad">✗ rejected ({count('authority_reject')})</span>
            <span className="tvm-out warn">↺ reinstated ({count('reinstat')})</span>
          </div>
        </div>

        <div className="tvm-arrow">▼</div>

        <div className="tvm-node end">
          Published to citizens in the affected area
          <small>
            {statusCount('verified')} verified · {statusCount('passed')} passed ·{' '}
            {statusCount('rejected')} rejected
          </small>
        </div>
      </div>

      {/* ── Risk-proportional routing ──────────────────────────────── */}
      <h2 className="page-title" style={{ fontSize: 18, marginTop: 34 }}>
        Risk-proportional routing
      </h2>
      <p className="page-sub">
        Verification strictness is matched to what a false alarm would cost, so
        each hazard takes a different path.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Hazard</th><th>Tier</th><th>Path</th><th>Why</th></tr>
          </thead>
          <tbody>
            {(ov.routing || []).map((r) => (
              <tr key={r.hazard}>
                <td><span className="badge type">{r.hazard}</span></td>
                <td><span className="badge medium">{r.tier}</span></td>
                <td>{r.path}</td>
                <td className="muted">{r.rationale}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Per-alert trace ────────────────────────────────────────── */}
      <h2 className="page-title" style={{ fontSize: 18, marginTop: 34 }}>
        Why did this alert get its score?
      </h2>
      <p className="page-sub">
        Pick any alert to see every check it went through, how many points each
        factor contributed, and what finally happened to it.
      </p>

      <div className="filters">
        <select value={picked} onChange={(e) => setPicked(e.target.value)}
                style={{ minWidth: 420 }}>
          <option value="">Select an alert…</option>
          {alerts.map((a) => (
            <option key={a.id} value={a.id}>
              #{a.id} · {a.alert_type} · {(a.title || '(untitled)').slice(0, 55)}
            </option>
          ))}
        </select>
      </div>

      {picked && ex === null && <div className="empty">Loading…</div>}
      {ex === false && (
        <div className="table-wrap"><div className="empty">Could not load that alert.</div></div>
      )}

      {ex && (
        <>
          {ex.stages.length === 0 ? (
            <div className="table-wrap">
              <div className="empty">
                No verification steps were logged for this alert — it was created
                before TVM logging, or published directly by an authority.
              </div>
            </div>
          ) : (
            <div className="tvm-flow">
              {ex.stages.map((s) => {
                /* ── TIER 1 ─────────────────────────────────────── */
                if (s.tier === 1) return (
                  <div className={`tvm-tier ${s.outcome === 'passed' ? 'ok' : 'no'}`} key="s1">
                    <div className="tvm-tier-head">
                      <span className="tvm-badge t1">TIER 1</span>
                      <strong>{s.headline}</strong>
                      <span className="tvm-fire">
                        {s.at && new Date(s.at).toLocaleString()}
                      </span>
                    </div>
                    <ul className="tvm-checks">
                      {s.checks.map((c) => (
                        <li key={c}>
                          {s.outcome === 'passed' ? '✓' : '•'} {c}
                        </li>
                      ))}
                    </ul>
                    {s.detail && (
                      <div className="desc" style={{ maxWidth: '100%' }}>{s.detail}</div>
                    )}
                  </div>
                )

                /* ── TIER 2 — the arithmetic ────────────────────── */
                if (s.tier === 2) return (
                  <div className="tvm-tier" key="s2">
                    <div className="tvm-tier-head">
                      <span className="tvm-badge t2">TIER 2</span>
                      <strong>Score: {s.score}</strong>
                      <span className="tvm-fire">
                        {s.at && new Date(s.at).toLocaleString()}
                      </span>
                    </div>

                    {s.breakdown_available ? (
                      <>
                        <table className="tvm-calc">
                          <thead>
                            <tr>
                              <th>Factor</th><th>What it measures</th>
                              <th>Value</th><th>Weight</th><th>Points</th>
                            </tr>
                          </thead>
                          <tbody>
                            {s.factors.map((f) => (
                              <tr key={f.factor}>
                                <td><strong>{f.label}</strong></td>
                                <td className="muted" style={{ fontSize: 12 }}>
                                  {f.means}
                                  {f.note && <div className="tvm-hint">{f.note}</div>}
                                </td>
                                <td>{f.value.toFixed(2)}</td>
                                <td className="muted">× {f.weight}</td>
                                <td>
                                  <strong>{f.points.toFixed(3)}</strong>
                                  <div className="tvm-bar" style={{ marginTop: 4 }}>
                                    <div className="tvm-bar-fill"
                                         style={{ width: `${(f.points / f.max_points) * 100}%` }} />
                                  </div>
                                </td>
                              </tr>
                            ))}
                            <tr className="tvm-total">
                              <td colSpan={4}><strong>Total confidence score</strong></td>
                              <td><strong>{s.total_points}</strong></td>
                            </tr>
                          </tbody>
                        </table>

                        {/* where the score landed */}
                        <div className="tvm-ruler">
                          <div className="tvm-ruler-track">
                            <div className="seg bad"  style={{ flex: cfg.authority_review_threshold }} />
                            <div className="seg warn" style={{ flex: cfg.auto_verify_threshold - cfg.authority_review_threshold }} />
                            <div className="seg good" style={{ flex: 1 - cfg.auto_verify_threshold }} />
                            <div className="tvm-ruler-pin" style={{ left: `${s.score * 100}%` }}>
                              <span>{s.score}</span>
                            </div>
                          </div>
                          <div className="tvm-ruler-labels">
                            <span>0.00 · reject</span>
                            <span>{cfg.authority_review_threshold} · review</span>
                            <span>{cfg.auto_verify_threshold} · auto-verify</span>
                            <span>1.00</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="desc" style={{ maxWidth: '100%' }}>{s.detail}</div>
                    )}

                    {s.band && (
                      <div className={`tvm-verdict ${s.band.key === 'auto_verify' ? 'good'
                        : s.band.key === 'review' ? 'warn' : 'bad'}`}>
                        <strong>{s.band.label}</strong>
                        <span>Score fell in {s.band.range}. {s.band.meaning}</span>
                      </div>
                    )}
                  </div>
                )

                /* ── TIER 3 — human / community decisions ───────── */
                return (
                  <div className="tvm-tier" key="s3">
                    <div className="tvm-tier-head">
                      <span className="tvm-badge t3">TIER 3</span>
                      <strong>{s.name}</strong>
                    </div>
                    <div className="tvm-trace" style={{ background: 'transparent', padding: 0 }}>
                      {s.events.map((e, i) => (
                        <div className={`tvm-step ${actionKind(e.action)}`} key={i}>
                          <div className="tvm-step-dot" />
                          <div className="tvm-step-body">
                            <div className="tvm-step-head">
                              <strong>{prettyAction(e.label)}</strong>
                              <span className="muted" style={{ fontSize: 11 }}>
                                {new Date(e.at).toLocaleString()}
                              </span>
                            </div>
                            {e.notes && (
                              <div className="desc" style={{ maxWidth: '100%' }}>{e.notes}</div>
                            )}
                            <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                              by {e.actor}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              <div className={`tvm-node ${ex.outcome.public ? 'end' : ''}`}>
                {ex.outcome.public ? '✓ ' : '• '}{ex.outcome.plain}
                <small>Current status: {ex.outcome.tvm_status}</small>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
