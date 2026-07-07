import {
  DEFAULT_TAPPING_TERM_MS,
  MAX_TAPPING_TERM_MS,
  MIN_TAPPING_TERM_MS,
} from "../constants/defaults";

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

export type TapHoldKind = "mod-tap" | "layer-tap";

export type TapHoldHoldAction = RecordedInputAction | LayerAction;

export type TapHoldAction = {
  type: "tap-hold";
  kind: TapHoldKind;
  tap: RecordedInputAction;
  hold: TapHoldHoldAction;
  tappingTermMs: number;
};

export type MappingAction = RecordedInputAction | LayerAction | TapHoldAction;

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

export function normalizeTappingTermMs(tappingTermMs?: number) {
  if (typeof tappingTermMs !== "number" || !Number.isFinite(tappingTermMs)) {
    return DEFAULT_TAPPING_TERM_MS;
  }

  return Math.min(
    MAX_TAPPING_TERM_MS,
    Math.max(MIN_TAPPING_TERM_MS, Math.round(tappingTermMs))
  );
}

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

function normalizeInputAction(action: RecordedInputAction): RecordedInputAction {
  return createInputAction(action.key, action.label || action.key);
}

function normalizeLayerAction(action: LayerAction): LayerAction {
  return createLayerAction(action.mode, action.layer);
}

export function createTapHoldAction(
  kind: TapHoldKind,
  tap: RecordedInputAction,
  hold: TapHoldHoldAction,
  tappingTermMs: number = DEFAULT_TAPPING_TERM_MS
): TapHoldAction {
  return {
    type: "tap-hold",
    kind,
    tap: normalizeInputAction(tap),
    hold:
      hold.type === "layer"
        ? normalizeLayerAction(hold)
        : normalizeInputAction(hold),
    tappingTermMs: normalizeTappingTermMs(tappingTermMs),
  };
}

export function normalizeMappingAction(action: MappingAction): MappingAction {
  if (action.type === "input") {
    return normalizeInputAction(action);
  }

  if (action.type === "layer") {
    return normalizeLayerAction(action);
  }

  return createTapHoldAction(
    action.kind,
    action.tap,
    action.hold,
    action.tappingTermMs
  );
}

export function describeMappingAction(action: MappingAction): string {
  if (action.type === "input") {
    return action.label;
  }

  if (action.type === "tap-hold") {
    if (action.kind === "layer-tap" && action.hold.type === "layer") {
      return `LT(${action.hold.layer}, ${action.tap.label})`;
    }

    if (action.kind === "mod-tap" && action.hold.type === "input") {
      return `MT(${action.hold.label}, ${action.tap.label})`;
    }

    return `HT(${describeMappingAction(action.hold)}, ${action.tap.label})`;
  }

  return `${LAYER_MODE_LABELS[action.mode]}(${action.layer})`;
}

export function normalizeMappingAssignment(
  mapping: MappingActionAssignment
): Required<MappingActionAssignment> {
  const action = normalizeMappingAction(
    mapping.action ?? createInputAction(mapping.key, mapping.label)
  );
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

export function createTapHoldAssignment(
  kind: TapHoldKind,
  tap: RecordedInputAction,
  hold: TapHoldHoldAction,
  tappingTermMs: number = DEFAULT_TAPPING_TERM_MS
): Required<MappingActionAssignment> {
  const action = createTapHoldAction(kind, tap, hold, tappingTermMs);
  const label = describeMappingAction(action);
  return {
    key: label,
    label,
    action,
  };
}
