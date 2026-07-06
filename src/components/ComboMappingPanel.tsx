import { useCallback, useMemo, useState } from "react";
import { GamepadState } from "../hooks/useGamepad";
import { ComboInput, ComboMapping } from "../hooks/useGamepadMapping";
import {
  DEFAULT_COMBO_TERM_MS,
  DEFAULT_STICK_DIRECTION_GAP_DEGREES,
  DEFAULT_STICK_THRESHOLD,
  MAX_COMBO_TERM_MS,
  MIN_COMBO_TERM_MS,
} from "../constants/defaults";
import { getButtonConfig, getDpad } from "../constants/controllerMappings";
import { DIRECTION_LABELS, STICK_DIRECTIONS } from "../constants/directionLabels";
import { MappingActionAssignment } from "../types/mappingAction";
import {
  dedupeComboInputs,
  normalizeComboTermMs,
} from "../utils/comboMapping";
import { MappingActionSelector } from "./MappingActionSelector";
import { MappingActions } from "./MappingPanel";
import "./MappingPanel.css";

interface ComboMappingPanelProps {
  gamepad: GamepadState;
  comboMappings: ComboMapping[];
  onSetComboMapping: (comboMapping: ComboMapping) => void;
  onRemoveComboMapping: (comboId: string) => void;
}

interface ComboInputOption {
  group: string;
  input: ComboInput;
  label: string;
  value: string;
}

function createComboId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `combo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getComboInputLabel(gamepad: GamepadState, input: ComboInput) {
  if (input.type === "button") {
    return (
      getButtonConfig(input.buttonIndex, gamepad.mapping)?.label ??
      `Button ${input.buttonIndex}`
    );
  }

  if (input.type === "dpad") {
    return `D-Pad ${DIRECTION_LABELS[input.direction]}`;
  }

  const stickLabel = input.stickIndex === 0 ? "LS" : "RS";
  return `${stickLabel} ${DIRECTION_LABELS[input.direction]}`;
}

function getComboInputKey(input: ComboInput) {
  if (input.type === "button") {
    return `button-${input.buttonIndex}`;
  }

  if (input.type === "dpad") {
    return `dpad-${input.direction}`;
  }

  return `axis-${input.stickIndex}-${input.direction}`;
}

function getComboInputOptions(gamepad: GamepadState): ComboInputOption[] {
  const dpad = getDpad(gamepad.mapping);
  const dpadButtonIndices = new Set(dpad ? Object.values(dpad.buttons) : []);
  const options: ComboInputOption[] = [];

  gamepad.buttons.forEach((_, buttonIndex) => {
    if (!dpadButtonIndices.has(buttonIndex)) {
      const input: ComboInput = { type: "button", buttonIndex };
      options.push({
        group: "Buttons",
        input,
        label: getComboInputLabel(gamepad, input),
        value: getComboInputKey(input),
      });
    }
  });

  STICK_DIRECTIONS.forEach((direction) => {
    const input: ComboInput = { type: "dpad", direction };
    options.push({
      group: "D-Pad",
      input,
      label: getComboInputLabel(gamepad, input),
      value: getComboInputKey(input),
    });
  });

  [0, 1].forEach((stickIndex) => {
    STICK_DIRECTIONS.forEach((direction) => {
      const input: ComboInput = {
        type: "axis",
        stickIndex,
        direction,
        threshold: DEFAULT_STICK_THRESHOLD,
        directionGapDegrees: DEFAULT_STICK_DIRECTION_GAP_DEGREES,
      };
      options.push({
        group: stickIndex === 0 ? "Left Stick" : "Right Stick",
        input,
        label: getComboInputLabel(gamepad, input),
        value: getComboInputKey(input),
      });
    });
  });

  return options;
}

function groupComboInputOptions(options: ComboInputOption[]) {
  return options.reduce<Array<{ group: string; options: ComboInputOption[] }>>(
    (groups, option) => {
      const existingGroup = groups.find((group) => group.group === option.group);
      if (existingGroup) {
        existingGroup.options.push(option);
      } else {
        groups.push({ group: option.group, options: [option] });
      }

      return groups;
    },
    []
  );
}

export function ComboMappingPanel({
  gamepad,
  comboMappings,
  onSetComboMapping,
  onRemoveComboMapping,
}: ComboMappingPanelProps) {
  const [pendingInputs, setPendingInputs] = useState<ComboInput[]>([]);
  const [pendingAction, setPendingAction] =
    useState<MappingActionAssignment | null>(null);
  const [termMs, setTermMs] = useState(DEFAULT_COMBO_TERM_MS);

  const comboInputOptions = useMemo(
    () => getComboInputOptions(gamepad),
    [gamepad]
  );
  const groupedComboInputOptions = useMemo(
    () => groupComboInputOptions(comboInputOptions),
    [comboInputOptions]
  );

  const startPendingCombo = useCallback(() => {
    setPendingInputs(comboInputOptions.slice(0, 2).map((option) => option.input));
    setPendingAction(null);
    setTermMs(DEFAULT_COMBO_TERM_MS);
  }, [comboInputOptions]);

  const resetPendingCombo = useCallback(() => {
    setPendingInputs([]);
    setPendingAction(null);
    setTermMs(DEFAULT_COMBO_TERM_MS);
  }, []);

  const setPendingInput = useCallback(
    (inputIndex: number, value: string) => {
      const selectedOption = comboInputOptions.find(
        (option) => option.value === value
      );
      if (!selectedOption) {
        return;
      }

      setPendingInputs((previousInputs) => {
        const nextInputs = [...previousInputs];
        nextInputs[inputIndex] = selectedOption.input;
        return nextInputs;
      });
    },
    [comboInputOptions]
  );

  const hasPendingCombo = pendingInputs.length > 0 || !!pendingAction;
  const hasUniquePendingInputs =
    pendingInputs.length >= 2 &&
    dedupeComboInputs(pendingInputs).length === pendingInputs.length;
  const canApplyCombo = hasUniquePendingInputs && !!pendingAction;

  return (
    <div className="mappings-section combo-mapping-section">
      <div className="combo-section-header">
        <h4 className="mappings-section-title">Combos</h4>
        <button
          className="btn-edit combo-add-button"
          type="button"
          disabled={comboInputOptions.length < 2}
          onClick={startPendingCombo}
        >
          Add Combo
        </button>
      </div>

      {comboMappings.length > 0 && (
        <div className="mappings-list">
          {comboMappings.map((comboMapping) => (
            <div key={comboMapping.id} className="mapping-item combo-mapping-item">
              <div className="mapping-item-label">
                {comboMapping.inputs
                  .map((input) => getComboInputLabel(gamepad, input))
                  .join(" + ")}
              </div>
              <div className="mapping-item-value">
                <span className="mapped-key-small">{comboMapping.label}</span>
                <span className="combo-term-label">{normalizeComboTermMs(comboMapping.termMs)} ms</span>
                <button
                  className="btn-remove-small"
                  type="button"
                  onClick={() => onRemoveComboMapping(comboMapping.id)}
                  title="Remove combo"
                >
                  x
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasPendingCombo && (
        <div className="combo-editor">
          <div className="editing-hint">
            <div>
              Combo: <strong>{pendingInputs.map((input) => getComboInputLabel(gamepad, input)).join(" + ")}</strong>
            </div>
          </div>

          <div className="combo-input-selectors">
            {[0, 1].map((inputIndex) => (
              <div className="mapping-action-control combo-input-selector" key={inputIndex}>
                <label>{`Input ${inputIndex + 1}`}</label>
                <select
                  value={
                    pendingInputs[inputIndex]
                      ? getComboInputKey(pendingInputs[inputIndex])
                      : ""
                  }
                  onChange={(event) =>
                    setPendingInput(inputIndex, event.target.value)
                  }
                >
                  {groupedComboInputOptions.map((group) => (
                    <optgroup key={group.group} label={group.group}>
                      {group.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {!hasUniquePendingInputs && (
            <div className="combo-validation-label">
              Select two different inputs.
            </div>
          )}

          {pendingInputs.length >= 2 && (
            <>
              <div className="button-mapping-item editing combo-action-row">
                <div className="direction-label">Action</div>
                <MappingActionSelector
                  currentMapping={null}
                  isEditing
                  pendingAction={pendingAction}
                  onActionChange={setPendingAction}
                  onActionClear={() => setPendingAction(null)}
                  showRemove={false}
                />
              </div>

              <div className="threshold-control">
                <label>Combo term:</label>
                <input
                  type="range"
                  min={MIN_COMBO_TERM_MS}
                  max={MAX_COMBO_TERM_MS}
                  step="10"
                  value={termMs}
                  onChange={(event) => setTermMs(Number(event.target.value))}
                />
                <span>{termMs} ms</span>
              </div>
            </>
          )}

          {canApplyCombo ? (
            <MappingActions
              hasUnsavedChanges={hasPendingCombo}
              onApplyChanges={() => {
                if (!pendingAction) {
                  return;
                }

                onSetComboMapping({
                  id: createComboId(),
                  inputs: pendingInputs,
                  key: pendingAction.key,
                  label: pendingAction.label,
                  action: pendingAction.action,
                  termMs,
                });
                resetPendingCombo();
              }}
              onRevertChanges={resetPendingCombo}
              onRemoveMapping={resetPendingCombo}
              showRemove={false}
            />
          ) : (
            <div className="mapping-actions">
              <button className="btn-revert" onClick={resetPendingCombo}>
                Revert Changes
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
