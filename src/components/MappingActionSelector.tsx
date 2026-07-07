import { useEffect, useMemo, useState } from "react";
import { KeyMappingSelector } from "./KeyMappingSelector";
import {
  DEFAULT_TAPPING_TERM_MS,
  MAX_TAPPING_TERM_MS,
  MIN_TAPPING_TERM_MS,
} from "../constants/defaults";
import {
  createInputAction,
  createInputAssignment,
  createLayerAction,
  createLayerAssignment,
  createTapHoldAssignment,
  describeMappingAction,
  LayerActionMode,
  MappingActionAssignment,
  normalizeMappingAssignment,
  RecordedInputAction,
  TapHoldKind,
} from "../types/mappingAction";
import "./MappingPanel.css";

interface MappingActionSelectorProps {
  currentMapping: MappingActionAssignment | null;
  isEditing: boolean;
  pendingAction: MappingActionAssignment | null;
  onActionChange: (assignment: MappingActionAssignment) => void;
  onActionClear?: () => void;
  onRemove?: () => void;
  showRemove?: boolean;
}

type EditorMode = "input" | "layer" | "tap-hold";

const layerModes: Array<{ value: LayerActionMode; label: string }> = [
  { value: "momentary", label: "Momentary - MO(layer)" },
  { value: "toggle", label: "Toggle - TG(layer)" },
  { value: "switch", label: "Switch - TO(layer)" },
  { value: "default", label: "Default - DF(layer)" },
];

const tapHoldKinds: Array<{ value: TapHoldKind; label: string }> = [
  { value: "mod-tap", label: "Mod-Tap - MT(mod, key)" },
  { value: "layer-tap", label: "Layer-Tap - LT(layer, key)" },
];

const modifierOptions = [
  { key: "Control", label: "CTRL" },
  { key: "Alt", label: "ALT" },
  { key: "Shift", label: "SHIFT" },
  { key: "Meta", label: "META" },
];

function getEditorMode(mapping: MappingActionAssignment | null): EditorMode {
  if (mapping?.action?.type === "layer") {
    return "layer";
  }

  if (mapping?.action?.type === "tap-hold") {
    return "tap-hold";
  }

  return "input";
}

function getLayerMode(mapping: MappingActionAssignment | null): LayerActionMode {
  return mapping?.action?.type === "layer" ? mapping.action.mode : "momentary";
}

function getLayerIndex(mapping: MappingActionAssignment | null): number {
  return mapping?.action?.type === "layer" ? mapping.action.layer : 1;
}

function getTapHoldKind(mapping: MappingActionAssignment | null): TapHoldKind {
  return mapping?.action?.type === "tap-hold" ? mapping.action.kind : "mod-tap";
}

function getTapHoldTap(
  mapping: MappingActionAssignment | null
): RecordedInputAction | null {
  if (mapping?.action?.type === "tap-hold") {
    return mapping.action.tap;
  }

  if (mapping?.action?.type === "input") {
    return mapping.action;
  }

  return null;
}

function getTapHoldModifierKey(mapping: MappingActionAssignment | null) {
  if (
    mapping?.action?.type === "tap-hold" &&
    mapping.action.kind === "mod-tap" &&
    mapping.action.hold.type === "input"
  ) {
    return mapping.action.hold.key;
  }

  return "Control";
}

function getTapHoldLayerIndex(mapping: MappingActionAssignment | null) {
  if (
    mapping?.action?.type === "tap-hold" &&
    mapping.action.kind === "layer-tap" &&
    mapping.action.hold.type === "layer"
  ) {
    return mapping.action.hold.layer;
  }

  return 1;
}

function getTapHoldTerm(mapping: MappingActionAssignment | null) {
  return mapping?.action?.type === "tap-hold"
    ? mapping.action.tappingTermMs
    : DEFAULT_TAPPING_TERM_MS;
}

function getModifierOption(key: string) {
  return (
    modifierOptions.find((option) => option.key === key) ?? modifierOptions[0]
  );
}

export function MappingActionSelector({
  currentMapping,
  isEditing,
  pendingAction,
  onActionChange,
  onActionClear,
  onRemove,
  showRemove = false,
}: MappingActionSelectorProps) {
  const displayMapping = useMemo(() => {
    const mapping = pendingAction ?? currentMapping;
    return mapping ? normalizeMappingAssignment(mapping) : null;
  }, [currentMapping, pendingAction]);

  const displayMappingKey = displayMapping
    ? displayMapping.action.type === "layer"
      ? `layer:${displayMapping.action.mode}:${displayMapping.action.layer}`
      : displayMapping.action.type === "tap-hold"
        ? `tap-hold:${displayMapping.action.kind}:${displayMapping.action.tap.key}:${displayMapping.action.hold.type}:${describeMappingAction(displayMapping.action.hold)}:${displayMapping.action.tappingTermMs}`
        : `input:${displayMapping.action.key}:${displayMapping.action.label}`
    : "empty";

  const displayEditorState = useMemo(
    () => ({
      mode: getEditorMode(displayMapping),
      layerMode: getLayerMode(displayMapping),
      layerIndex: getLayerIndex(displayMapping),
      tapHoldKind: getTapHoldKind(displayMapping),
      tapHoldTap: getTapHoldTap(displayMapping),
      tapHoldModifierKey: getTapHoldModifierKey(displayMapping),
      tapHoldLayerIndex: getTapHoldLayerIndex(displayMapping),
      tapHoldTerm: getTapHoldTerm(displayMapping),
    }),
    [displayMappingKey]
  );

  const [editorMode, setEditorMode] = useState<EditorMode>(
    displayEditorState.mode
  );
  const [layerMode, setLayerMode] = useState<LayerActionMode>(
    displayEditorState.layerMode
  );
  const [layerIndex, setLayerIndex] = useState(displayEditorState.layerIndex);
  const [tapHoldKind, setTapHoldKind] = useState<TapHoldKind>(
    displayEditorState.tapHoldKind
  );
  const [tapHoldTap, setTapHoldTap] = useState<RecordedInputAction | null>(
    displayEditorState.tapHoldTap
  );
  const [tapHoldModifierKey, setTapHoldModifierKey] = useState(
    displayEditorState.tapHoldModifierKey
  );
  const [tapHoldLayerIndex, setTapHoldLayerIndex] = useState(
    displayEditorState.tapHoldLayerIndex
  );
  const [tapHoldTerm, setTapHoldTerm] = useState(displayEditorState.tapHoldTerm);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    setEditorMode(displayEditorState.mode);
    setLayerMode(displayEditorState.layerMode);
    setLayerIndex(displayEditorState.layerIndex);
    setTapHoldKind(displayEditorState.tapHoldKind);
    setTapHoldTap(displayEditorState.tapHoldTap);
    setTapHoldModifierKey(displayEditorState.tapHoldModifierKey);
    setTapHoldLayerIndex(displayEditorState.tapHoldLayerIndex);
    setTapHoldTerm(displayEditorState.tapHoldTerm);
  }, [displayEditorState, isEditing]);

  const applyLayerAction = (mode: LayerActionMode, layer: number) => {
    const nextLayer = Number.isFinite(layer) ? Math.max(0, Math.floor(layer)) : 0;
    onActionChange(createLayerAssignment(mode, nextLayer));
  };

  const applyTapHoldAction = (
    kind: TapHoldKind,
    tap: RecordedInputAction | null,
    modifierKey: string,
    layer: number,
    termMs: number
  ) => {
    if (!tap) {
      onActionClear?.();
      return;
    }

    const nextLayer = Number.isFinite(layer) ? Math.max(0, Math.floor(layer)) : 0;
    const hold =
      kind === "layer-tap"
        ? createLayerAction("momentary", nextLayer)
        : createInputAction(
            getModifierOption(modifierKey).key,
            getModifierOption(modifierKey).label
          );

    onActionChange(createTapHoldAssignment(kind, tap, hold, termMs));
  };

  const layerDisplay =
    displayMapping?.action?.type === "layer"
      ? describeMappingAction(displayMapping.action)
      : describeMappingAction(createLayerAssignment(layerMode, layerIndex).action);

  const tapHoldDisplay =
    displayMapping?.action?.type === "tap-hold"
      ? describeMappingAction(displayMapping.action)
      : tapHoldTap
        ? describeMappingAction(
            createTapHoldAssignment(
              tapHoldKind,
              tapHoldTap,
              tapHoldKind === "layer-tap"
                ? createLayerAction("momentary", tapHoldLayerIndex)
                : createInputAction(
                    getModifierOption(tapHoldModifierKey).key,
                    getModifierOption(tapHoldModifierKey).label
                  ),
              tapHoldTerm
            ).action
          )
        : "Tap/Hold";

  const currentInputMapping =
    displayMapping && displayMapping.action.type === "input"
      ? {
          key: displayMapping.action.key,
          label: displayMapping.action.label,
        }
      : null;

  const pendingInputMapping =
    pendingAction?.action?.type === "input"
      ? {
          key: pendingAction.action.key,
          label: pendingAction.action.label,
        }
      : null;

  return (
    <div className="mapping-action-selector">
      {isEditing && (
        <div className="mapping-action-control">
          <label>Action</label>
          <select
            value={editorMode}
            onChange={(event) => {
              const nextMode = event.target.value as EditorMode;
              setEditorMode(nextMode);

              if (nextMode === "layer") {
                applyLayerAction(layerMode, layerIndex);
              } else if (nextMode === "tap-hold") {
                applyTapHoldAction(
                  tapHoldKind,
                  tapHoldTap,
                  tapHoldModifierKey,
                  tapHoldLayerIndex,
                  tapHoldTerm
                );
              } else {
                onActionClear?.();
              }
            }}
          >
            <option value="input">Input</option>
            <option value="layer">Layer action</option>
            <option value="tap-hold">Tap/Hold</option>
          </select>
        </div>
      )}

      {editorMode === "layer" ? (
        <>
          <div className="direction-mapping layer-action-display">
            <span className="mapped-key">{layerDisplay}</span>
            {pendingAction && (
              <span className="mapping-unsaved-label">(unsaved)</span>
            )}
            {showRemove && onRemove && (
              <button
                className="btn-remove-small"
                onClick={(event) => {
                  event.stopPropagation();
                  onRemove();
                }}
                title="Remove mapping"
              >
                x
              </button>
            )}
          </div>

          {isEditing && (
            <div className="layer-action-controls">
              <div className="mapping-action-control">
                <label>Mode</label>
                <select
                  value={layerMode}
                  onChange={(event) => {
                    const nextMode = event.target.value as LayerActionMode;
                    setLayerMode(nextMode);
                    applyLayerAction(nextMode, layerIndex);
                  }}
                >
                  {layerModes.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mapping-action-control">
                <label>Layer</label>
                <input
                  type="number"
                  min="0"
                  max="9"
                  value={layerIndex}
                  onChange={(event) => {
                    const nextLayer = Number(event.target.value);
                    setLayerIndex(nextLayer);
                    applyLayerAction(layerMode, nextLayer);
                  }}
                />
              </div>
            </div>
          )}
        </>
      ) : editorMode === "tap-hold" ? (
        <>
          <div className="direction-mapping layer-action-display tap-hold-display">
            <span className="mapped-key">{tapHoldDisplay}</span>
            {pendingAction && (
              <span className="mapping-unsaved-label">(unsaved)</span>
            )}
            {showRemove && onRemove && (
              <button
                className="btn-remove-small"
                onClick={(event) => {
                  event.stopPropagation();
                  onRemove();
                }}
                title="Remove mapping"
              >
                x
              </button>
            )}
          </div>

          {isEditing && (
            <div className="tap-hold-action-controls">
              <div className="mapping-action-control">
                <label>Type</label>
                <select
                  value={tapHoldKind}
                  onChange={(event) => {
                    const nextKind = event.target.value as TapHoldKind;
                    setTapHoldKind(nextKind);
                    applyTapHoldAction(
                      nextKind,
                      tapHoldTap,
                      tapHoldModifierKey,
                      tapHoldLayerIndex,
                      tapHoldTerm
                    );
                  }}
                >
                  {tapHoldKinds.map((kind) => (
                    <option key={kind.value} value={kind.value}>
                      {kind.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="button-mapping-item editing tap-hold-tap-row">
                <div className="direction-label">Tap</div>
                <KeyMappingSelector
                  currentMapping={tapHoldTap}
                  isEditing={isEditing}
                  pendingKey={null}
                  onKeyPress={(key, label) => {
                    const nextTap = createInputAction(key, label);
                    setTapHoldTap(nextTap);
                    applyTapHoldAction(
                      tapHoldKind,
                      nextTap,
                      tapHoldModifierKey,
                      tapHoldLayerIndex,
                      tapHoldTerm
                    );
                  }}
                  showRemove={false}
                />
              </div>

              {tapHoldKind === "mod-tap" ? (
                <div className="mapping-action-control">
                  <label>Hold modifier</label>
                  <select
                    value={tapHoldModifierKey}
                    onChange={(event) => {
                      const nextModifierKey = event.target.value;
                      setTapHoldModifierKey(nextModifierKey);
                      applyTapHoldAction(
                        tapHoldKind,
                        tapHoldTap,
                        nextModifierKey,
                        tapHoldLayerIndex,
                        tapHoldTerm
                      );
                    }}
                  >
                    {modifierOptions.map((modifier) => (
                      <option key={modifier.key} value={modifier.key}>
                        {modifier.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="mapping-action-control">
                  <label>Hold layer</label>
                  <input
                    type="number"
                    min="0"
                    max="9"
                    value={tapHoldLayerIndex}
                    onChange={(event) => {
                      const nextLayer = Number(event.target.value);
                      setTapHoldLayerIndex(nextLayer);
                      applyTapHoldAction(
                        tapHoldKind,
                        tapHoldTap,
                        tapHoldModifierKey,
                        nextLayer,
                        tapHoldTerm
                      );
                    }}
                  />
                </div>
              )}

              <div className="threshold-control tap-hold-term-control">
                <label>Tapping term:</label>
                <input
                  type="range"
                  min={MIN_TAPPING_TERM_MS}
                  max={MAX_TAPPING_TERM_MS}
                  step="10"
                  value={tapHoldTerm}
                  onChange={(event) => {
                    const nextTerm = Number(event.target.value);
                    setTapHoldTerm(nextTerm);
                    applyTapHoldAction(
                      tapHoldKind,
                      tapHoldTap,
                      tapHoldModifierKey,
                      tapHoldLayerIndex,
                      nextTerm
                    );
                  }}
                />
                <span>{tapHoldTerm} ms</span>
              </div>
            </div>
          )}
        </>
      ) : (
        <KeyMappingSelector
          currentMapping={currentInputMapping}
          isEditing={isEditing}
          pendingKey={pendingInputMapping}
          onKeyPress={(key, label) => {
            onActionChange(createInputAssignment(key, label));
          }}
          onRemove={onRemove}
          showRemove={showRemove}
        />
      )}
    </div>
  );
}
