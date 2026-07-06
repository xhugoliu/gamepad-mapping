import { useState, useEffect, useRef, useCallback } from "react";
import { GamepadState } from "../hooks/useGamepad";
import {
  GamepadMapping,
  StickDirection,
  StickMappingType,
} from "../hooks/useGamepadMapping";
import { StickHotkeyMode } from "./StickHotkeyMode";
import { StickMouseMode } from "./StickMouseMode";
import { StickScrollMode } from "./StickScrollMode";
import { MappingActionSelector } from "./MappingActionSelector";
import { MappingActions } from "./MappingPanel";
import { getSticks, getButtonConfig } from "../constants/controllerMappings";
import { MappingAction, MappingActionAssignment } from "../types/mappingAction";
import "./MappingPanel.css";

interface StickMappingPanelProps {
  gamepad: GamepadState;
  mapping?: GamepadMapping;
  stickIndex: number;
  editingAxis: {
    gamepadIndex: number;
    stickIndex: number;
    direction: StickDirection;
  } | null;
  editingButton: { gamepadIndex: number; buttonIndex: number } | null;
  onSetAxisMapping: (
    stickIndex: number,
    direction: StickDirection,
    key: string,
    label: string,
    threshold: number,
    type?: StickMappingType,
    sensitivity?: number,
    acceleration?: number,
    invertX?: boolean,
    invertY?: boolean,
    action?: MappingAction
  ) => void;
  onRemoveAxisMapping: (stickIndex: number, direction: StickDirection) => void;
  onSetEditingAxis: (
    value: {
      gamepadIndex: number;
      stickIndex: number;
      direction: StickDirection;
    } | null
  ) => void;
  onSetButtonMapping: (buttonIndex: number, key: string, label: string, action?: MappingAction) => void;
  onRemoveButtonMapping: (buttonIndex: number) => void;
  onSetEditingButton: (
    value: { gamepadIndex: number; buttonIndex: number } | null
  ) => void;
}

export function StickMappingPanel({
  gamepad,
  mapping,
  stickIndex,
  editingAxis,
  editingButton,
  onSetAxisMapping,
  onRemoveAxisMapping,
  onSetEditingAxis,
  onSetButtonMapping,
  onRemoveButtonMapping,
  onSetEditingButton,
}: StickMappingPanelProps) {
  const [mappingType, setMappingType] = useState<StickMappingType>("hotkey");
  const previousMappingTypeRef = useRef<StickMappingType | null>(null);

  const stickMappings =
    mapping?.axisMappings.filter((m) => m.stickIndex === stickIndex) || [];
  const mouseMapping = stickMappings.find((m) => m.type === "mouse");
  const scrollMapping = stickMappings.find((m) => m.type === "scroll");
  const isMouseMode = mouseMapping !== undefined || mappingType === "mouse";
  const isScrollMode = scrollMapping !== undefined || mappingType === "scroll";

  // Sync mapping type with existing mappings
  useEffect(() => {
    if (mouseMapping) {
      setMappingType("mouse");
      previousMappingTypeRef.current = "mouse";
    } else if (scrollMapping) {
      setMappingType("scroll");
      previousMappingTypeRef.current = "scroll";
    } else {
      setMappingType("hotkey");
    }
  }, [mouseMapping, scrollMapping]);

  const removeAllStickMappings = (stickIndex: number) => {
    const stickMappings =
      mapping?.axisMappings.filter((m) => m.stickIndex === stickIndex) || [];
    stickMappings.forEach((m) => {
      onRemoveAxisMapping(stickIndex, m.direction);
    });
  };

  // Get stick button index (10 for left stick, 11 for right stick)
  const stickButtonIndex = getSticks(gamepad.mapping).find(
    (s) => s.index === stickIndex
  )?.buttonIndex;
  
  const stickButton = stickButtonIndex !== undefined ? gamepad.buttons[stickButtonIndex] : null;
  const stickButtonMapping = stickButtonIndex !== undefined
    ? mapping?.buttonMappings.find((m) => m.buttonIndex === stickButtonIndex)
    : null;
  const isEditingStickButton = editingButton?.buttonIndex === stickButtonIndex;
  const [pendingStickButtonAction, setPendingStickButtonAction] =
    useState<MappingActionAssignment | null>(null);
  const [hasUnsavedStickButtonChanges, setHasUnsavedStickButtonChanges] = useState(false);

  const handleStickButtonActionChange = useCallback(
    (assignment: MappingActionAssignment) => {
      setPendingStickButtonAction(assignment);
      setHasUnsavedStickButtonChanges(true);
    },
    []
  );

  const handleStickButtonApply = useCallback(() => {
    if (pendingStickButtonAction && stickButtonIndex !== undefined) {
      onSetButtonMapping(
        stickButtonIndex,
        pendingStickButtonAction.key,
        pendingStickButtonAction.label,
        pendingStickButtonAction.action
      );
      setPendingStickButtonAction(null);
      setHasUnsavedStickButtonChanges(false);
      onSetEditingButton(null);
    }
  }, [
    pendingStickButtonAction,
    stickButtonIndex,
    onSetButtonMapping,
    onSetEditingButton,
  ]);

  const handleStickButtonRevert = useCallback(() => {
    setPendingStickButtonAction(null);
    setHasUnsavedStickButtonChanges(false);
    onSetEditingButton(null);
  }, [onSetEditingButton]);

  const getButtonLabel = (index: number) => {
    const config = getButtonConfig(index, gamepad.mapping);
    return config?.label || `Button ${index}`;
  };

  return (
    <div className="mapping-panel-content">
      <div className="mapping-header">
        <h3>{stickIndex === 0 ? "Left" : "Right"} Stick</h3>
        <p className="panel-subtitle">Configure stick mapping</p>
      </div>

      {/* Stick Button Mapping */}
      {stickButtonIndex !== undefined && (
        <div className="stick-button-mapping-section">
          <h4 className="mappings-section-title">
            Stick Button ({stickIndex === 0 ? "LS" : "RS"})
          </h4>
          <div className="stick-directions-list">
            <div
              className={`button-mapping-item ${
                stickButtonMapping ? "has-mapping" : ""
              } ${stickButton?.pressed ? "active" : ""} ${
                isEditingStickButton ? "editing" : ""
              }`}
              onClick={() => {
                if (!isEditingStickButton) {
                  setPendingStickButtonAction(null);
                  setHasUnsavedStickButtonChanges(false);
                  onSetEditingButton({
                    gamepadIndex: gamepad.index,
                    buttonIndex: stickButtonIndex,
                  });
                }
              }}
            >
              <div className="direction-label">{getButtonLabel(stickButtonIndex)}</div>
              <MappingActionSelector
                currentMapping={
                  stickButtonMapping
                    ? {
                        key: stickButtonMapping.key,
                        label: stickButtonMapping.label,
                        action: stickButtonMapping.action,
                      }
                    : null
                }
                isEditing={isEditingStickButton}
                pendingAction={pendingStickButtonAction}
                onActionChange={handleStickButtonActionChange}
                onActionClear={() => {
                  setPendingStickButtonAction(null);
                  setHasUnsavedStickButtonChanges(false);
                }}
                onRemove={() => {
                  onRemoveButtonMapping(stickButtonIndex);
                  setHasUnsavedStickButtonChanges(false);
                  setPendingStickButtonAction(null);
                }}
                showRemove={!!stickButtonMapping || !!pendingStickButtonAction}
              />
              {stickButton?.pressed && (
                <span className="active-indicator">●</span>
              )}
            </div>
          </div>

          {isEditingStickButton && (
            <div className="editing-hint">
              {pendingStickButtonAction ? (
                <div>
                  New mapping: <strong>{pendingStickButtonAction.label}</strong>{" "}
                  (press Apply Changes to save)
                </div>
              ) : (
                <div>
                  Choose an action or record a keyboard, mouse, or wheel input...
                </div>
              )}
            </div>
          )}

          <MappingActions
            hasUnsavedChanges={hasUnsavedStickButtonChanges && isEditingStickButton}
            onApplyChanges={handleStickButtonApply}
            onRevertChanges={handleStickButtonRevert}
            onRemoveMapping={() => {
              onRemoveButtonMapping(stickButtonIndex);
              setHasUnsavedStickButtonChanges(false);
              setPendingStickButtonAction(null);
            }}
            showRemove={!!stickButtonMapping || !!pendingStickButtonAction}
          />
        </div>
      )}

      {/* Mode selector */}
      <div className="mapping-mode-selector">
        <label>Mapping Mode:</label>
        <div className="mode-buttons">
          <button
            className={`mode-button ${!isMouseMode && !isScrollMode ? "active" : ""}`}
            onClick={() => {
              stickMappings.forEach((m) => {
                if (m.type !== "hotkey") {
                  onRemoveAxisMapping(stickIndex, m.direction);
                }
              });
              // Track that we're switching modes
              previousMappingTypeRef.current = mappingType;
              // Always set to hotkey mode and clear editing state
              setMappingType("hotkey");
              if (editingAxis?.stickIndex === stickIndex) {
                onSetEditingAxis(null);
              }
            }}
          >
            8 Directions (Hotkeys)
          </button>
          <button
            className={`mode-button ${isMouseMode ? "active" : ""}`}
            onClick={() => {
              if (!mouseMapping) {
                stickMappings.forEach((m) => {
                  if (m.type !== "mouse") {
                    onRemoveAxisMapping(stickIndex, m.direction);
                  }
                });
                // Track that we're switching modes
                previousMappingTypeRef.current = mappingType;
                setMappingType("mouse");
                // Clear any editing state
                if (editingAxis?.stickIndex === stickIndex) {
                  onSetEditingAxis(null);
                }
              }
            }}
          >
            Mouse Control
          </button>
          <button
            className={`mode-button ${isScrollMode ? "active" : ""}`}
            onClick={() => {
              if (!scrollMapping) {
                stickMappings.forEach((m) => {
                  if (m.type !== "scroll") {
                    onRemoveAxisMapping(stickIndex, m.direction);
                  }
                });
                previousMappingTypeRef.current = mappingType;
                setMappingType("scroll");
                if (editingAxis?.stickIndex === stickIndex) {
                  onSetEditingAxis(null);
                }
              }
            }}
          >
            Scroll Control
          </button>
        </div>
      </div>

      {isScrollMode ? (
        <StickScrollMode
          mapping={mapping}
          stickIndex={stickIndex}
          onSetAxisMapping={onSetAxisMapping}
          onRemoveAxisMapping={onRemoveAxisMapping}
          previousMappingType={previousMappingTypeRef.current}
        />
      ) : isMouseMode ? (
        <StickMouseMode
          mapping={mapping}
          stickIndex={stickIndex}
          onSetAxisMapping={onSetAxisMapping}
          onRemoveAxisMapping={onRemoveAxisMapping}
          previousMappingType={previousMappingTypeRef.current}
        />
      ) : (
        <StickHotkeyMode
          gamepad={gamepad}
          mapping={mapping}
          stickIndex={stickIndex}
          editingAxis={editingAxis}
          onSetAxisMapping={onSetAxisMapping}
          onRemoveAxisMapping={onRemoveAxisMapping}
          onSetEditingAxis={onSetEditingAxis}
          onRemoveAllMappings={removeAllStickMappings}
        />
      )}
    </div>
  );
}
