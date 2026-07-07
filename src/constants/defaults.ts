/**
 * Default values used throughout the application
 */

// Stick mapping defaults
export const DEFAULT_STICK_THRESHOLD = 0.5
export const DEFAULT_STICK_THRESHOLD_MOUSE = 0.3
export const DEFAULT_STICK_THRESHOLD_PREVIEW = 0.3
export const DEFAULT_STICK_DIRECTION_GAP_DEGREES = 0
export const MAX_STICK_DIRECTION_GAP_DEGREES = 30

// Combo defaults
export const DEFAULT_COMBO_TERM_MS = 80
export const MIN_COMBO_TERM_MS = 20
export const MAX_COMBO_TERM_MS = 250

// Tap-hold defaults
export const DEFAULT_TAPPING_TERM_MS = 200
export const MIN_TAPPING_TERM_MS = 80
export const MAX_TAPPING_TERM_MS = 500

// Mouse control defaults
export const DEFAULT_MOUSE_SENSITIVITY = 1.0
export const DEFAULT_MOUSE_ACCELERATION = 1.0
export const DEFAULT_MOUSE_INVERT_X = false
export const DEFAULT_MOUSE_INVERT_Y = false

// Scroll control defaults
export const DEFAULT_SCROLL_SENSITIVITY = 1.0
export const DEFAULT_SCROLL_ACCELERATION = 1.0
export const DEFAULT_SCROLL_INVERT_X = false
export const DEFAULT_SCROLL_INVERT_Y = false
export const MAX_SCROLL_SENSITIVITY = 30.0

// Button detection defaults
export const DEFAULT_DRIFT_THRESHOLD = 0.1

// Stick mapping type defaults
export const DEFAULT_STICK_MAPPING_TYPE = 'hotkey' as const

// Threshold range limits
export const MIN_THRESHOLD = 0.1
export const MAX_THRESHOLD = 1.0
export const THRESHOLD_STEP = 0.1

// Sensitivity range limits
export const MIN_SENSITIVITY = 0.1
export const MAX_SENSITIVITY = 10.0
export const SENSITIVITY_STEP = 0.1

// Acceleration range limits
export const MIN_ACCELERATION = 0.0
export const MAX_ACCELERATION = 2.0
export const ACCELERATION_STEP = 0.1
