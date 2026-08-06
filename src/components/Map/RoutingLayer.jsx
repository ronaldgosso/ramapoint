import { useEffect, useRef, useCallback } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { useApp } from '../../context/AppContext.jsx'
import { haversineDistance } from '../../lib/routingGraphBuilder.js'

/**
 * RoutingLayer — Renders routing nodes as circle markers and edges as polylines
 * Handles add-node and add-edge drawing modes
 */
export default function RoutingLayer() {
  const map = useMap()
  const { state, dispatch, ACTIONS } = useApp()
  const nodeLayersRef = useRef(new Map())  // nodeId -> L.CircleMarker
  const edgeLayersRef = useRef(new Map())  // edgeId -> L.Polyline
  const pendingEdgeRef = useRef(null)      // first node selected in edge mode
  const edgePreviewRef = useRef(null)      // temporary preview line

  const { project, drawingMode } = state

  // ── Map click for adding nodes ─────────────────────────
  const handleMapClick = useCallback(
    (e) => {
      if (drawingMode === 'node') {
        // Guard against clicking on an interactive layer (e.g. building, path, existing node)
        if (e.originalEvent && e.originalEvent.target && e.originalEvent.target.classList.contains('leaflet-interactive')) {
          return
        }
        dispatch({
          type: ACTIONS.ADD_ROUTING_NODE,
          node: { lat: e.latlng.lat, lng: e.latlng.lng, label: '', nodeType: 'waypoint' },
        })
      }
    },
    [drawingMode, dispatch, ACTIONS]
  )

  // ── Node click for adding edges ────────────────────────
  const handleNodeClick = useCallback(
    (nodeId) => {
      const node = project.routingNodes.find((n) => n.id === nodeId)
      if (!node) return

      if (drawingMode !== 'edge') {
        dispatch({ type: ACTIONS.SELECT_FEATURE, id: node.id })
        return
      }

      if (!pendingEdgeRef.current) {
        pendingEdgeRef.current = node
        dispatch({ type: ACTIONS.UPDATE_ROUTING_NODE, id: node.id, updates: { _pending: true } })
      } else {
        const fromNode = pendingEdgeRef.current
        if (fromNode.id !== node.id) {
          dispatch({
            type: ACTIONS.ADD_ROUTING_EDGE,
            edge: { from: fromNode.id, to: node.id },
          })
        }
        pendingEdgeRef.current = null
        // Remove preview line
        if (edgePreviewRef.current) {
          map.removeLayer(edgePreviewRef.current)
          edgePreviewRef.current = null
        }
      }
    },
    [drawingMode, project.routingNodes, map, dispatch, ACTIONS]
  )

  const handleNodeClickRef = useRef(handleNodeClick)
  useEffect(() => {
    handleNodeClickRef.current = handleNodeClick
  }, [handleNodeClick])

  // ── Render nodes ──────────────────────────────────────
  useEffect(() => {
    const currentIds = new Set(project.routingNodes.map((n) => n.id))

    // Remove stale layers
    nodeLayersRef.current.forEach((layer, id) => {
      if (!currentIds.has(id)) {
        map.removeLayer(layer)
        nodeLayersRef.current.delete(id)
      }
    })

    // Add / update nodes
    project.routingNodes.forEach((node) => {
      const isSelected = state.selectedNodeId === node.id

      if (!nodeLayersRef.current.has(node.id)) {
        const circle = L.circleMarker([node.lat, node.lng], nodeStyle(isSelected))
          .bindTooltip(node.label || 'Node', {
            permanent: false,
            direction: 'top',
            className: 'routing-node-tooltip',
          })
          .addTo(map)

        circle.on('click', (e) => {
          L.DomEvent.stopPropagation(e)
          handleNodeClickRef.current(node.id)
        })

        // Enable Geoman dragging
        if (circle.pm) {
          circle.pm.enable({ draggable: true })
        }

        circle.on('pm:dragend', () => {
          const pos = circle.getLatLng()
          dispatch({
            type: ACTIONS.UPDATE_ROUTING_NODE,
            id: node.id,
            updates: { lat: pos.lat, lng: pos.lng },
          })
        })

        nodeLayersRef.current.set(node.id, circle)
      } else {
        const circle = nodeLayersRef.current.get(node.id)
        circle.setLatLng([node.lat, node.lng])
        circle.setStyle(nodeStyle(isSelected))
      }
    })

    if (map.getContainer()) {
      map.getContainer()._node_layers = nodeLayersRef.current
    }
  }, [project.routingNodes, state.selectedNodeId, map, dispatch, ACTIONS, handleNodeClick])

  // ── Render edges ──────────────────────────────────────
  useEffect(() => {
    const currentIds = new Set(project.routingEdges.map((e) => e.id))

    edgeLayersRef.current.forEach((layer, id) => {
      if (!currentIds.has(id)) {
        map.removeLayer(layer)
        edgeLayersRef.current.delete(id)
      }
    })

    project.routingEdges.forEach((edge) => {
      const fromNode = project.routingNodes.find((n) => n.id === edge.from)
      const toNode = project.routingNodes.find((n) => n.id === edge.to)
      if (!fromNode || !toNode) return

      const isSelected = state.selectedEdgeId === edge.id
      const edgeColor = edge.color || '#B8F7E4'
      const edgeWeight = edge.weight || (isSelected ? 4 : 2.5)

      if (!edgeLayersRef.current.has(edge.id)) {
        const dist = Math.round(haversineDistance(fromNode.lat, fromNode.lng, toNode.lat, toNode.lng))
        const line = L.polyline(
          [[fromNode.lat, fromNode.lng], [toNode.lat, toNode.lng]],
          {
            color: edgeColor,
            weight: edgeWeight,
            opacity: isSelected ? 0.95 : 0.7,
            dashArray: isSelected ? undefined : '6 4',
          }
        )
          .bindTooltip(`${dist}m`, { permanent: false, className: 'routing-node-tooltip' })
          .addTo(map)

        line.on('click', (e) => {
          L.DomEvent.stopPropagation(e)
          dispatch({ type: ACTIONS.SELECT_FEATURE, id: edge.id })
        })

        edgeLayersRef.current.set(edge.id, line)
      } else {
        const line = edgeLayersRef.current.get(edge.id)
        line.setLatLngs([[fromNode.lat, fromNode.lng], [toNode.lat, toNode.lng]])
        line.setStyle({
          color: edgeColor,
          weight: edgeWeight,
          opacity: isSelected ? 0.95 : 0.7,
          dashArray: isSelected ? undefined : '6 4',
        })
      }
    })

    if (map.getContainer()) {
      map.getContainer()._edge_layers = edgeLayersRef.current
    }
  }, [project.routingEdges, project.routingNodes, state.selectedEdgeId, map, dispatch, ACTIONS])


  useEffect(() => {
    map.on('click', handleMapClick)
    return () => map.off('click', handleMapClick)
  }, [map, handleMapClick])

  // ── Mouse move for edge preview ────────────────────────
  useEffect(() => {
    if (drawingMode !== 'edge') {
      if (edgePreviewRef.current) {
        map.removeLayer(edgePreviewRef.current)
        edgePreviewRef.current = null
      }
      return
    }

    const handleMouseMove = (e) => {
      if (!pendingEdgeRef.current) return
      const from = pendingEdgeRef.current
      const latlngs = [[from.lat, from.lng], [e.latlng.lat, e.latlng.lng]]

      if (!edgePreviewRef.current) {
        edgePreviewRef.current = L.polyline(latlngs, {
          color: '#B8F7E4',
          weight: 1.5,
          opacity: 0.5,
          dashArray: '4 4',
        }).addTo(map)
      } else {
        edgePreviewRef.current.setLatLngs(latlngs)
      }
    }

    map.on('mousemove', handleMouseMove)
    return () => {
      map.off('mousemove', handleMouseMove)
      if (edgePreviewRef.current) {
        map.removeLayer(edgePreviewRef.current)
        edgePreviewRef.current = null
      }
    }
  }, [drawingMode, map])

  // ── Cleanup on unmount ────────────────────────────────
  useEffect(() => {
    const nodeLayers = nodeLayersRef.current
    const edgeLayers = edgeLayersRef.current
    return () => {
      nodeLayers.forEach((l) => map.removeLayer(l))
      edgeLayers.forEach((l) => map.removeLayer(l))
      if (edgePreviewRef.current) map.removeLayer(edgePreviewRef.current)
    }
  }, [map])

  return null
}

function nodeStyle(selected) {
  return {
    radius: selected ? 9 : 7,
    fillColor: selected ? '#B8F7E4' : '#25272C',
    color: '#B8F7E4',
    weight: selected ? 3 : 2,
    fillOpacity: selected ? 0.9 : 0.7,
  }
}
