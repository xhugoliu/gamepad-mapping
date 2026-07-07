import { useState, useCallback } from 'react'
import { GamepadState } from '../hooks/useGamepad'
import { GamepadMapping, StickDirection } from '../hooks/useGamepadMapping'
import { MappingActions } from './MappingPanel'
import { MappingActionSelector } from './MappingActionSelector'
import { getDpadDirection } from '../utils/stickDirection'
import { DIRECTION_LABELS, STICK_DIRECTIONS } from '../constants/directionLabels'
import { MappingAction, MappingActionAssignment } from '../types/mappingAction'
import './MappingPanel.css'

interface DpadMappingPanelProps {
  gamepad: GamepadState
  mapping?: GamepadMapping
  editingDpad: { gamepadIndex: number; direction: StickDirection } | null
  onSetDpadMapping: (direction: StickDirection, key: string, label: string, action?: MappingAction) => void
  onRemoveDpadMapping: (direction: StickDirection) => void
  onSetEditingDpad: (value: { gamepadIndex: number; direction: StickDirection } | null) => void
}

export function DpadMappingPanel({
  gamepad,
  mapping,
  editingDpad,
  onSetDpadMapping,
  onRemoveDpadMapping,
  onSetEditingDpad,
}: DpadMappingPanelProps) {
  const [pendingActions, setPendingActions] = useState<Map<StickDirection, MappingActionAssignment>>(new Map())
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const currentDpadDirection = getDpadDirection(gamepad.buttons)

  const handleActionChange = useCallback((direction: StickDirection, assignment: MappingActionAssignment) => {
    setPendingActions(prev => {
      const newMap = new Map(prev)
      newMap.set(direction, assignment)
      return newMap
    })
    setHasUnsavedChanges(true)
  }, [])

  const revertChanges = useCallback(() => {
    setPendingActions(new Map())
    setHasUnsavedChanges(false)
    onSetEditingDpad(null)
  }, [onSetEditingDpad])


  return (
    <div className="mapping-panel-content">
      <div className="mapping-header">
        <h3>D-Pad</h3>
        <p className="panel-subtitle">Configure D-Pad mapping with combined keys</p>
        {currentDpadDirection && (
          <span className="pressed-indicator">● {DIRECTION_LABELS[currentDpadDirection]} Active</span>
        )}
      </div>
      
      <div className="stick-directions-list">
        {STICK_DIRECTIONS.map(direction => {
          const dpadMapping = mapping?.dpadMappings?.find(m => m.direction === direction)
          const isEditing = editingDpad?.direction === direction
          const pendingAction = pendingActions.get(direction)
          const isActive = currentDpadDirection === direction

          return (
            <div
              key={direction}
              className={`button-mapping-item ${dpadMapping ? 'has-mapping' : ''} ${isActive ? 'active' : ''} ${isEditing ? 'editing' : ''}`}
              onClick={() => {
                onSetEditingDpad({ gamepadIndex: gamepad.index, direction })
              }}
            >
              <div className="direction-label">{DIRECTION_LABELS[direction]}</div>
              <MappingActionSelector
                currentMapping={dpadMapping ? { key: dpadMapping.key, label: dpadMapping.label, action: dpadMapping.action } : null}
                isEditing={isEditing}
                pendingAction={pendingAction || null}
                onActionChange={(assignment) => handleActionChange(direction, assignment)}
                onActionClear={() => {
                  setPendingActions(prev => {
                    const newMap = new Map(prev)
                    newMap.delete(direction)
                    setHasUnsavedChanges(newMap.size > 0)
                    return newMap
                  })
                }}
                onRemove={() => {
                  onRemoveDpadMapping(direction)
                  setPendingActions(prev => {
                    const newMap = new Map(prev)
                    newMap.delete(direction)
                    setHasUnsavedChanges(newMap.size > 0)
                    return newMap
                  })
                }}
                showRemove={!!dpadMapping || !!pendingAction}
              />
              {isActive && <span className="active-indicator">●</span>}
            </div>
          )
        })}
      </div>

      {editingDpad && pendingActions.get(editingDpad.direction) && (
        <div className="editing-hint">
          <div>New mapping: <strong>{pendingActions.get(editingDpad.direction)?.label}</strong> (press Apply Changes to save)</div>
        </div>
      )}
      
      <MappingActions
        hasUnsavedChanges={hasUnsavedChanges && pendingActions.size > 0}
        onApplyChanges={() => {
          // Apply all pending actions, not just the currently editing one
          pendingActions.forEach((pendingAction, direction) => {
            onSetDpadMapping(direction, pendingAction.key, pendingAction.label, pendingAction.action)
          })
          setPendingActions(new Map())
          setHasUnsavedChanges(false)
          onSetEditingDpad(null)
        }}
        onRevertChanges={revertChanges}
        onRemoveMapping={() => {
          if (editingDpad) {
            onRemoveDpadMapping(editingDpad.direction)
            setPendingActions(prev => {
              const newMap = new Map(prev)
              newMap.delete(editingDpad.direction)
              return newMap
            })
            setHasUnsavedChanges(false)
          }
        }}
        showRemove={editingDpad !== null && (!!mapping?.dpadMappings?.find(m => m.direction === editingDpad.direction) || !!pendingActions.get(editingDpad.direction))}
      />
    </div>
  )
}
