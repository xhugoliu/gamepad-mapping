import { useState, useRef, useCallback, useEffect } from 'react'
import { GamepadState } from '../hooks/useGamepad'
import { GamepadMapping, StickDirection, StickMappingType } from '../hooks/useGamepadMapping'
import { MappingActions } from './MappingPanel'
import { MappingActionSelector } from './MappingActionSelector'
import { getStickDirection, getStickAxes } from '../utils/stickDirection'
import { DIRECTION_LABELS, STICK_DIRECTIONS } from '../constants/directionLabels'
import {
  DEFAULT_STICK_DIRECTION_GAP_DEGREES,
  DEFAULT_STICK_THRESHOLD,
  DEFAULT_STICK_THRESHOLD_PREVIEW,
  MAX_STICK_DIRECTION_GAP_DEGREES,
} from '../constants/defaults'
import { MappingAction, MappingActionAssignment } from '../types/mappingAction'
import './MappingPanel.css'

interface StickHotkeyModeProps {
  gamepad: GamepadState
  mapping?: GamepadMapping
  stickIndex: number
  editingAxis: { gamepadIndex: number; stickIndex: number; direction: StickDirection } | null
  onSetAxisMapping: (stickIndex: number, direction: StickDirection, key: string, label: string, threshold: number, type?: StickMappingType, sensitivity?: number, acceleration?: number, invertX?: boolean, invertY?: boolean, action?: MappingAction, directionGapDegrees?: number) => void
  onRemoveAxisMapping: (stickIndex: number, direction: StickDirection) => void
  onSetEditingAxis: (value: { gamepadIndex: number; stickIndex: number; direction: StickDirection } | null) => void
  onRemoveAllMappings: (stickIndex: number) => void
}

export function StickHotkeyMode({
  gamepad,
  mapping,
  stickIndex,
  editingAxis,
  onSetAxisMapping,
  onRemoveAxisMapping,
  onSetEditingAxis,
  onRemoveAllMappings,
}: StickHotkeyModeProps) {
  const [threshold, setThreshold] = useState(DEFAULT_STICK_THRESHOLD)
  const [directionGapDegrees, setDirectionGapDegrees] = useState(
    DEFAULT_STICK_DIRECTION_GAP_DEGREES
  )
  const [pendingDirectionActions, setPendingDirectionActions] = useState<Map<StickDirection, MappingActionAssignment>>(new Map())
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const originalDirectionMappingsRef = useRef<Map<StickDirection, MappingActionAssignment>>(new Map())
  const originalThresholdRef = useRef<number>(DEFAULT_STICK_THRESHOLD)
  const originalDirectionGapRef = useRef<number>(DEFAULT_STICK_DIRECTION_GAP_DEGREES)

  const stickMappings = mapping?.axisMappings.filter(m => m.stickIndex === stickIndex && m.type === 'hotkey') || []

  const getStickMapping = useCallback((direction: StickDirection) => {
    return mapping?.axisMappings.find(m => m.stickIndex === stickIndex && m.direction === direction)
  }, [mapping?.axisMappings, stickIndex])

  // Initialize shared hotkey settings from existing mappings (use first one found)
  useEffect(() => {
    const savedStickMappings = mapping?.axisMappings.filter(m => m.stickIndex === stickIndex && m.type === 'hotkey') || []

    if (savedStickMappings.length > 0) {
      const firstMapping = savedStickMappings[0]
      setThreshold(firstMapping.threshold)
      originalThresholdRef.current = firstMapping.threshold
      const nextDirectionGap =
        firstMapping.directionGapDegrees ?? DEFAULT_STICK_DIRECTION_GAP_DEGREES
      setDirectionGapDegrees(nextDirectionGap)
      originalDirectionGapRef.current = nextDirectionGap
      return
    }

    setThreshold(DEFAULT_STICK_THRESHOLD)
    originalThresholdRef.current = DEFAULT_STICK_THRESHOLD
    setDirectionGapDegrees(DEFAULT_STICK_DIRECTION_GAP_DEGREES)
    originalDirectionGapRef.current = DEFAULT_STICK_DIRECTION_GAP_DEGREES
  }, [mapping?.axisMappings, stickIndex])

  const getCurrentStickDirection = (stickIndex: number): StickDirection | null => {
    const { axisXIndex, axisYIndex } = getStickAxes(stickIndex)
    return getStickDirection(
      gamepad.axes[axisXIndex] || 0,
      gamepad.axes[axisYIndex] || 0,
      DEFAULT_STICK_THRESHOLD_PREVIEW,
      directionGapDegrees
    )
  }

  // Initialize original mappings
  useEffect(() => {
    const savedStickMappings = mapping?.axisMappings.filter(m => m.stickIndex === stickIndex && m.type === 'hotkey') || []

    originalDirectionMappingsRef.current = new Map()
    savedStickMappings.forEach(m => {
      originalDirectionMappingsRef.current.set(m.direction, {
        key: m.key,
        label: m.label,
        action: m.action
      })
    })
  }, [mapping?.axisMappings, stickIndex])

  // Check for changes
  useEffect(() => {
    const hasPendingKeys = pendingDirectionActions.size > 0
    const hasThresholdChanges = Math.abs(threshold - originalThresholdRef.current) > 0.01
    const hasDirectionGapChanges = Math.abs(directionGapDegrees - originalDirectionGapRef.current) > 0.01
    setHasUnsavedChanges(hasPendingKeys || hasThresholdChanges || hasDirectionGapChanges)
  }, [directionGapDegrees, pendingDirectionActions, threshold])

  const handleActionChange = useCallback((direction: StickDirection, assignment: MappingActionAssignment) => {
    const stickMapping = getStickMapping(direction)
    
    // Store original if not already stored
    if (!originalDirectionMappingsRef.current.has(direction) && stickMapping) {
      originalDirectionMappingsRef.current.set(direction, {
        key: stickMapping.key,
        label: stickMapping.label,
        action: stickMapping.action
      })
    }
    
    // Store pending action
    setPendingDirectionActions(prev => {
      const newMap = new Map(prev)
      newMap.set(direction, assignment)
      return newMap
    })
    setHasUnsavedChanges(true)
  }, [getStickMapping])

  const revertChanges = useCallback(() => {
    setPendingDirectionActions(new Map())
    setThreshold(originalThresholdRef.current)
    setDirectionGapDegrees(originalDirectionGapRef.current)
    setHasUnsavedChanges(false)
  }, [])

  return (
    <>
      <div className="stick-directions-list">
        {STICK_DIRECTIONS.map((direction) => {
          const stickMapping = getStickMapping(direction)
          const isActive = getCurrentStickDirection(stickIndex) === direction
          
          return (
            <div
              key={direction}
              className={`button-mapping-item ${stickMapping ? 'has-mapping' : ''} ${isActive ? 'active' : ''} ${editingAxis?.stickIndex === stickIndex && editingAxis?.direction === direction ? 'editing' : ''}`}
              onClick={() => {
                // Store original values if not already stored
                if (stickMapping && !originalDirectionMappingsRef.current.has(direction)) {
                  originalDirectionMappingsRef.current.set(direction, {
                    key: stickMapping.key,
                    label: stickMapping.label
                  })
                }
                // Set editing state for this direction
                onSetEditingAxis({ gamepadIndex: gamepad.index, stickIndex, direction })
              }}
            >
              <div className="direction-label">{DIRECTION_LABELS[direction]}</div>
              <MappingActionSelector
                currentMapping={stickMapping ? { key: stickMapping.key, label: stickMapping.label, action: stickMapping.action } : null}
                isEditing={editingAxis?.stickIndex === stickIndex && editingAxis?.direction === direction}
                pendingAction={pendingDirectionActions.has(direction) ? pendingDirectionActions.get(direction)! : null}
                onActionChange={(assignment) => handleActionChange(direction, assignment)}
                onActionClear={() => {
                  setPendingDirectionActions(prev => {
                    const newMap = new Map(prev)
                    newMap.delete(direction)
                    return newMap
                  })
                }}
                onRemove={() => {
                  onRemoveAxisMapping(stickIndex, direction)
                  // Remove from pending if exists
                  setPendingDirectionActions(prev => {
                    const newMap = new Map(prev)
                    newMap.delete(direction)
                    return newMap
                  })
                }}
                showRemove={!!stickMapping || pendingDirectionActions.has(direction)}
              />
              {isActive && <span className="active-indicator">●</span>}
            </div>
          )
        })}
      </div>

      {/* Global threshold control */}
      <div className="threshold-control">
        <label>Threshold (applies to all directions):</label>
        <input
          type="range"
          min="0.1"
          max="1.0"
          step="0.1"
          value={threshold}
          onChange={(e) => {
            const newThreshold = parseFloat(e.target.value)
            setThreshold(newThreshold)
            setHasUnsavedChanges(true)
          }}
        />
        <span>{threshold.toFixed(2)}</span>
      </div>

      <div className="threshold-control">
        <label>Angle gap between directions:</label>
        <input
          type="range"
          min="0"
          max={MAX_STICK_DIRECTION_GAP_DEGREES}
          step="1"
          value={directionGapDegrees}
          onChange={(e) => {
            const nextDirectionGap = Number(e.target.value)
            setDirectionGapDegrees(nextDirectionGap)
            setHasUnsavedChanges(true)
          }}
        />
        <span>{directionGapDegrees.toFixed(0)} deg</span>
      </div>
      
      <MappingActions
        hasUnsavedChanges={hasUnsavedChanges}
        onApplyChanges={() => {
          // Apply all pending direction mappings with shared hotkey settings
          pendingDirectionActions.forEach((pending, direction) => {
            onSetAxisMapping(stickIndex, direction, pending.key, pending.label, threshold, 'hotkey', 1.0, 1.0, false, false, pending.action, directionGapDegrees)
          })
          // Update shared hotkey settings for all existing mappings if changed
          if (
            Math.abs(threshold - originalThresholdRef.current) > 0.01 ||
            Math.abs(directionGapDegrees - originalDirectionGapRef.current) > 0.01
          ) {
            stickMappings.forEach(m => {
              onSetAxisMapping(stickIndex, m.direction, m.key, m.label, threshold, 'hotkey', 1.0, 1.0, false, false, m.action, directionGapDegrees)
            })
          }
          // Clear pending changes
          setPendingDirectionActions(new Map())
          setHasUnsavedChanges(false)
          originalThresholdRef.current = threshold
          originalDirectionGapRef.current = directionGapDegrees
          originalDirectionMappingsRef.current.clear()
          if (editingAxis) {
            onSetEditingAxis(null)
          }
        }}
        onRevertChanges={revertChanges}
        onRemoveMapping={() => {
          onRemoveAllMappings(stickIndex)
          setHasUnsavedChanges(false)
          setPendingDirectionActions(new Map())
          originalDirectionMappingsRef.current.clear()
        }}
        showRemove={stickMappings.length > 0 || pendingDirectionActions.size > 0}
      />
    </>
  )
}
