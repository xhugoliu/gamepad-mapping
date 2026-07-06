import { useState, useCallback } from 'react'
import { GamepadState } from '../hooks/useGamepad'
import { GamepadMapping } from '../hooks/useGamepadMapping'
import { MappingActions } from './MappingPanel'
import { MappingActionSelector } from './MappingActionSelector'
import { getButtonConfig } from '../constants/controllerMappings'
import { MappingAction, MappingActionAssignment } from '../types/mappingAction'
import './MappingPanel.css'

interface ButtonMappingPanelProps {
  gamepad: GamepadState
  mapping?: GamepadMapping
  buttonIndex: number
  editingButton: { gamepadIndex: number; buttonIndex: number } | null
  onSetButtonMapping: (buttonIndex: number, key: string, label: string, action?: MappingAction) => void
  onRemoveButtonMapping: (buttonIndex: number) => void
  onSetEditingButton: (value: { gamepadIndex: number; buttonIndex: number } | null) => void
}

export function ButtonMappingPanel({
  gamepad,
  mapping,
  buttonIndex,
  editingButton,
  onSetButtonMapping,
  onRemoveButtonMapping,
  onSetEditingButton,
}: ButtonMappingPanelProps) {
  const [pendingButtonAction, setPendingButtonAction] = useState<MappingActionAssignment | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const button = gamepad.buttons[buttonIndex]
  const btnMapping = mapping?.buttonMappings.find(m => m.buttonIndex === buttonIndex)
  const isEditing = editingButton?.buttonIndex === buttonIndex

  const handleActionChange = useCallback((assignment: MappingActionAssignment) => {
    setPendingButtonAction(assignment)
    setHasUnsavedChanges(true)
  }, [])

  const revertChanges = useCallback(() => {
    setPendingButtonAction(null)
    setHasUnsavedChanges(false)
    onSetEditingButton(null)
  }, [onSetEditingButton])

  const getButtonLabel = (index: number) => {
    const config = getButtonConfig(index, gamepad.mapping)
    return config?.label || `Button ${index}`
  }

  return (
    <div className="mapping-panel-content">
      <div className="mapping-header">
        <h3>{getButtonLabel(buttonIndex)}</h3>
        <p className="panel-subtitle">Configure button mapping</p>
      </div>
      
      <div className="stick-directions-list">
        <div
          className={`button-mapping-item ${btnMapping ? 'has-mapping' : ''} ${button?.pressed ? 'active' : ''} ${isEditing ? 'editing' : ''}`}
          onClick={() => {
            // Don't clear pending changes if we're already editing (to prevent clearing mouse click mappings)
            if (!isEditing) {
              setPendingButtonAction(null)
              setHasUnsavedChanges(false)
              onSetEditingButton({ gamepadIndex: gamepad.index, buttonIndex })
            }
          }}
        >
          <div className="direction-label">{getButtonLabel(buttonIndex)}</div>
          <MappingActionSelector
            currentMapping={btnMapping ? { key: btnMapping.key, label: btnMapping.label, action: btnMapping.action } : null}
            isEditing={isEditing}
            pendingAction={pendingButtonAction}
            onActionChange={handleActionChange}
            onActionClear={() => {
              setPendingButtonAction(null)
              setHasUnsavedChanges(false)
            }}
            onRemove={() => {
              onRemoveButtonMapping(buttonIndex)
              setHasUnsavedChanges(false)
              setPendingButtonAction(null)
            }}
            showRemove={!!btnMapping || !!pendingButtonAction}
          />
          {button?.pressed && <span className="active-indicator">●</span>}
        </div>
      </div>

      {isEditing && (
        <div className="editing-hint">
          {pendingButtonAction ? (
            <div>New mapping: <strong>{pendingButtonAction.label}</strong> (press Apply Changes to save)</div>
          ) : (
            <div>Choose an action or record a keyboard, mouse, or wheel input...</div>
          )}
        </div>
      )}
      
      <MappingActions
        hasUnsavedChanges={hasUnsavedChanges && isEditing}
        onApplyChanges={() => {
          if (pendingButtonAction) {
            onSetButtonMapping(buttonIndex, pendingButtonAction.key, pendingButtonAction.label, pendingButtonAction.action)
          }
          setPendingButtonAction(null)
          setHasUnsavedChanges(false)
          onSetEditingButton(null)
        }}
        onRevertChanges={revertChanges}
        onRemoveMapping={() => {
          onRemoveButtonMapping(buttonIndex)
          setHasUnsavedChanges(false)
          setPendingButtonAction(null)
        }}
        showRemove={!!btnMapping || !!pendingButtonAction}
      />
    </div>
  )
}
