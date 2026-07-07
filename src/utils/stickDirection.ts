import type { StickDirection } from '../hooks/useGamepadMapping'
import { DEFAULT_STICK_DIRECTION_GAP_DEGREES } from '../constants/defaults'

const DIRECTION_ANGLE_STEP_DEGREES = 45
const DIRECTION_HALF_SECTOR_DEGREES = DIRECTION_ANGLE_STEP_DEGREES / 2
const DIRECTION_BY_ANGLE: StickDirection[] = [
  'right',
  'down-right',
  'down',
  'down-left',
  'left',
  'up-left',
  'up',
  'up-right',
]

function normalizeAngleDegrees(angle: number) {
  return (angle + 360) % 360
}

function getAngleDistanceDegrees(angle: number, center: number) {
  const distance = Math.abs(angle - center) % 360
  return distance > 180 ? 360 - distance : distance
}

/**
 * Calculate stick direction from X and Y axes values
 * @param x - X axis value (-1 to 1)
 * @param y - Y axis value (-1 to 1)
 * @param threshold - Threshold value for detecting direction (0 to 1)
 * @returns StickDirection or null if below threshold
 */
export function getStickDirection(
  x: number,
  y: number,
  threshold: number,
  directionGapDegrees: number = DEFAULT_STICK_DIRECTION_GAP_DEGREES
): StickDirection | null {
  const absX = Math.abs(x)
  const absY = Math.abs(y)

  if (absX < threshold && absY < threshold) {
    return null // No direction
  }

  const angle = normalizeAngleDegrees((Math.atan2(y, x) * 180) / Math.PI)
  const directionIndex =
    Math.round(angle / DIRECTION_ANGLE_STEP_DEGREES) %
    DIRECTION_BY_ANGLE.length
  const directionCenter = directionIndex * DIRECTION_ANGLE_STEP_DEGREES
  const gap = Math.min(
    DIRECTION_ANGLE_STEP_DEGREES,
    Math.max(0, directionGapDegrees)
  )
  const activeHalfSector = DIRECTION_HALF_SECTOR_DEGREES - gap / 2

  if (getAngleDistanceDegrees(angle, directionCenter) > activeHalfSector) {
    return null
  }

  return DIRECTION_BY_ANGLE[directionIndex]
}

/**
 * Get D-Pad direction from button states
 * @param buttons - Array of button states
 * @returns StickDirection or null if no direction pressed
 */
export function getDpadDirection(buttons: Array<{ pressed?: boolean }>): StickDirection | null {
  const up = buttons[12]?.pressed || false
  const down = buttons[13]?.pressed || false
  const left = buttons[14]?.pressed || false
  const right = buttons[15]?.pressed || false

  if (up && left) return 'up-left'
  if (up && right) return 'up-right'
  if (down && left) return 'down-left'
  if (down && right) return 'down-right'
  if (up) return 'up'
  if (down) return 'down'
  if (left) return 'left'
  if (right) return 'right'

  return null
}

/**
 * Get stick axes indices for a given stick index
 * @param stickIndex - Stick index (0 for left, 1 for right)
 * @returns Object with axisXIndex and axisYIndex
 */
export function getStickAxes(stickIndex: number): { axisXIndex: number; axisYIndex: number } {
  if (stickIndex === 0) {
    return { axisXIndex: 0, axisYIndex: 1 }
  } else {
    return { axisXIndex: 2, axisYIndex: 3 }
  }
}
