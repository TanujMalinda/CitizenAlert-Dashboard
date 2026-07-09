import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat'
import { getAlerts, setAlertArea } from '../api'

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
  const mapEl      = useRef(null)
  const mapRef     = useRef(null)
  const heatRef    = useRef(null)
  const markersRef = useRef(null)
  const areasRef   = useRef(null)
  const editRef    = useRef(null)

  const [alerts, setAlerts]           = useState(null)
  const [error, setError]             = useState(null)
  const [typeFilter, setTypeFilter]   = useState('')
  const [showMarkers, setShowMarkers] = useState(true)
  const [showAreas, setShowAreas]     = useState(true)

  // Affected-area editor state
  const [editAlertId, setEditAlertId] = useState('')
  const [editMode, setEditMode]       = useState('polygon') // 'polygon' | 'line_buffer'
  const [editPoints, setEditPoints]   = useState([])
  const [bufferM, setBufferM]         = useState(300)
  const [editing, setEditing]         = useState(false)
  const [saving, setSaving]           = useState(false)

  function load() {
    getAlerts({ limit: 500 })
      .then((r) => setAlerts(r.data))
      .catch((e) => setError(e.response?.data?.detail || 'Failed to load alerts'))
  }

  // ── Initialise the map once ──────────────────────────────────────
  useEffect(() => {
    if (mapRef.current) return
    const map = L.map(mapEl.current, { center: SL_CENTER, zoom: 8 })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)
    areasRef.current   = L.layerGroup().addTo(map)
    markersRef.current = L.layerGroup().addTo(map)
    editRef.current    = L.layerGroup().addTo(map)
    mapRef.current = map
    setTimeout(() => map.invalidateSize(), 100)
    return () => { map.remove(); mapRef.current = null }
  }, [])

  // ── Fetch all alerts ─────────────────────────────────────────────
  useEffect(load, [])

  // ── Map click adds a vertex while editing ────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!editing) return
    const onClick = (e) => {
      setEditPoints((pts) => [...pts, [e.latlng.lat, e.latlng.lng]])
    }
    map.on('click', onClick)
    map.getContainer().style.cursor = 'crosshair'
    return () => {
      map.off('click', onClick)
      map.getContainer().style.cursor = ''
    }
  }, [editing])

  // ── Live preview of the shape being drawn ────────────────────────
  useEffect(() => {
    const g = editRef.current
    if (!g) return
    g.clearLayers()
    if (!editing || editPoints.length === 0) return
    editPoints.forEach((p) =>
      L.circleMarker(p, { radius: 4, color: '#fff', fillColor: '#4FC3F7',
        fillOpacity: 1, weight: 1.5 }).addTo(g))
    if (editPoints.length >= 2) {
      if (editMode === 'polygon' && editPoints.length >= 3) {
        L.polygon(editPoints, { color: '#4FC3F7', weight: 2, dashArray: '6 4',
          fillOpacity: 0.12 }).addTo(g)
      } else {
        L.polyline(editPoints, { color: '#4FC3F7', weight: 2, dashArray: '6 4' })
          .addTo(g)
      }
    }
  }, [editing, editPoints, editMode])

  // ── Render heat + markers + affected areas ───────────────────────
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
      a.latitude, a.longitude, SEVERITY_WEIGHT[a.severity] ?? 0.5,
    ])
    heatRef.current = L.heatLayer(points, {
      radius: 25, blur: 18, maxZoom: 12, minOpacity: 0.35,
      gradient: { 0.2: '#4FC3F7', 0.4: '#66BB6A', 0.6: '#FFA726',
                  0.8: '#EF5350', 1.0: '#B71C1C' },
    }).addTo(map)

    // Affected areas — polygon when drawn, otherwise the radius circle
    areasRef.current.clearLayers()
    if (showAreas) {
      visible.filter((a) => a.status === 'active').forEach((a) => {
        const color = TYPE_COLORS[a.alert_type] || '#90A4AE'
        if (a.affected_geojson) {
          try {
            L.geoJSON(JSON.parse(a.affected_geojson), {
              style: { color, weight: 1.5, fillColor: color, fillOpacity: 0.15 },
            }).addTo(areasRef.current)
          } catch { /* bad geometry — skip */ }
        } else if (a.affected_radius_km) {
          L.circle([a.latitude, a.longitude], {
            radius: a.affected_radius_km * 1000,
            color, weight: 1.2, fillColor: color, fillOpacity: 0.10,
          }).addTo(areasRef.current)
        }
      })
    }

    // Individual markers
    markersRef.current.clearLayers()
    if (showMarkers) {
      visible.forEach((a) => {
        const color = TYPE_COLORS[a.alert_type] || '#90A4AE'
        L.circleMarker([a.latitude, a.longitude], {
          radius: 5, color, fillColor: color, fillOpacity: 0.85, weight: 1,
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
  }, [alerts, typeFilter, showMarkers, showAreas])

  // ── Editor actions ───────────────────────────────────────────────
  function startEditing() {
    if (!editAlertId) return
    setEditPoints([])
    setEditing(true)
    const a = alerts?.find((x) => x.id === Number(editAlertId))
    if (a && mapRef.current) mapRef.current.setView([a.latitude, a.longitude], 13)
  }

  function cancelEditing() {
    setEditing(false)
    setEditPoints([])
  }

  async function saveArea(mode, coords) {
    setSaving(true)
    try {
      await setAlertArea(Number(editAlertId), {
        mode,
        coordinates: coords,
        buffer_m: Number(bufferM) || 300,
      })
      cancelEditing()
      load()
    } catch (e) {
      alert(e.response?.data?.detail || e.response?.data?.error?.message || e.message)
    } finally {
      setSaving(false)
    }
  }

  const minPts = editMode === 'polygon' ? 3 : 2
  const activeAlerts = alerts
    ? alerts.filter((a) => a.status === 'active' && a.alert_type !== 'missing_person')
    : []

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
        Geographic density of all alerts — shaded shapes show each alert's affected area (CAP)
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
        <button
          className={`btn ${showAreas ? 'primary' : 'ghost'}`}
          onClick={() => setShowAreas((v) => !v)}
        >
          {showAreas ? 'Hide areas' : 'Show areas'}
        </button>
        <span className="map-count">
          {alerts ? `${plotted} alerts plotted` : 'Loading…'}
        </span>
      </div>

      {/* ── Affected-area editor ─────────────────────────────────── */}
      <div className="filters" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 13, color: '#90A4AE' }}>Edit affected area:</span>
        <select
          value={editAlertId}
          onChange={(e) => { setEditAlertId(e.target.value); cancelEditing() }}
        >
          <option value="">Select alert…</option>
          {activeAlerts.map((a) => (
            <option key={a.id} value={a.id}>
              #{a.id} · {a.alert_type} · {(a.title || '').slice(0, 40)}
            </option>
          ))}
        </select>
        <select value={editMode} onChange={(e) => setEditMode(e.target.value)} disabled={editing}>
          <option value="polygon">Draw polygon (outline)</option>
          <option value="line_buffer">Draw river/road line (buffered)</option>
        </select>
        {editMode === 'line_buffer' && (
          <label style={{ fontSize: 12, color: '#90A4AE' }}>
            width&nbsp;
            <input
              type="number" min={50} step={50} value={bufferM}
              onChange={(e) => setBufferM(e.target.value)}
              style={{ width: 70 }}
            />&nbsp;m each side
          </label>
        )}

        {!editing ? (
          <>
            <button className="btn primary" disabled={!editAlertId} onClick={startEditing}>
              ✏ Start drawing
            </button>
            <button
              className="btn reject"
              disabled={!editAlertId || saving}
              onClick={() => saveArea('clear', null)}
            >
              Clear area
            </button>
          </>
        ) : (
          <>
            <span style={{ fontSize: 12, color: '#4FC3F7' }}>
              Click the map to add points ({editPoints.length} placed, need ≥ {minPts})
            </span>
            <button
              className="btn ghost"
              disabled={editPoints.length === 0}
              onClick={() => setEditPoints((p) => p.slice(0, -1))}
            >
              Undo point
            </button>
            <button className="btn ghost" onClick={cancelEditing}>Cancel</button>
            <button
              className="btn verify"
              disabled={editPoints.length < minPts || saving}
              onClick={() => saveArea(editMode, editPoints)}
            >
              {saving ? 'Saving…' : '✓ Save area'}
            </button>
          </>
        )}
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
