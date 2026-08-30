/**
 * Dijkstra's shortest-path algorithm.
 *
 * @param {Object} adjacencyList - From buildAdjacencyList(). Maps nodeId → [{to, distance, walkTime}]
 * @param {string} startId       - Source node ID
 * @param {string} endId         - Destination node ID
 * @returns {{ nodeIds: string[], distance: number, walkTime: number } | null}
 *   Returns null if no path exists between startId and endId.
 */
export function dijkstra(adjacencyList, startId, endId) {
  const nodeIds = Object.keys(adjacencyList)
  if (!nodeIds.includes(startId) || !nodeIds.includes(endId)) return null

  const distances = {}
  const previous  = {}
  const visited   = new Set()

  for (const id of nodeIds) {
    distances[id] = id === startId ? 0 : Infinity
    previous[id]  = null
  }

  while (true) {
    // Pick the unvisited node with the smallest distance
    let currentId  = null
    let minDist    = Infinity
    for (const id of nodeIds) {
      if (!visited.has(id) && distances[id] < minDist) {
        minDist    = distances[id]
        currentId  = id
      }
    }

    // Stop if we've reached the destination or there are no reachable nodes left
    if (currentId === null || currentId === endId || distances[currentId] === Infinity) break

    visited.add(currentId)

    for (const neighbor of (adjacencyList[currentId] || [])) {
      if (visited.has(neighbor.to)) continue
      const tentative = distances[currentId] + neighbor.distance
      if (tentative < distances[neighbor.to]) {
        distances[neighbor.to] = tentative
        previous[neighbor.to]  = currentId
      }
    }
  }

  // No path found
  if (distances[endId] === Infinity) return null

  // Reconstruct path by walking back through previous[]
  const path    = []
  let   current = endId
  while (current !== null) {
    path.unshift(current)
    current = previous[current]
  }

  // Sanity-check: path must start at startId
  if (path[0] !== startId) return null

  const totalDistance = Math.round(distances[endId])
  const walkTime      = Math.round(totalDistance / 1.4) // avg 1.4 m/s walking speed

  return {
    nodeIds: path,
    distance: totalDistance,
    walkTime,
  }
}
