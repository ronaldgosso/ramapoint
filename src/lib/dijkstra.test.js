/**
 * Dijkstra algorithm tests
 */
import { describe, it, expect } from 'vitest'
import { dijkstra } from './dijkstra.js'
import { buildAdjacencyList, buildRoutingGraph } from './routingGraphBuilder.js'

// Simple 4-node square graph:
//
//  A ---10m--- B
//  |           |
//  10m        20m
//  |           |
//  D ---10m--- C
//
const nodes = [
  { id: 'A', lat: 0.0000, lng: 0.0000, label: 'A', nodeType: 'waypoint' },
  { id: 'B', lat: 0.0000, lng: 0.0001, label: 'B', nodeType: 'waypoint' },
  { id: 'C', lat: 0.0001, lng: 0.0001, label: 'C', nodeType: 'waypoint' },
  { id: 'D', lat: 0.0001, lng: 0.0000, label: 'D', nodeType: 'waypoint' },
]

const edges = [
  { id: 'e1', from: 'A', to: 'B', bidirectional: true },
  { id: 'e2', from: 'B', to: 'C', bidirectional: true },
  { id: 'e3', from: 'C', to: 'D', bidirectional: true },
  { id: 'e4', from: 'D', to: 'A', bidirectional: true },
]

function buildAdj(nodeList, edgeList) {
  const graph = buildRoutingGraph(nodeList, edgeList)
  return buildAdjacencyList(graph)
}

describe('dijkstra()', () => {
  it('finds the direct route A → B', () => {
    const adj = buildAdj(nodes, edges)
    const result = dijkstra(adj, 'A', 'B')
    expect(result).not.toBeNull()
    expect(result.nodeIds[0]).toBe('A')
    expect(result.nodeIds[result.nodeIds.length - 1]).toBe('B')
    expect(result.distance).toBeGreaterThan(0)
    expect(result.walkTime).toBeGreaterThan(0)
  })

  it('finds shortest path A → C (2 hops via A-B-C vs 2 hops via A-D-C)', () => {
    const adj = buildAdj(nodes, edges)
    const result = dijkstra(adj, 'A', 'C')
    expect(result).not.toBeNull()
    // Should find a 2-hop path
    expect(result.nodeIds.length).toBe(3)
    expect(result.nodeIds[0]).toBe('A')
    expect(result.nodeIds[2]).toBe('C')
  })

  it('returns null when start node does not exist', () => {
    const adj = buildAdj(nodes, edges)
    expect(dijkstra(adj, 'NONEXISTENT', 'B')).toBeNull()
  })

  it('returns null when end node does not exist', () => {
    const adj = buildAdj(nodes, edges)
    expect(dijkstra(adj, 'A', 'NONEXISTENT')).toBeNull()
  })

  it('returns single-node path when start === end', () => {
    const adj = buildAdj(nodes, edges)
    const result = dijkstra(adj, 'A', 'A')
    expect(result).not.toBeNull()
    expect(result.nodeIds).toEqual(['A'])
    expect(result.distance).toBe(0)
  })

  it('returns null when graph is disconnected and no path exists', () => {
    const isolatedNodes = [
      { id: 'X', lat: 0, lng: 0, label: '', nodeType: 'waypoint' },
      { id: 'Y', lat: 1, lng: 1, label: '', nodeType: 'waypoint' },
    ]
    const adj = buildAdj(isolatedNodes, []) // No edges
    expect(dijkstra(adj, 'X', 'Y')).toBeNull()
  })

  it('respects one-directional edges', () => {
    const oneWayEdge = [{ id: 'e1', from: 'A', to: 'B', bidirectional: false }]
    const twoNodes = [nodes[0], nodes[1]]
    const adj = buildAdj(twoNodes, oneWayEdge)

    // A → B should succeed (edge direction)
    const forward = dijkstra(adj, 'A', 'B')
    expect(forward).not.toBeNull()

    // B → A should fail (no reverse path)
    const backward = dijkstra(adj, 'B', 'A')
    expect(backward).toBeNull()
  })

  it('returns walkTime as round(distance / 1.4)', () => {
    const adj = buildAdj(nodes, edges)
    const result = dijkstra(adj, 'A', 'B')
    expect(result).not.toBeNull()
    expect(result.walkTime).toBe(Math.round(result.distance / 1.4))
  })
})
