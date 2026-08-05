/**
 * Haversine distance in meters between two lat/lng points
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000 // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const dphi = ((lat2 - lat1) * Math.PI) / 180
  const dlambda = ((lng2 - lng1) * Math.PI) / 180

  const a =
    Math.sin(dphi / 2) * Math.sin(dphi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) * Math.sin(dlambda / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c // meters
}

/**
 * Estimate walk time in seconds from distance
 * Average walking speed: 1.4 m/s ≈ 5 km/h
 */
export function distanceToWalkTime(distanceMeters) {
  return Math.round(distanceMeters / 1.4) // seconds
}

/**
 * Build a routing graph JSON from nodes and edges
 * @param {Array} nodes - Array of { id, lat, lng, label }
 * @param {Array} edges - Array of { id, from, to } node-id pairs
 * @returns {Object} Routing graph JSON
 */
export function buildRoutingGraph(nodes, edges) {
  const processedEdges = edges.map((edge) => {
    const fromNode = nodes.find((n) => n.id === edge.from)
    const toNode = nodes.find((n) => n.id === edge.to)

    let distance = edge.distance || 0
    let walkTime = edge.walkTime || 0

    if (fromNode && toNode) {
      distance = Math.round(haversineDistance(fromNode.lat, fromNode.lng, toNode.lat, toNode.lng) * 10) / 10
      walkTime = distanceToWalkTime(distance)
    }

    return {
      id: edge.id,
      from: edge.from,
      to: edge.to,
      distance: distance,          // meters
      walkTime: walkTime,          // seconds
      bidirectional: edge.bidirectional !== false,
    }
  })

  return {
    type: 'RoutingGraph',
    version: '1.0.0',
    created: new Date().toISOString(),
    nodes: nodes.map((n) => ({
      id: n.id,
      lat: n.lat,
      lng: n.lng,
      label: n.label || '',
      type: n.nodeType || 'waypoint',
    })),
    edges: processedEdges,
    stats: {
      nodeCount: nodes.length,
      edgeCount: processedEdges.length,
      totalDistance: Math.round(processedEdges.reduce((sum, e) => sum + e.distance, 0)),
    },
  }
}

/**
 * Build an adjacency list for path-finding from a routing graph
 */
export function buildAdjacencyList(routingGraph) {
  const adjacency = {}

  routingGraph.nodes.forEach((node) => {
    adjacency[node.id] = []
  })

  routingGraph.edges.forEach((edge) => {
    if (adjacency[edge.from]) {
      adjacency[edge.from].push({ to: edge.to, distance: edge.distance, walkTime: edge.walkTime })
    }
    if (edge.bidirectional && adjacency[edge.to]) {
      adjacency[edge.to].push({ to: edge.from, distance: edge.distance, walkTime: edge.walkTime })
    }
  })

  return adjacency
}
