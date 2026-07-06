import { useEffect, useMemo, useState } from "react";
import { KeyMappingSelector } from "./KeyMappingSelector";
import {
  createInputAssignment,
  createLayerAssignment,
  describeMappingAction,
  LayerActionMode,
  MappingActionAssignment,
  normalizeMappingAssignment,
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

type EditorMode = "input" | "layer";

const layerModes: Array<{ value: LayerActionMode; label: string }> = [
  { value: "momentary", label: "Momentary - MO(layer)" },
  { value: "toggle", label: "Toggle - TG(layer)" },
  { value: "switch", label: "Switch - TO(layer)" },
  { value: "default", label: "Default - DF(layer)" },
];

function getEditorMode(mapping: MappingActionAssignment | null): EditorMode {
  return mapping?.action?.type === "layer" ? "layer" : "input";
}

function getLayerMode(mapping: MappingActionAssignment | null): LayerActionMode {
  return mapping?.action?.type === "layer" ? mapping.action.mode : "momentary";
}

function getLayerIndex(mapping: MappingActionAssignment | null): number {
  return mapping?.action?.type === "layer" ? mapping.action.layer : 1;
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
      : `input:${displayMapping.action.key}:${displayMapping.action.label}`
    : "empty";

  const displayEditorState = useMemo(
    () => ({
      mode: getEditorMode(displayMapping),
      layerMode: getLayerMode(displayMapping),
      layerIndex: getLayerIndex(displayMapping),
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

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    setEditorMode(displayEditorState.mode);
    setLayerMode(displayEditorState.layerMode);
    setLayerIndex(displayEditorState.layerIndex);
  }, [displayEditorState, isEditing]);

  const applyLayerAction = (mode: LayerActionMode, layer: number) => {
    const nextLayer = Number.isFinite(layer) ? Math.max(0, Math.floor(layer)) : 0;
    onActionChange(createLayerAssignment(mode, nextLayer));
  };

  const layerDisplay =
    displayMapping?.action?.type === "layer"
      ? describeMappingAction(displayMapping.action)
      : describeMappingAction(createLayerAssignment(layerMode, layerIndex).action);

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
              } else {
                onActionClear?.();
              }
            }}
          >
            <option value="input">Recorded input</option>
            <option value="layer">Layer action</option>
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
