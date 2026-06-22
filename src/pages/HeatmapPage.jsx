import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat'
import { getAlerts } from '../api'

// Sri Lanka geographic centre
const SL_CENTER = [7.8731, 80.7718]

const TYPE_COLORS = {
  missing_person: '#4FC3F7',
  disaster:       '#FFA726',
  crime:          '#EF5350',
  traffic:        '#FFB74D',
  health:         '#66BB6A',
}

// Heat intensity weighting by severity
const SEVERITY_WEIGHT = {
  extreme: 1.0,
  severe:  0.8,
  medium:  0.5,
  low:     0.3,
}

const ALERT_TYPES = ['missing_person', 'disaster', 'crime', 'traffic', 'health']

export default function HeatmapPage() {
  const mapEl     = useRef(null)
  const mapRef    = useRef(null)
  const heatRef   = useRef(null)
  const markersRef = useRef(null)

  const [alerts, setAlerts]         = useState(null)
  const [error, setError]           = useState(null)
  const [typeFilter, setTypeFilter] = useState('')
  const [showMarkers, setShowMarkers] = useState(true)

  // ── Initialise the map once ──────────────────────────────────────
  useEffect(() => {
    if (mapRef.current) return
    const map = L.map(mapEl.current, { center: SL_CENTER, zoom: 8 })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)
    markersRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    // Leaflet needs a size recalculation once the flex layout settles
    setTimeout(() => map.invalidateSize(), 100)
    return () => { map.remove(); mapRef.current = null }
  }, [])

  // ── Fetch all alerts ─────────────────────────────────────────────
  useEffect(() => {
    getAlerts({ limit: 500 })
      .then((r) => setAlerts(r.data))
      .catch((e) => setError(e.response?.data?.detail || 'Failed to load alerts'))
  }, [])

  // ── Render heat layer + markers whenever data or filters change ──
  useEffect(() => {
    const map = mapRef.current
    if (!map || !alerts) return

    const visible = alerts.filter(
      (a) =>
        a.latitude != null &&
        a.longitude != null &&
        (typeFilter === '' || a.alert_type === typeFilter)
    )

    // Heat layer
    if (heatRef.current) { map.removeLayer(heatRef.current); heatRef.current = null }
    const points = visible.map((a) => [
      a.latitude,
      a.longitude,
      SEVERITY_WEIGHT[a.severity] ?? 0.5,
    ])
    heatRef.current = L.heatLayer(points, {
      radius: 25,
      blur: 18,
      maxZoom: 12,
      minOpacity: 0.35,
      gradient: {
        0.2: '#4FC3F7',
        0.4: '#66BB6A',
        0.6: '#FFA726',
        0.8: '#EF5350',
        1.0: '#B71C1C',
      },
    }).addTo(map)

    // Individual markers
    markersRef.current.clearLayers()
    if (showMarkers) {
      visible.forEach((a) => {
        const color = TYPE_COLORS[a.alert_type] || '#90A4AE'
        L.circleMarker([a.latitude, a.longitude], {
          radius: 5,
          color,
          fillColor: color,
          fillOpacity: 0.85,
          weight: 1,
        })
          .bindPopup(
            `<strong>${a.title || 'Alert'}</strong><br/>` +
            `${a.alert_type} · ${a.severity || '—'}<br/>` +
            `${a.district || ''}<br/>` +
            `TVM: ${a.tvm_status || '—'}`
          )
          .addTo(markersRef.current)
      })
    }
  }, [alerts, typeFilter, showMarkers])

  const plotted = alerts
    ? alerts.filter(
        (a) =>
          a.latitude != null &&
          a.longitude != null &&
          (typeFilter === '' || a.alert_type === typeFilter)
      ).length
    : 0

  return (
    <>
      <h1 className="page-title">Alert Heatmap</h1>
      <p className="page-sub">
        Geographic density of all alerts across Sri Lanka — intensity weighted by severity
      </p>

      {error && <div className="empty">{error}</div>}

      <div className="filters">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All types</option>
          {ALERT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button
          className={`btn ${showMarkers ? 'primary' : 'ghost'}`}
          onClick={() => setShowMarkers((v) => !v)}
        >
          {showMarkers ? 'Hide markers' : 'Show markers'}
        </button>
        <span className="map-count">
          {alerts ? `${plotted} alerts plotted` : 'Loading…'}
        </span>
      </div>

      <div ref={mapEl} className="map-container" />

      <div className="map-legend">
        {ALERT_TYPES.map((t) => (
          <span key={t} className="legend-item">
            <span className="legend-dot" style={{ background: TYPE_COLORS[t] }} />
            {t.replace('_', ' ')}
          </span>
        ))}
      </div>
    </>
  )
}
