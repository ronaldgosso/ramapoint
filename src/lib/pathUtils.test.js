import { describe, test, expect } from 'vitest'
import { simplifyPath, straightenAndSnapPath } from './pathUtils.js'

describe('pathUtils', () => {
  test('simplifyPath reduces colinear points', () => {
    // A straight line with an intermediate point that is exactly on the line
    const points = [
      [0, 0],
      [1, 1], // intermediate colinear point
      [2, 2]
    ]

    const simplified = simplifyPath(points, 0.01)

    // Should remove the middle point since it lies perfectly on the segment
    expect(simplified).toHaveLength(2)
    expect(simplified[0]).toEqual([0, 0])
    expect(simplified[1]).toEqual([2, 2])
  })

  test('simplifyPath preserves corner details above tolerance', () => {
    // A sharp L-shape corner
    const points = [
      [0, 0],
      [0, 10], // L corner
      [10, 10]
    ]

    const simplified = simplifyPath(points, 1.0)

    // Should preserve all 3 points because the deviation is greater than tolerance 1.0
    expect(simplified).toHaveLength(3)
    expect(simplified[1]).toEqual([0, 10])
  })

  test('straightenAndSnapPath snaps close vertices to adjacent buildings', () => {
    // Path vertex close to a building corner
    const pathCoords = [
      [0, 0],
      [1.00001, 0.99999], // corner close to building corner [1, 1]
      [2, 0]
    ]

    const otherFeatures = [
      {
        id: 'b1',
        type: 'building',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [1, 1],
              [1, 2],
              [2, 2],
              [2, 1],
              [1, 1]
            ]
          ]
        }
      }
    ]

    const snapped = straightenAndSnapPath(pathCoords, otherFeatures)

    // The second point should snap precisely to [1, 1]
    expect(snapped[1]).toEqual([1, 1])
  })
})
