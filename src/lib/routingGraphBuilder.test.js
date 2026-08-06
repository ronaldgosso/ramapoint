import { describe, test, expect } from 'vitest'
import { haversineDistance, distanceToWalkTime, buildRoutingGraph, buildAdjacencyList } from './routingGraphBuilder.js'

describe('routingGraphBuilder', () => {
  test('haversineDistance calculates correct meters', () => {
    // New York Coordinates
    const nyLat = 40.7128
    const nyLng = -74.0060
    // JFK Airport Coordinates
    const jfkLat = 40.6413
    const jfkLng = -73.7781
    
    const distance = haversineDistance(nyLat, nyLng, jfkLat, jfkLng)
    // Roughly 20.8 km (20800 meters)
    expect(distance).toBeGreaterThan(19000)
    expect(distance).toBeLessThan(22000)
  })

  test('distanceToWalkTime calculates walking speed time', () => {
    // 140 meters at 1.4 m/s walk speed should take 100 seconds
    expect(distanceToWalkTime(140)).toBe(100)
  })

  test('buildRoutingGraph creates standard nodes and edges object', () => {
    const nodes = [
      { id: '1', lat: 40.0, lng: -70.0, label: 'Node A', nodeType: 'junction' },
      { id: '2', lat: 40.01, lng: -70.0, label: 'Node B', nodeType: 'destination' }
    ]
    const edges = [
      { id: 'e1', from: '1', to: '2', bidirectional: true }
    ]

    const graph = buildRoutingGraph(nodes, edges)

    expect(graph.type).toBe('RoutingGraph')
    expect(graph.stats.nodeCount).toBe(2)
    expect(graph.stats.edgeCount).toBe(1)
    expect(graph.nodes[0].label).toBe('Node A')
    expect(graph.edges[0].distance).toBeGreaterThan(0)
  })

  test('buildAdjacencyList links bidirectional edges', () => {
    const graph = {
      nodes: [{ id: '1' }, { id: '2' }],
      edges: [{ from: '1', to: '2', distance: 10, walkTime: 5, bidirectional: true }]
    }

    const adjacency = buildAdjacencyList(graph)

    expect(adjacency['1']).toContainEqual({ to: '2', distance: 10, walkTime: 5 })
    expect(adjacency['2']).toContainEqual({ to: '1', distance: 10, walkTime: 5 })
  })
})
