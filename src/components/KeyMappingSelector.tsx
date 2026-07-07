import { useEffect, useRef } from 'react'
import { createKeyboardShortcut } from '../utils/keyboardShortcut'
import { getMouseButtonMapping } from '../utils/mouseButtonMapping'
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
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle key press and mouse button clicks
  useEffect(() => {

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditing) {
        const target = e.target as HTMLElement | null
        if (target && isInteractiveElement(target)) {
          return
        }

        e.preventDefault()

        const shortcut = createKeyboardShortcut(e)
        if (shortcut) {
          onKeyPress(shortcut.key, shortcut.label)
        }
      }
    }

    const getCurrentMappingItem = () =>
      containerRef.current?.closest('.button-mapping-item')

    const isEventInsideCurrentMappingItem = (target: EventTarget | null) => {
      const mappingItem = getCurrentMappingItem()
      return !!(mappingItem && target instanceof HTMLElement && mappingItem.contains(target))
    }

    const isInteractiveElement = (target: HTMLElement) => {
      const interactiveTags = new Set([
        'BUTTON',
        'A',
        'INPUT',
        'LABEL',
        'OPTION',
        'SELECT',
        'TEXTAREA',
      ])

      return (
        interactiveTags.has(target.tagName) ||
        target.closest('button') !== null ||
        target.closest('a') !== null ||
        target.closest('input') !== null ||
        target.closest('label') !== null ||
        target.closest('select') !== null ||
        target.closest('textarea') !== null ||
        target.closest('.btn-map') !== null ||
        target.closest('.btn-revert') !== null ||
        target.closest('.btn-remove') !== null ||
        target.closest('.btn-remove-small') !== null ||
        target.closest('.btn-edit') !== null ||
        target.closest('.mapping-action-control') !== null
      )
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (isEditing && containerRef.current) {
        const target = e.target as HTMLElement
        if (!isEventInsideCurrentMappingItem(target)) {
          return
        }

        // Ignore clicks on interactive elements (buttons, links, etc.)
        if (isInteractiveElement(target)) {
          return // Don't capture clicks on buttons/links
        }

        const mouseButtonMapping = getMouseButtonMapping(e.button)
        if (!mouseButtonMapping) {
          return
        }

        e.preventDefault()
        e.stopPropagation()

        onKeyPress(mouseButtonMapping.key, mouseButtonMapping.label)
      }
    }

    const suppressSideButtonDefault = (e: MouseEvent) => {
      if (
        !isEditing ||
        !containerRef.current ||
        (e.button !== 3 && e.button !== 4)
      ) {
        return
      }

      const target = e.target as HTMLElement
      if (!isEventInsideCurrentMappingItem(target) || isInteractiveElement(target)) {
        return
      }

      e.preventDefault()
      e.stopPropagation()
    }

    const handleWheel = (e: WheelEvent) => {
      if (!isEditing || !containerRef.current) {
        return
      }

      const target = e.target as HTMLElement
      if (!isEventInsideCurrentMappingItem(target) || isInteractiveElement(target)) {
        return
      }

      e.preventDefault()
      e.stopPropagation()

      let key: string
      let label: string
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        if (e.deltaX > 0) {
          key = 'MouseWheelRight'
          label = 'Wheel Right'
        } else {
          key = 'MouseWheelLeft'
          label = 'Wheel Left'
        }
      } else if (e.deltaY > 0) {
        key = 'MouseWheelDown'
        label = 'Wheel Down'
      } else if (e.deltaY < 0) {
        key = 'MouseWheelUp'
        label = 'Wheel Up'
      } else {
        return
      }

      onKeyPress(key, label)
    }

    if (isEditing) {
      window.addEventListener('keydown', handleKeyDown)
      window.addEventListener('mousedown', handleMouseDown, true) // Use capture phase
      window.addEventListener('mouseup', suppressSideButtonDefault, true)
      window.addEventListener('auxclick', suppressSideButtonDefault, true)
      window.addEventListener('wheel', handleWheel, { capture: true, passive: false })
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mousedown', handleMouseDown, true)
      window.removeEventListener('mouseup', suppressSideButtonDefault, true)
      window.removeEventListener('auxclick', suppressSideButtonDefault, true)
      window.removeEventListener('wheel', handleWheel, true)
    }
  }, [isEditing, onKeyPress])

  const displayKey = pendingKey || currentMapping

  return (
    <div ref={containerRef} className="direction-mapping">
      {displayKey ? (
        <>
          <span className="mapped-key">
            {displayKey.label}
          </span>
          {pendingKey && (
            <span style={{ fontSize: '0.75em', color: '#888', marginLeft: '4px' }}>(unsaved)</span>
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
  )
}
