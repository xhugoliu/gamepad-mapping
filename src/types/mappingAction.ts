export type RecordedInputAction = {
  type: "input";
  key: string;
  label: string;
};

export type LayerActionMode = "momentary" | "toggle" | "switch" | "default";

export type LayerAction = {
  type: "layer";
  mode: LayerActionMode;
  layer: number;
};

export type MappingAction = RecordedInputAction | LayerAction;

export interface MappingActionAssignment {
  key: string;
  label: string;
  action?: MappingAction;
}

const LAYER_MODE_LABELS: Record<LayerActionMode, string> = {
  momentary: "MO",
  toggle: "TG",
  switch: "TO",
  default: "DF",
};

export function createInputAction(
  key: string,
  label: string
): RecordedInputAction {
  return {
    type: "input",
    key,
    label,
  };
}

export function createLayerAction(
  mode: LayerActionMode,
  layer: number
): LayerAction {
  return {
    type: "layer",
    mode,
    layer,
  };
}

export function describeMappingAction(action: MappingAction): string {
  if (action.type === "input") {
    return action.label;
  }

  return `${LAYER_MODE_LABELS[action.mode]}(${action.layer})`;
}

export function normalizeMappingAssignment(
  mapping: MappingActionAssignment
): Required<MappingActionAssignment> {
  const action = mapping.action ?? createInputAction(mapping.key, mapping.label);
  return {
    key: mapping.key,
    label: describeMappingAction(action),
    action,
  };
}

export function createInputAssignment(
  key: string,
  label: string
): Required<MappingActionAssignment> {
  const action = createInputAction(key, label);
  return {
    key,
    label,
    action,
  };
}

export function createLayerAssignment(
  mode: LayerActionMode,
  layer: number
): Required<MappingActionAssignment> {
  const action = createLayerAction(mode, layer);
  const label = describeMappingAction(action);
  return {
    key: label,
    label,
    action,
  };
}
