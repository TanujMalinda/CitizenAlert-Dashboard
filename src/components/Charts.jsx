/*
 * Lightweight, dependency-free SVG charts for the Authority Dashboard.
 * Styled to match the dark mobile-app theme (see styles.css :root vars).
 */

// ── Donut / pie ──────────────────────────────────────────────────────────────
// data: [{ label, value, color }]
export function DonutChart({ data, size = 180, thickness = 34 }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const r = (size - thickness) / 2
  const cx = size / 2
  const cy = size / 2
  const circ = 2 * Math.PI * r

  if (total === 0) {
    return <div className="chart-empty">No data yet</div>
  }

  let offset = 0
  const segments = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const frac = d.value / total
      const seg = (
        <circle
          key={d.label}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={d.color}
          strokeWidth={thickness}
          strokeDasharray={`${frac * circ} ${circ}`}
          strokeDashoffset={-offset * circ}
          transform={`rotate(-90 ${cx} ${cy})`}
        >
          <title>{`${d.label}: ${d.value} (${Math.round(frac * 100)}%)`}</title>
        </circle>
      )
      offset += frac
      return seg
    })

  return (
    <div className="donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#16273a" strokeWidth={thickness} />
        {segments}
        <text x={cx} y={cy - 4} textAnchor="middle" className="donut-total">{total}</text>
        <text x={cx} y={cy + 16} textAnchor="middle" className="donut-caption">total</text>
      </svg>
      <ul className="chart-legend">
        {data.map((d) => (
          <li key={d.label}>
            <span className="legend-swatch" style={{ background: d.color }} />
            <span className="legend-label">{d.label}</span>
            <span className="legend-val">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Horizontal bar chart ─────────────────────────────────────────────────────
// data: [{ label, value }]
export function BarChart({ data, color = '#4FC3F7' }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  if (data.length === 0) return <div className="chart-empty">No data yet</div>
  return (
    <div className="hbar-chart">
      {data.map((d) => (
        <div className="hbar-row" key={d.label}>
          <span className="hbar-label" title={d.label}>{d.label}</span>
          <div className="hbar-track">
            <div
              className="hbar-fill"
              style={{ width: `${(d.value / max) * 100}%`, background: color }}
            />
          </div>
          <span className="hbar-value">{d.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Line chart ───────────────────────────────────────────────────────────────
// data: [{ label, value }] in chronological order
export function LineChart({ data, color = '#4FC3F7', height = 200 }) {
  const width = 640
  const padX = 34
  const padY = 24
  const max = Math.max(1, ...data.map((d) => d.value))
  const innerW = width - padX * 2
  const innerH = height - padY * 2
  const n = data.length

  if (n === 0) return <div className="chart-empty">No data yet</div>

  const x = (i) => padX + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const y = (v) => padY + innerH - (v / max) * innerH

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d.value)}`).join(' ')
  const areaPath =
    `${linePath} L${x(n - 1)},${padY + innerH} L${x(0)},${padY + innerH} Z`

  // Horizontal gridlines at 0, 50%, 100% of max
  const ticks = [0, 0.5, 1].map((f) => ({ v: Math.round(max * f), yy: y(max * f) }))

  return (
    <svg
      className="line-chart"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.30" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {ticks.map((t) => (
        <g key={t.yy}>
          <line x1={padX} y1={t.yy} x2={width - padX} y2={t.yy} stroke="#243447" strokeWidth="1" />
          <text x={padX - 8} y={t.yy + 4} textAnchor="end" className="axis-label">{t.v}</text>
        </g>
      ))}

      <path d={areaPath} fill="url(#lineFill)" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5"
            strokeLinejoin="round" strokeLinecap="round" />

      {data.map((d, i) => (
        <g key={d.label}>
          <circle cx={x(i)} cy={y(d.value)} r="3.5" fill={color}>
            <title>{`${d.label}: ${d.value}`}</title>
          </circle>
          {(n <= 8 || i % 2 === 0) && (
            <text x={x(i)} y={height - 6} textAnchor="middle" className="axis-label">
              {d.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}
