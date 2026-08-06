/**
 * Path simplification and corner snapping utilities
 */

export function straightenAndSnapPath(coordinates, otherFeatures) {
  // 1. Simplify using RDP
  const simplified = simplifyPath(coordinates, 0.00003)

  // 2. Snap to nearby feature vertices within ~10 meters (10^-8 degrees squared)
  const snapped = simplified.map((point) => {
    let closestVertex = point
    let minDistanceSq = 0.00000001

    otherFeatures.forEach((feature) => {
      const geom = feature.geometry
      if (!geom) return

      if (geom.type === 'Point') {
        const dSq = getSqDistance(point, geom.coordinates)
        if (dSq < minDistanceSq) {
          minDistanceSq = dSq
          closestVertex = geom.coordinates
        }
      } else if (geom.type === 'LineString') {
        geom.coordinates.forEach((vertex) => {
          const dSq = getSqDistance(point, vertex)
          if (dSq < minDistanceSq) {
            minDistanceSq = dSq
            closestVertex = vertex
          }
        })
      } else if (geom.type === 'Polygon') {
        const ring = geom.coordinates[0] || []
        ring.forEach((vertex) => {
          const dSq = getSqDistance(point, vertex)
          if (dSq < minDistanceSq) {
            minDistanceSq = dSq
            closestVertex = vertex
          }
        })
      }
    })

    return closestVertex
  })

  return snapped
}

export function simplifyPath(points, tolerance) {
  if (points.length <= 2) return points

  let maxSqDist = 0
  let index = 0
  const end = points.length - 1

  for (let i = 1; i < end; i++) {
    const sqDist = getSquareSegmentDistance(points[i], points[0], points[end])
    if (sqDist > maxSqDist) {
      index = i
      maxSqDist = sqDist
    }
  }

  if (maxSqDist > tolerance * tolerance) {
    const results1 = simplifyPath(points.slice(0, index + 1), tolerance)
    const results2 = simplifyPath(points.slice(index), tolerance)
    return results1.slice(0, results1.length - 1).concat(results2)
  }
  return [points[0], points[end]]
}

export function getSquareSegmentDistance(p, p1, p2) {
  let x = p1[0], y = p1[1]
  let dx = p2[0] - x, dy = p2[1] - y

  if (dx !== 0 || dy !== 0) {
    let t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy)
    if (t > 1) {
      x = p2[0]
      y = p2[1]
    } else if (t > 0) {
      x += dx * t
      y += dy * t
    }
  }

  dx = p[0] - x
  dy = p[1] - y
  return dx * dx + dy * dy
}

export function getSqDistance(p1, p2) {
  const dx = p1[0] - p2[0]
  const dy = p1[1] - p2[1]
  return dx * dx + dy * dy
}
