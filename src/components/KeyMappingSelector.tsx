import { useEffect, useMemo, useState } from 'react'
import {
  createInputShortcut,
  getInputOptionGroup,
  getInputOptionSelection,
  INPUT_MODIFIER_OPTIONS,
  INPUT_OPTION_GROUPS,
  InputModifierKey,
} from '../constants/inputOptions'
import './MappingPanel.css'

interface KeyMappingSelectorProps {
  currentMapping: { key: string; label: string } | null
  isEditing: boolean
  pendingKey: { key: string; label: string } | null
  onKeyPress: (key: string, label: string) => void
  onRemove?: () => void
  showRemove?: boolean
}

export function KeyMappingSelector({
  currentMapping,
  isEditing,
  pendingKey,
  onKeyPress,
  onRemove,
  showRemove = false,
}: KeyMappingSelectorProps) {
  const displayKey = pendingKey || currentMapping
  const displaySelection = useMemo(
    () => (displayKey ? getInputOptionSelection(displayKey.key) : null),
    [displayKey?.key]
  )

  const [selectedGroupId, setSelectedGroupId] = useState(
    displaySelection?.groupId ?? INPUT_OPTION_GROUPS[0].id
  )
  const [selectedOptionKey, setSelectedOptionKey] = useState(
    displaySelection?.optionKey ?? ''
  )
  const [selectedModifiers, setSelectedModifiers] = useState<InputModifierKey[]>(
    displaySelection?.modifiers ?? []
  )

  useEffect(() => {
    if (!isEditing) {
      return
    }

    setSelectedGroupId(displaySelection?.groupId ?? INPUT_OPTION_GROUPS[0].id)
    setSelectedOptionKey(displaySelection?.optionKey ?? '')
    setSelectedModifiers(displaySelection?.modifiers ?? [])
  }, [displaySelection, isEditing])

  const selectedGroup = getInputOptionGroup(selectedGroupId)

  const applySelection = (
    groupId: string,
    optionKey: string,
    modifiers: InputModifierKey[]
  ) => {
    const shortcut = createInputShortcut(groupId, optionKey, modifiers)
    if (shortcut) {
      onKeyPress(shortcut.key, shortcut.label)
    }
  }

  const handleGroupChange = (groupId: string) => {
    const nextGroup = getInputOptionGroup(groupId)
    const nextOptionKey = nextGroup.options[0]?.key ?? ''
    const nextModifiers = nextGroup.allowModifiers ? selectedModifiers : []

    setSelectedGroupId(groupId)
    setSelectedOptionKey(nextOptionKey)
    setSelectedModifiers(nextModifiers)
    applySelection(groupId, nextOptionKey, nextModifiers)
  }

  const handleOptionChange = (optionKey: string) => {
    setSelectedOptionKey(optionKey)
    applySelection(selectedGroupId, optionKey, selectedModifiers)
  }

  const toggleModifier = (modifier: InputModifierKey) => {
    const nextModifiers = selectedModifiers.includes(modifier)
      ? selectedModifiers.filter((selected) => selected !== modifier)
      : [...selectedModifiers, modifier]

    setSelectedModifiers(nextModifiers)
    if (selectedOptionKey) {
      applySelection(selectedGroupId, selectedOptionKey, nextModifiers)
    }
  }

  return (
    <div className="key-mapping-selector">
      <div className="direction-mapping">
        {displayKey ? (
          <>
            <span className="mapped-key">
              {displayKey.label}
            </span>
            {pendingKey && (
              <span className="mapping-unsaved-label">(unsaved)</span>
            )}
            {showRemove && onRemove && (
              <button
                className="btn-remove-small"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove()
                }}
                title="Remove mapping"
              >
                ×
              </button>
            )}
          </>
        ) : (
          <div className="direction-mapping unmapped">Not mapped</div>
        )}
      </div>

      {isEditing && (
        <div className="input-selection-controls">
          <div className="mapping-action-control">
            <label>Category</label>
            <select
              value={selectedGroupId}
              onChange={(event) => handleGroupChange(event.target.value)}
            >
              {INPUT_OPTION_GROUPS.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mapping-action-control">
            <label>Input</label>
            <select
              value={selectedOptionKey}
              onChange={(event) => handleOptionChange(event.target.value)}
            >
              <option value="" disabled>
                Choose input
              </option>
              {selectedGroup.options.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {selectedGroup.allowModifiers && (
            <div className="input-modifier-controls">
              <span>Modifiers</span>
              {INPUT_MODIFIER_OPTIONS.map((modifier) => (
                <label key={modifier.key}>
                  <input
                    type="checkbox"
                    checked={selectedModifiers.includes(modifier.key)}
                    onChange={() => toggleModifier(modifier.key)}
                  />
                  {modifier.label}
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
