import { describe, expect, it } from 'vitest'
import { getStickDirection } from '../src/utils/stickDirection'

function pointAtAngle(degrees: number) {
  const radians = (degrees * Math.PI) / 180
  return {
    x: Math.cos(radians),
    y: Math.sin(radians),
  }
}

describe('getStickDirection', () => {
  it('returns null below the stick threshold', () => {
    expect(getStickDirection(0.1, -0.1, 0.3)).toBeNull()
  })

  it('detects cardinal and diagonal direction centers', () => {
    expect(getStickDirection(0, -1, 0.3)).toBe('up')
    expect(getStickDirection(1, 0, 0.3)).toBe('right')
    expect(getStickDirection(0.8, -0.8, 0.3)).toBe('up-right')
  })

  it('preserves hard sector cuts by default', () => {
    const boundary = pointAtAngle(-67.5)

    expect(getStickDirection(boundary.x, boundary.y, 0.3)).toBe('up-right')
  })

  it('leaves an angular gap between adjacent directions when configured', () => {
    const boundary = pointAtAngle(-67.5)

    expect(getStickDirection(boundary.x, boundary.y, 0.3, 12)).toBeNull()
  })
})
