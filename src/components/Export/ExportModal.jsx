import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { generateExportZip, downloadBlob } from '../../lib/exportZip.js'
import { buildGeoJSON } from '../../lib/geojsonBuilder.js'
import { buildRoutingGraph } from '../../lib/routingGraphBuilder.js'
import SnippetTabs from './SnippetTabs.jsx'

export default function ExportModal() {
  const { state, dispatch, ACTIONS } = useApp()
  const [exporting, setExporting] = useState(false)
  const [preview, setPreview] = useState(null)

  const { project } = state

  const handleExport = async () => {
    setExporting(true)
    try {
      const blob = await generateExportZip(
        project,
        project.features,
        project.routingNodes,
        project.routingEdges
      )
      const filename = `${project.name.toLowerCase().replace(/\s+/g, '-')}-ramapoint-export.zip`
      downloadBlob(blob, filename)
    } catch (err) {
      console.error('Export failed:', err)
      alert('Export failed: ' + err.message)
    } finally {
      setExporting(false)
    }
  }

  const handlePreviewGeoJSON = () => {
    const geojson = buildGeoJSON(project.features)
    setPreview(JSON.stringify(geojson, null, 2))
  }

  const handlePreviewRouting = () => {
    const graph = buildRoutingGraph(project.routingNodes, project.routingEdges)
    setPreview(JSON.stringify(graph, null, 2))
  }

  const stats = {
    buildings: project.features.filter((f) => f.type === 'building').length,
    paths:     project.features.filter((f) => f.type === 'path').length,
    pois:      project.features.filter((f) => f.type === 'poi').length,
    nodes:     project.routingNodes.length,
    edges:     project.routingEdges.length,
  }

  return (
    <div className="modal-overlay" onClick={() => dispatch({ type: ACTIONS.CLOSE_MODAL })}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__title">
            <div className="modal__title-icon">⬇️</div>
            Export Campus Map
          </div>
          <button
            className="btn btn-icon btn-ghost"
            onClick={() => dispatch({ type: ACTIONS.CLOSE_MODAL })}
            id="close-export-modal"
          >
            ✕
          </button>
        </div>

        <div className="modal__body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-6)' }}>
            {/* Left: Stats + actions */}
            <div>
              <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 'var(--sp-4)' }}>
                Export Contents
              </h3>

              {/* Stats cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)', marginBottom: 'var(--sp-5)' }}>
                {[
                  { label: 'Buildings', count: stats.buildings, emoji: '🏛️' },
                  { label: 'Paths',     count: stats.paths,     emoji: '🛣️' },
                  { label: 'POIs',      count: stats.pois,      emoji: '📍' },
                  { label: 'Nodes',     count: stats.nodes,     emoji: '🔵' },
                  { label: 'Edges',     count: stats.edges,     emoji: '↗️' },
                  { label: 'Total',     count: project.features.length + stats.nodes, emoji: '📦' },
                ].map(({ label, count, emoji }) => (
                  <div
                    key={label}
                    style={{
                      background: 'var(--graphite-700)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--sp-3)',
                      boxShadow: 'var(--shadow-raised)',
                    }}
                  >
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>{emoji}</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--mint)' }}>{count}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* File list */}
              <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 'var(--sp-3)' }}>
                Files in ZIP
              </h3>
              {[
                { name: 'campus.geojson',             desc: 'All map features' },
                { name: 'routing_graph.json',          desc: 'Navigation graph' },
                { name: 'README.md',                   desc: 'Integration guide' },
                { name: 'code_snippets/flutter_example.dart',  desc: 'Flutter example' },
                { name: 'code_snippets/react_native_example.jsx', desc: 'React Native example' },
                { name: 'code_snippets/swift_example.swift',   desc: 'iOS Swift example' },
              ].map(({ name, desc }) => (
                <div
                  key={name}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    borderBottom: '1px solid var(--border)',
                    fontSize: '12px',
                  }}
                >
                  <span className="font-mono text-accent">{name}</span>
                  <span className="text-muted">{desc}</span>
                </div>
              ))}

              {/* Preview buttons */}
              <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-4)' }}>
                <button
                  id="preview-geojson-btn"
                  className="btn btn-ghost"
                  style={{ flex: 1, fontSize: '12px' }}
                  onClick={handlePreviewGeoJSON}
                >
                  👁 Preview GeoJSON
                </button>
                <button
                  id="preview-routing-btn"
                  className="btn btn-ghost"
                  style={{ flex: 1, fontSize: '12px' }}
                  onClick={handlePreviewRouting}
                >
                  👁 Preview Routing
                </button>
              </div>

              {preview && (
                <div className="code-block" style={{ marginTop: 'var(--sp-4)', maxHeight: '200px', overflow: 'auto' }}>
                  <div className="code-block__header">
                    <span className="code-block__lang">JSON Preview</span>
                    <button
                      className="btn btn-ghost"
                      style={{ height: '22px', padding: '0 8px', fontSize: '11px' }}
                      onClick={() => setPreview(null)}
                    >
                      ✕
                    </button>
                  </div>
                  <pre style={{ padding: 'var(--sp-3)', fontSize: '11px' }}>
                    <code>{preview}</code>
                  </pre>
                </div>
              )}
            </div>

            {/* Right: Code snippets */}
            <div>
              <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 'var(--sp-4)' }}>
                Integration Snippets
              </h3>
              <SnippetTabs />
            </div>
          </div>
        </div>

        <div className="modal__footer">
          <button
            className="btn btn-ghost"
            onClick={() => dispatch({ type: ACTIONS.CLOSE_MODAL })}
          >
            Cancel
          </button>
          <button
            id="download-export-btn"
            className="btn btn-primary"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <><span className="animate-spin">⟳</span> Generating…</>
            ) : (
              '⬇️ Download ZIP'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
