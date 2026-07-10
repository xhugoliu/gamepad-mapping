import { useState, useCallback, useEffect, useRef } from "react";
import { GamepadState } from "./useGamepad";
import {
  getStickDirection,
  getDpadDirection,
  getStickAxes,
} from "../utils/stickDirection";
import {
  getComboInputStateKey,
  getComboStateKey,
  isComboInputPressed,
  isComboReady,
  normalizeComboTermMs,
} from "../utils/comboMapping";
import {
  DEFAULT_STICK_THRESHOLD,
  DEFAULT_MOUSE_SENSITIVITY,
  DEFAULT_MOUSE_ACCELERATION,
  DEFAULT_MOUSE_INVERT_X,
  DEFAULT_MOUSE_INVERT_Y,
  DEFAULT_SCROLL_ACCELERATION,
  DEFAULT_SCROLL_INVERT_X,
  DEFAULT_SCROLL_INVERT_Y,
  DEFAULT_SCROLL_SENSITIVITY,
  DEFAULT_STICK_DIRECTION_GAP_DEGREES,
  DEFAULT_STICK_MAPPING_TYPE,
} from "../constants/defaults";
import {
  createInputAction,
  LayerAction,
  MappingAction,
  normalizeMappingAssignment,
  RecordedInputAction,
  TapHoldAction,
} from "../types/mappingAction";

export interface ButtonMapping {
  buttonIndex: number;
  key: string;
  label: string;
  action?: MappingAction;
}

export type StickDirection =
  | "up"
  | "down"
  | "left"
  | "right"
  | "up-left"
  | "up-right"
  | "down-left"
  | "down-right";

export type StickMappingType = "hotkey" | "mouse" | "scroll";

export interface AxisMapping {
  stickIndex: number; // 0 for left stick, 1 for right stick
  direction: StickDirection; // Only used for hotkey mode
  key: string;
  label: string;
  action?: MappingAction;
  threshold: number;
  directionGapDegrees?: number; // For hotkey mode angular gap between adjacent directions
  type: StickMappingType; // 'hotkey' for 8 directions, 'mouse' for mouse control, 'scroll' for wheel control
  sensitivity?: number; // For mouse/scroll control (0.1 - 10.0)
  acceleration?: number; // For mouse/scroll control (0.0 - 2.0)
  invertX?: boolean; // For mouse/scroll control
  invertY?: boolean; // For mouse/scroll control
}

export interface DpadMapping {
  direction: StickDirection;
  key: string;
  label: string;
  action?: MappingAction;
}

export type ComboInput =
  | {
      type: "button";
      buttonIndex: number;
    }
  | {
      type: "dpad";
      direction: StickDirection;
    }
  | {
      type: "axis";
      stickIndex: number;
      direction: StickDirection;
      threshold?: number;
      directionGapDegrees?: number;
    };

export interface ComboMapping {
  id: string;
  inputs: ComboInput[];
  key: string;
  label: string;
  action?: MappingAction;
  termMs: number;
}

export interface GamepadLayerMapping {
  layerIndex: number;
  name: string;
  buttonMappings: ButtonMapping[];
  axisMappings: AxisMapping[];
  dpadMappings: DpadMapping[];
  comboMappings: ComboMapping[];
}

export interface GamepadMappingProfile {
  id: string;
  name: string;
  buttonMappings: ButtonMapping[];
  axisMappings: AxisMapping[];
  dpadMappings?: DpadMapping[];
  comboMappings?: ComboMapping[];
  layers?: GamepadLayerMapping[];
}

export interface GamepadMapping {
  gamepadIndex: number;
  id?: string;
  name?: string;
  buttonMappings: ButtonMapping[];
  axisMappings: AxisMapping[];
  dpadMappings?: DpadMapping[];
  comboMappings?: ComboMapping[];
  layers?: GamepadLayerMapping[];
  activeProfileId?: string;
  profiles?: GamepadMappingProfile[];
}

const STORAGE_KEY = "gamepad-mappings";
const SCROLL_STEPS_PER_SECOND = 60;
const BASE_LAYER_INDEX = 0;
const DEFAULT_PROFILE_ID = "default";
const DEFAULT_PROFILE_NAME = "Default";

const getLayerName = (layerIndex: number) =>
  layerIndex === BASE_LAYER_INDEX ? "Base" : `Layer ${layerIndex}`;

const createLayerMapping = (
  layerIndex: number,
  buttonMappings: ButtonMapping[] = [],
  axisMappings: AxisMapping[] = [],
  dpadMappings: DpadMapping[] = [],
  comboMappings: ComboMapping[] = []
): GamepadLayerMapping => ({
  layerIndex,
  name: getLayerName(layerIndex),
  buttonMappings,
  axisMappings,
  dpadMappings,
  comboMappings,
});

const normalizeLayerIndex = (layerIndex: number) =>
  Number.isFinite(layerIndex) ? Math.max(0, Math.floor(layerIndex)) : 0;

const cloneSerializable = <T,>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

const cloneButtonMapping = (mapping: ButtonMapping): ButtonMapping => ({
  ...mapping,
  action: mapping.action ? cloneSerializable(mapping.action) : undefined,
});

const cloneAxisMapping = (mapping: AxisMapping): AxisMapping => ({
  ...mapping,
  action: mapping.action ? cloneSerializable(mapping.action) : undefined,
});

const cloneDpadMapping = (mapping: DpadMapping): DpadMapping => ({
  ...mapping,
  action: mapping.action ? cloneSerializable(mapping.action) : undefined,
});

const cloneComboMapping = (mapping: ComboMapping): ComboMapping => ({
  ...mapping,
  inputs: (mapping.inputs ?? []).map((input) => ({ ...input })),
  action: mapping.action ? cloneSerializable(mapping.action) : undefined,
});

const normalizeLayerMapping = (
  layer: GamepadLayerMapping
): GamepadLayerMapping => {
  const layerIndex = normalizeLayerIndex(layer.layerIndex);

  return {
    layerIndex,
    name: layer.name || getLayerName(layerIndex),
    buttonMappings: (layer.buttonMappings ?? []).map(cloneButtonMapping),
    axisMappings: (layer.axisMappings ?? []).map(cloneAxisMapping),
    dpadMappings: (layer.dpadMappings ?? []).map(cloneDpadMapping),
    comboMappings: (layer.comboMappings ?? []).map((comboMapping) => ({
      ...cloneComboMapping(comboMapping),
      termMs: normalizeComboTermMs(comboMapping.termMs),
    })),
  };
};

const syncBaseLayer = (mapping: GamepadMappingProfile) => {
  const baseLayer = mapping.layers?.find(
    (layer) => layer.layerIndex === BASE_LAYER_INDEX
  );

  if (!baseLayer) {
    return;
  }

  mapping.buttonMappings = baseLayer.buttonMappings;
  mapping.axisMappings = baseLayer.axisMappings;
  mapping.dpadMappings = baseLayer.dpadMappings;
  mapping.comboMappings = baseLayer.comboMappings;
};

const normalizeProfileMapping = (
  profile: GamepadMappingProfile,
  fallbackName: string
): GamepadMappingProfile => {
  const layerByIndex = new Map<number, GamepadLayerMapping>();

  profile.layers?.forEach((layer) => {
    const normalizedLayer = normalizeLayerMapping(layer);
    layerByIndex.set(normalizedLayer.layerIndex, normalizedLayer);
  });

  if (!layerByIndex.has(BASE_LAYER_INDEX)) {
    layerByIndex.set(
      BASE_LAYER_INDEX,
      createLayerMapping(
        BASE_LAYER_INDEX,
        (profile.buttonMappings ?? []).map(cloneButtonMapping),
        (profile.axisMappings ?? []).map(cloneAxisMapping),
        (profile.dpadMappings ?? []).map(cloneDpadMapping),
        (profile.comboMappings ?? []).map((comboMapping) => ({
          ...cloneComboMapping(comboMapping),
          termMs: normalizeComboTermMs(comboMapping.termMs),
        }))
      )
    );
  }

  const layers = Array.from(layerByIndex.values()).sort(
    (a, b) => a.layerIndex - b.layerIndex
  );
  const baseLayer = layers.find(
    (layer) => layer.layerIndex === BASE_LAYER_INDEX
  )!;

  return {
    ...profile,
    id: profile.id || DEFAULT_PROFILE_ID,
    name: profile.name || fallbackName,
    buttonMappings: baseLayer.buttonMappings,
    axisMappings: baseLayer.axisMappings,
    dpadMappings: baseLayer.dpadMappings,
    comboMappings: baseLayer.comboMappings,
    layers,
  };
};

export const normalizeGamepadMapping = (
  mapping: GamepadMapping
): GamepadMapping => {
  const seenProfileIds = new Set<string>();
  const sourceProfiles =
    mapping.profiles && mapping.profiles.length > 0
      ? mapping.profiles
      : [
          {
            id: DEFAULT_PROFILE_ID,
            name: DEFAULT_PROFILE_NAME,
            buttonMappings: mapping.buttonMappings ?? [],
            axisMappings: mapping.axisMappings ?? [],
            dpadMappings: mapping.dpadMappings ?? [],
            comboMappings: mapping.comboMappings ?? [],
            layers: mapping.layers,
          },
        ];
  const profiles = sourceProfiles.map((profile, index) => {
    const fallbackId =
      index === 0 ? DEFAULT_PROFILE_ID : `profile-${index + 1}`;
    let id = profile.id || fallbackId;
    let duplicateCounter = index + 1;

    while (seenProfileIds.has(id)) {
      duplicateCounter += 1;
      id = `profile-${duplicateCounter}`;
    }
    seenProfileIds.add(id);

    return normalizeProfileMapping(
      {
        ...profile,
        id,
      },
      index === 0 ? DEFAULT_PROFILE_NAME : `Profile ${index + 1}`
    );
  });
  const activeProfile =
    profiles.find((profile) => profile.id === mapping.activeProfileId) ??
    profiles[0];

  return {
    ...mapping,
    id: activeProfile.id,
    name: activeProfile.name,
    activeProfileId: activeProfile.id,
    profiles,
    buttonMappings: activeProfile.buttonMappings,
    axisMappings: activeProfile.axisMappings,
    dpadMappings: activeProfile.dpadMappings,
    comboMappings: activeProfile.comboMappings,
    layers: activeProfile.layers,
  };
};

const createGamepadMapping = (gamepadIndex: number): GamepadMapping =>
  normalizeGamepadMapping({
    gamepadIndex,
    id: DEFAULT_PROFILE_ID,
    name: DEFAULT_PROFILE_NAME,
    buttonMappings: [],
    axisMappings: [],
    dpadMappings: [],
  });

const getOrCreateLayerMapping = (
  mapping: GamepadMappingProfile,
  layerIndex: number
) => {
  const normalizedLayerIndex = normalizeLayerIndex(layerIndex);
  let layers = mapping.layers ?? [];
  let layer = layers.find(
    (candidate) => candidate.layerIndex === normalizedLayerIndex
  );

  if (!layer) {
    layer = createLayerMapping(normalizedLayerIndex);
    layers = [...layers, layer].sort((a, b) => a.layerIndex - b.layerIndex);
    mapping.layers = layers;
  }

  syncBaseLayer(mapping);
  return layer;
};

const getActiveProfile = (mapping: GamepadMapping) =>
  mapping.profiles?.find((profile) => profile.id === mapping.activeProfileId) ??
  mapping.profiles?.[0];

const syncActiveProfile = (mapping: GamepadMapping) => {
  const activeProfile = getActiveProfile(mapping);

  if (!activeProfile) {
    return;
  }

  syncBaseLayer(activeProfile);
  mapping.id = activeProfile.id;
  mapping.name = activeProfile.name;
  mapping.activeProfileId = activeProfile.id;
  mapping.buttonMappings = activeProfile.buttonMappings;
  mapping.axisMappings = activeProfile.axisMappings;
  mapping.dpadMappings = activeProfile.dpadMappings;
  mapping.comboMappings = activeProfile.comboMappings;
  mapping.layers = activeProfile.layers;
};

const getOrCreateActiveProfileLayer = (
  mapping: GamepadMapping,
  layerIndex: number
) => {
  const activeProfile = getActiveProfile(mapping);

  if (!activeProfile) {
    return null;
  }

  return getOrCreateLayerMapping(activeProfile, layerIndex);
};

const cloneProfileMapping = (
  profile: GamepadMappingProfile,
  id: string,
  name: string
): GamepadMappingProfile =>
  normalizeProfileMapping(
    {
      ...profile,
      id,
      name,
      layers: profile.layers?.map(normalizeLayerMapping),
    },
    name
  );

const createEmptyProfileMapping = (
  id: string,
  name: string
): GamepadMappingProfile =>
  normalizeProfileMapping(
    {
      id,
      name,
      buttonMappings: [],
      axisMappings: [],
      dpadMappings: [],
      comboMappings: [],
    },
    name
  );

const getNextProfileId = (profiles: GamepadMappingProfile[]) => {
  const existingIds = new Set(profiles.map((profile) => profile.id));
  let nextIndex = profiles.length + 1;

  while (existingIds.has(`profile-${nextIndex}`)) {
    nextIndex += 1;
  }

  return `profile-${nextIndex}`;
};

const getNextProfileName = (profiles: GamepadMappingProfile[]) => {
  const existingNames = new Set(profiles.map((profile) => profile.name));
  let nextIndex = profiles.length + 1;

  while (existingNames.has(`Profile ${nextIndex}`)) {
    nextIndex += 1;
  }

  return `Profile ${nextIndex}`;
};

const getDuplicateProfileName = (
  profiles: GamepadMappingProfile[],
  sourceName: string
) => {
  const existingNames = new Set(profiles.map((profile) => profile.name));
  const baseName = `${sourceName} Copy`;
  let name = baseName;
  let copyIndex = 2;

  while (existingNames.has(name)) {
    name = `${baseName} ${copyIndex}`;
    copyIndex += 1;
  }

  return name;
};

const getTopActiveLayerMapping = (
  mapping: GamepadMapping,
  activeLayerIndices: number[]
) => {
  const layersForRead =
    mapping.layers && mapping.layers.length > 0
      ? mapping.layers
      : [
          createLayerMapping(
            BASE_LAYER_INDEX,
            mapping.buttonMappings ?? [],
            mapping.axisMappings ?? [],
            mapping.dpadMappings ?? [],
            mapping.comboMappings ?? []
          ),
        ];
  const layersByIndex = new Map(
    layersForRead.map((layer) => [layer.layerIndex, layer])
  );
  const orderedIndices =
    activeLayerIndices.length > 0 ? activeLayerIndices : [BASE_LAYER_INDEX];
  const topLayerIndex = normalizeLayerIndex(
    orderedIndices[orderedIndices.length - 1]
  );

  return layersByIndex.get(topLayerIndex) ?? null;
};

const getEffectiveButtonMappings = (
  mapping: GamepadMapping,
  activeLayerIndices: number[]
) => {
  return (
    getTopActiveLayerMapping(mapping, activeLayerIndices)?.buttonMappings ?? []
  );
};

const getEffectiveDpadMappings = (
  mapping: GamepadMapping,
  activeLayerIndices: number[]
) => {
  return getTopActiveLayerMapping(mapping, activeLayerIndices)?.dpadMappings ?? [];
};

const getEffectiveAxisMappings = (
  mapping: GamepadMapping,
  activeLayerIndices: number[]
) => {
  return getTopActiveLayerMapping(mapping, activeLayerIndices)?.axisMappings ?? [];
};

const getEffectiveComboMappings = (
  mapping: GamepadMapping,
  activeLayerIndices: number[]
) => {
  return getTopActiveLayerMapping(mapping, activeLayerIndices)?.comboMappings ?? [];
};

const areSameMappingActions = (
  previousAction: MappingAction,
  nextAction: MappingAction
): boolean => {
  if (previousAction.type !== nextAction.type) {
    return false;
  }

  if (previousAction.type === "input" && nextAction.type === "input") {
    return previousAction.key === nextAction.key;
  }

  if (previousAction.type === "layer" && nextAction.type === "layer") {
    return (
      previousAction.mode === nextAction.mode &&
      previousAction.layer === nextAction.layer
    );
  }

  if (
    previousAction.type === "tap-hold" &&
    nextAction.type === "tap-hold"
  ) {
    return (
      previousAction.kind === nextAction.kind &&
      previousAction.tappingTermMs === nextAction.tappingTermMs &&
      areSameMappingActions(previousAction.tap, nextAction.tap) &&
      areSameMappingActions(previousAction.hold, nextAction.hold)
    );
  }

  return false;
};

const getPressedStateForStateKey = (
  gamepad: GamepadState,
  stateKey: string
) => {
  const prefix = `gamepad-${gamepad.index}-`;
  if (!stateKey.startsWith(prefix)) {
    return false;
  }

  const inputKey = stateKey.slice(prefix.length);

  if (inputKey.startsWith("button-")) {
    const buttonIndex = Number(inputKey.slice("button-".length));
    return gamepad.buttons[buttonIndex]?.pressed ?? false;
  }

  if (inputKey.startsWith("dpad-")) {
    const direction = inputKey.slice("dpad-".length) as StickDirection;
    return getDpadDirection(gamepad.buttons) === direction;
  }

  if (inputKey.startsWith("axis-")) {
    const axisKey = inputKey.slice("axis-".length);
    const separatorIndex = axisKey.indexOf("-");
    if (separatorIndex < 0) {
      return false;
    }

    const stickIndex = Number(axisKey.slice(0, separatorIndex));
    const direction = axisKey.slice(separatorIndex + 1) as StickDirection;
    const { axisXIndex, axisYIndex } = getStickAxes(stickIndex);

    return (
      getStickDirection(
        gamepad.axes[axisXIndex] || 0,
        gamepad.axes[axisYIndex] || 0,
        DEFAULT_STICK_THRESHOLD
      ) === direction
    );
  }

  return false;
};

interface EffectiveMappingsSnapshot {
  mapping: GamepadMapping;
  activeLayerKey: string;
  buttonMappings: ButtonMapping[];
  dpadMappings: DpadMapping[];
  comboMappings: ComboMapping[];
  mouseMappings: AxisMapping[];
  scrollMappings: AxisMapping[];
  hotkeyMappingsByStick: Array<[number, AxisMapping[]]>;
}

interface TapHoldState {
  action: TapHoldAction;
  startedAt: number;
  holdPressed: boolean;
}

export function useGamepadMapping(gamepads: GamepadState[]) {
  const [mappings, setMappings] = useState<GamepadMapping[]>([]);
  const [editingButton, setEditingButton] = useState<{
    gamepadIndex: number;
    buttonIndex: number;
  } | null>(null);
  const [editingAxis, setEditingAxis] = useState<{
    gamepadIndex: number;
    stickIndex: number;
    direction: StickDirection;
  } | null>(null);
  const [editingDpad, setEditingDpad] = useState<{
    gamepadIndex: number;
    direction: StickDirection;
  } | null>(null);

  // Load mappings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const savedMappings = JSON.parse(saved) as GamepadMapping[];
        setMappings(savedMappings.map(normalizeGamepadMapping));
      } catch (e) {
        console.error("Failed to load mappings:", e);
      }
    }
  }, []);

  const connectedGamepadIndicesKey = gamepads
    .map((gamepad) => gamepad.index)
    .sort((a, b) => a - b)
    .join(",");

  // Initialize mappings for newly connected gamepads only.
  useEffect(() => {
    const connectedGamepadIndices = connectedGamepadIndicesKey
      ? connectedGamepadIndicesKey.split(",").map(Number)
      : [];

    if (connectedGamepadIndices.length === 0) {
      return;
    }

    setMappings((prev) => {
      let updated = prev;
      let changed = false;

      connectedGamepadIndices.forEach((gamepadIndex) => {
        const existing = updated.find((m) => m.gamepadIndex === gamepadIndex);
        if (!existing) {
          if (!changed) {
            updated = [...prev];
            changed = true;
          }
          updated.push(createGamepadMapping(gamepadIndex));
        }
      });

      return changed ? updated : prev;
    });
  }, [connectedGamepadIndicesKey]);

  // Save mappings to localStorage
  useEffect(() => {
    if (mappings.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
    }
  }, [mappings]);

  const getMapping = useCallback(
    (gamepadIndex: number): GamepadMapping | undefined => {
      return mappings.find((m) => m.gamepadIndex === gamepadIndex);
    },
    [mappings]
  );

  const getProfiles = useCallback(
    (gamepadIndex: number): GamepadMappingProfile[] => {
      const mapping = getMapping(gamepadIndex);
      return (
        mapping?.profiles ?? [
          createEmptyProfileMapping(DEFAULT_PROFILE_ID, DEFAULT_PROFILE_NAME),
        ]
      );
    },
    [getMapping]
  );

  const getActiveProfileId = useCallback(
    (gamepadIndex: number) => {
      return getMapping(gamepadIndex)?.activeProfileId ?? DEFAULT_PROFILE_ID;
    },
    [getMapping]
  );

  const setActiveProfile = useCallback(
    (gamepadIndex: number, profileId: string) => {
      resetRuntimeStateForGamepad(gamepadIndex);
      setMappings((prev) => {
        const updated = [...prev];
        const mappingIndex = updated.findIndex(
          (m) => m.gamepadIndex === gamepadIndex
        );
        const mapping =
          mappingIndex >= 0
            ? normalizeGamepadMapping(updated[mappingIndex])
            : createGamepadMapping(gamepadIndex);

        if (!mapping.profiles?.some((profile) => profile.id === profileId)) {
          return prev;
        }

        mapping.activeProfileId = profileId;
        syncActiveProfile(mapping);

        if (mappingIndex >= 0) {
          updated[mappingIndex] = mapping;
        } else {
          updated.push(mapping);
        }

        return updated;
      });
    },
    []
  );

  const addProfile = useCallback(
    (gamepadIndex: number) => {
      const mapping = getMapping(gamepadIndex);
      const profiles =
        mapping?.profiles ??
        createGamepadMapping(gamepadIndex).profiles ??
        [];
      const profileId = getNextProfileId(profiles);
      const profileName = getNextProfileName(profiles);

      resetRuntimeStateForGamepad(gamepadIndex);
      setMappings((prev) => {
        const updated = [...prev];
        const mappingIndex = updated.findIndex(
          (m) => m.gamepadIndex === gamepadIndex
        );
        const mapping =
          mappingIndex >= 0
            ? normalizeGamepadMapping(updated[mappingIndex])
            : createGamepadMapping(gamepadIndex);
        const nextProfile = createEmptyProfileMapping(profileId, profileName);

        mapping.profiles = [...(mapping.profiles ?? []), nextProfile];
        mapping.activeProfileId = nextProfile.id;
        syncActiveProfile(mapping);

        if (mappingIndex >= 0) {
          updated[mappingIndex] = mapping;
        } else {
          updated.push(mapping);
        }

        return updated;
      });

      return profileId;
    },
    [getMapping]
  );

  const duplicateProfile = useCallback(
    (gamepadIndex: number) => {
      const mapping = getMapping(gamepadIndex);
      const normalizedMapping = mapping
        ? normalizeGamepadMapping(mapping)
        : createGamepadMapping(gamepadIndex);
      const profiles = normalizedMapping.profiles ?? [];
      const sourceProfile = getActiveProfile(normalizedMapping);

      if (!sourceProfile) {
        return DEFAULT_PROFILE_ID;
      }

      const profileId = getNextProfileId(profiles);
      const profileName = getDuplicateProfileName(
        profiles,
        sourceProfile.name
      );

      resetRuntimeStateForGamepad(gamepadIndex);
      setMappings((prev) => {
        const updated = [...prev];
        const mappingIndex = updated.findIndex(
          (m) => m.gamepadIndex === gamepadIndex
        );
        const mapping =
          mappingIndex >= 0
            ? normalizeGamepadMapping(updated[mappingIndex])
            : createGamepadMapping(gamepadIndex);
        const activeProfile = getActiveProfile(mapping);

        if (!activeProfile) {
          return prev;
        }

        const nextProfile = cloneProfileMapping(
          activeProfile,
          profileId,
          profileName
        );

        mapping.profiles = [...(mapping.profiles ?? []), nextProfile];
        mapping.activeProfileId = nextProfile.id;
        syncActiveProfile(mapping);

        if (mappingIndex >= 0) {
          updated[mappingIndex] = mapping;
        } else {
          updated.push(mapping);
        }

        return updated;
      });

      return profileId;
    },
    [getMapping]
  );

  const renameProfile = useCallback(
    (gamepadIndex: number, profileId: string, name: string) => {
      const nextName = name.trim() || "Untitled";

      setMappings((prev) => {
        const updated = [...prev];
        const mappingIndex = updated.findIndex(
          (m) => m.gamepadIndex === gamepadIndex
        );

        if (mappingIndex < 0) {
          return prev;
        }

        const mapping = normalizeGamepadMapping(updated[mappingIndex]);
        const profile = mapping.profiles?.find(
          (candidate) => candidate.id === profileId
        );

        if (!profile) {
          return prev;
        }

        profile.name = nextName;
        syncActiveProfile(mapping);
        updated[mappingIndex] = mapping;
        return updated;
      });
    },
    []
  );

  const removeProfile = useCallback((gamepadIndex: number, profileId: string) => {
    resetRuntimeStateForGamepad(gamepadIndex);
    setMappings((prev) => {
      const updated = [...prev];
      const mappingIndex = updated.findIndex(
        (m) => m.gamepadIndex === gamepadIndex
      );

      if (mappingIndex < 0) {
        return prev;
      }

      const mapping = normalizeGamepadMapping(updated[mappingIndex]);
      const profiles = mapping.profiles ?? [];

      if (profiles.length <= 1) {
        return prev;
      }

      const removedProfileIndex = profiles.findIndex(
        (profile) => profile.id === profileId
      );

      if (removedProfileIndex < 0) {
        return prev;
      }

      const nextProfiles = profiles.filter((profile) => profile.id !== profileId);
      const fallbackProfile =
        nextProfiles[Math.max(removedProfileIndex - 1, 0)] ?? nextProfiles[0];

      mapping.profiles = nextProfiles;
      if (mapping.activeProfileId === profileId) {
        mapping.activeProfileId = fallbackProfile.id;
      }
      syncActiveProfile(mapping);
      updated[mappingIndex] = mapping;
      return updated;
    });
  }, []);

  const getLayers = useCallback(
    (gamepadIndex: number): GamepadLayerMapping[] => {
      const mapping = getMapping(gamepadIndex);
      return mapping?.layers ?? [createLayerMapping(0)];
    },
    [getMapping]
  );

  const getLayerView = useCallback(
    (gamepadIndex: number, layerIndex: number): GamepadMapping | undefined => {
      const mapping = getMapping(gamepadIndex);
      if (!mapping) {
        return undefined;
      }

      const selectedLayer =
        mapping.layers?.find(
          (layer) => layer.layerIndex === normalizeLayerIndex(layerIndex)
        ) ??
        mapping.layers?.find(
          (layer) => layer.layerIndex === BASE_LAYER_INDEX
        );

      if (!selectedLayer) {
        return mapping;
      }

      return {
        ...mapping,
        buttonMappings: selectedLayer.buttonMappings,
        axisMappings: selectedLayer.axisMappings,
        dpadMappings: selectedLayer.dpadMappings,
        comboMappings: selectedLayer.comboMappings,
      };
    },
    [getMapping]
  );

  const ensureLayer = useCallback((gamepadIndex: number, layerIndex: number) => {
    setMappings((prev) => {
      const updated = [...prev];
      const mappingIndex = updated.findIndex(
        (m) => m.gamepadIndex === gamepadIndex
      );
      let mapping =
        mappingIndex >= 0
          ? normalizeGamepadMapping(updated[mappingIndex])
          : createGamepadMapping(gamepadIndex);

      getOrCreateActiveProfileLayer(mapping, layerIndex);
      syncActiveProfile(mapping);

      if (mappingIndex >= 0) {
        updated[mappingIndex] = mapping;
      } else {
        updated.push(mapping);
      }

      return updated;
    });
  }, []);

  const setButtonMapping = useCallback(
    (
      gamepadIndex: number,
      buttonIndex: number,
      key: string,
      label: string,
      action: MappingAction = createInputAction(key, label),
      layerIndex: number = BASE_LAYER_INDEX
    ) => {
      setMappings((prev) => {
        const updated = [...prev];
        const mappingIndex = updated.findIndex(
          (m) => m.gamepadIndex === gamepadIndex
        );
        let mapping =
          mappingIndex >= 0
            ? normalizeGamepadMapping(updated[mappingIndex])
            : createGamepadMapping(gamepadIndex);

        if (mappingIndex < 0) {
          updated.push(mapping);
        } else {
          updated[mappingIndex] = mapping;
        }

        const layer = getOrCreateActiveProfileLayer(mapping, layerIndex);
        if (!layer) {
          return updated;
        }
        const existingButtonMapping = layer.buttonMappings.find(
          (m) => m.buttonIndex === buttonIndex
        );
        if (existingButtonMapping) {
          existingButtonMapping.key = key;
          existingButtonMapping.label = label;
          existingButtonMapping.action = action;
        } else {
          layer.buttonMappings.push({ buttonIndex, key, label, action });
        }
        syncActiveProfile(mapping);

        return updated;
      });
      setEditingButton(null);
    },
    []
  );

  const setAxisMapping = useCallback(
    (
      gamepadIndex: number,
      stickIndex: number,
      direction: StickDirection,
      key: string,
      label: string,
      threshold: number = DEFAULT_STICK_THRESHOLD,
      type: StickMappingType = DEFAULT_STICK_MAPPING_TYPE,
      sensitivity: number = DEFAULT_MOUSE_SENSITIVITY,
      acceleration: number = DEFAULT_MOUSE_ACCELERATION,
      invertX: boolean = DEFAULT_MOUSE_INVERT_X,
      invertY: boolean = DEFAULT_MOUSE_INVERT_Y,
      action: MappingAction = createInputAction(key, label),
      layerIndex: number = BASE_LAYER_INDEX,
      directionGapDegrees: number = DEFAULT_STICK_DIRECTION_GAP_DEGREES
    ) => {
      setMappings((prev) => {
        const updated = [...prev];
        const mappingIndex = updated.findIndex(
          (m) => m.gamepadIndex === gamepadIndex
        );
        let mapping =
          mappingIndex >= 0
            ? normalizeGamepadMapping(updated[mappingIndex])
            : createGamepadMapping(gamepadIndex);

        if (mappingIndex < 0) {
          updated.push(mapping);
        } else {
          updated[mappingIndex] = mapping;
        }

        const layer = getOrCreateActiveProfileLayer(mapping, layerIndex);
        if (!layer) {
          return updated;
        }

        if (type === "mouse" || type === "scroll") {
          // For continuous modes, there's only one mapping per stick (direction doesn't matter)
          const existingContinuousMapping = layer.axisMappings.find(
            (m) => m.stickIndex === stickIndex && m.type === type
          );
          if (existingContinuousMapping) {
            existingContinuousMapping.key = key;
            existingContinuousMapping.label = label;
            existingContinuousMapping.action = action;
            existingContinuousMapping.threshold = threshold;
            existingContinuousMapping.directionGapDegrees = undefined;
            existingContinuousMapping.sensitivity = sensitivity;
            existingContinuousMapping.acceleration = acceleration;
            existingContinuousMapping.invertX = invertX;
            existingContinuousMapping.invertY = invertY;
          } else {
            // Remove all other mappings for this stick when adding a continuous mapping
            layer.axisMappings = layer.axisMappings.filter(
              (m) => m.stickIndex !== stickIndex
            );
            layer.axisMappings.push({
              stickIndex,
              direction: "up",
              key: type === "mouse" ? "Mouse" : "Scroll",
              label: type === "mouse" ? "Mouse" : "Scroll",
              action,
              threshold,
              directionGapDegrees: undefined,
              type,
              sensitivity,
              acceleration,
              invertX,
              invertY,
            });
          }
        } else {
          // Hotkey mode - individual direction mappings
          const existingAxisMapping = layer.axisMappings.find(
            (m) =>
              m.stickIndex === stickIndex &&
              m.direction === direction &&
              m.type === "hotkey"
          );
          if (existingAxisMapping) {
            existingAxisMapping.key = key;
            existingAxisMapping.label = label;
            existingAxisMapping.action = action;
            existingAxisMapping.threshold = threshold;
            existingAxisMapping.directionGapDegrees = directionGapDegrees;
          } else {
            // Remove continuous mapping if exists when adding hotkey mapping
            layer.axisMappings = layer.axisMappings.filter(
              (m) => !(m.stickIndex === stickIndex && m.type !== "hotkey")
            );
            layer.axisMappings.push({
              stickIndex,
              direction,
              key,
              label,
              action,
              threshold,
              directionGapDegrees,
              type: "hotkey",
            });
          }
        }
        syncActiveProfile(mapping);

        return updated;
      });
      setEditingAxis(null);
    },
    []
  );

  const removeButtonMapping = useCallback(
    (
      gamepadIndex: number,
      buttonIndex: number,
      layerIndex: number = BASE_LAYER_INDEX
    ) => {
      setMappings((prev) => {
        const updated = [...prev];
        const mappingIndex = updated.findIndex(
          (m) => m.gamepadIndex === gamepadIndex
        );
        const mapping =
          mappingIndex >= 0
            ? normalizeGamepadMapping(updated[mappingIndex])
            : undefined;
        if (mapping) {
          const layer = getOrCreateActiveProfileLayer(mapping, layerIndex);
          if (!layer) {
            return updated;
          }
          layer.buttonMappings = layer.buttonMappings.filter(
            (m) => m.buttonIndex !== buttonIndex
          );
          syncActiveProfile(mapping);
          updated[mappingIndex] = mapping;
        }
        return updated;
      });
    },
    []
  );

  const removeAxisMapping = useCallback(
    (
      gamepadIndex: number,
      stickIndex: number,
      direction: StickDirection,
      layerIndex: number = BASE_LAYER_INDEX
    ) => {
      setMappings((prev) => {
        const updated = [...prev];
        const mappingIndex = updated.findIndex(
          (m) => m.gamepadIndex === gamepadIndex
        );
        const mapping =
          mappingIndex >= 0
            ? normalizeGamepadMapping(updated[mappingIndex])
            : undefined;
        if (mapping) {
          const layer = getOrCreateActiveProfileLayer(mapping, layerIndex);
          if (!layer) {
            return updated;
          }
          layer.axisMappings = layer.axisMappings.filter(
            (m) => !(m.stickIndex === stickIndex && m.direction === direction)
          );
          syncActiveProfile(mapping);
          updated[mappingIndex] = mapping;
        }
        return updated;
      });
    },
    []
  );

  const setDpadMapping = useCallback(
    (
      gamepadIndex: number,
      direction: StickDirection,
      key: string,
      label: string,
      action: MappingAction = createInputAction(key, label),
      layerIndex: number = BASE_LAYER_INDEX
    ) => {
      setMappings((prev) => {
        const updated = [...prev];
        const mappingIndex = updated.findIndex(
          (m) => m.gamepadIndex === gamepadIndex
        );
        let mapping =
          mappingIndex >= 0
            ? normalizeGamepadMapping(updated[mappingIndex])
            : createGamepadMapping(gamepadIndex);

        if (mappingIndex < 0) {
          updated.push(mapping);
        } else {
          updated[mappingIndex] = mapping;
        }

        const layer = getOrCreateActiveProfileLayer(mapping, layerIndex);
        if (!layer) {
          return updated;
        }
        const existingDpadMapping = layer.dpadMappings.find(
          (m) => m.direction === direction
        );
        if (existingDpadMapping) {
          existingDpadMapping.key = key;
          existingDpadMapping.label = label;
          existingDpadMapping.action = action;
        } else {
          layer.dpadMappings.push({ direction, key, label, action });
        }
        syncActiveProfile(mapping);

        return updated;
      });
      setEditingDpad(null);
    },
    []
  );

  const removeDpadMapping = useCallback(
    (
      gamepadIndex: number,
      direction: StickDirection,
      layerIndex: number = BASE_LAYER_INDEX
    ) => {
      setMappings((prev) => {
        const updated = [...prev];
        const mappingIndex = updated.findIndex(
          (m) => m.gamepadIndex === gamepadIndex
        );
        const mapping =
          mappingIndex >= 0
            ? normalizeGamepadMapping(updated[mappingIndex])
            : undefined;
        if (mapping) {
          const layer = getOrCreateActiveProfileLayer(mapping, layerIndex);
          if (!layer) {
            return updated;
          }
          layer.dpadMappings = layer.dpadMappings.filter(
            (m) => m.direction !== direction
          );
          syncActiveProfile(mapping);
          updated[mappingIndex] = mapping;
        }
        return updated;
      });
    },
    []
  );

  const setComboMapping = useCallback(
    (
      gamepadIndex: number,
      comboMapping: ComboMapping,
      layerIndex: number = BASE_LAYER_INDEX
    ) => {
      setMappings((prev) => {
        const updated = [...prev];
        const mappingIndex = updated.findIndex(
          (m) => m.gamepadIndex === gamepadIndex
        );
        let mapping =
          mappingIndex >= 0
            ? normalizeGamepadMapping(updated[mappingIndex])
            : createGamepadMapping(gamepadIndex);

        if (mappingIndex < 0) {
          updated.push(mapping);
        } else {
          updated[mappingIndex] = mapping;
        }

        const layer = getOrCreateActiveProfileLayer(mapping, layerIndex);
        if (!layer) {
          return updated;
        }
        const normalizedComboMapping = {
          ...comboMapping,
          inputs: comboMapping.inputs,
          termMs: normalizeComboTermMs(comboMapping.termMs),
        };
        const existingComboIndex = layer.comboMappings.findIndex(
          (candidate) => candidate.id === comboMapping.id
        );

        if (existingComboIndex >= 0) {
          layer.comboMappings[existingComboIndex] = normalizedComboMapping;
        } else {
          layer.comboMappings.push(normalizedComboMapping);
        }
        syncActiveProfile(mapping);

        return updated;
      });
    },
    []
  );

  const removeComboMapping = useCallback(
    (
      gamepadIndex: number,
      comboId: string,
      layerIndex: number = BASE_LAYER_INDEX
    ) => {
      setMappings((prev) => {
        const updated = [...prev];
        const mappingIndex = updated.findIndex(
          (m) => m.gamepadIndex === gamepadIndex
        );
        const mapping =
          mappingIndex >= 0
            ? normalizeGamepadMapping(updated[mappingIndex])
            : undefined;

        if (mapping) {
          const layer = getOrCreateActiveProfileLayer(mapping, layerIndex);
          if (!layer) {
            return updated;
          }
          layer.comboMappings = layer.comboMappings.filter(
            (comboMapping) => comboMapping.id !== comboId
          );
          syncActiveProfile(mapping);
          updated[mappingIndex] = mapping;
        }

        return updated;
      });
    },
    []
  );

  // Helper function to get fallback cardinal directions for diagonal directions
  const getFallbackDirections = useCallback(
    (direction: StickDirection): StickDirection[] => {
      switch (direction) {
        case "up-left":
          return ["up", "left"];
        case "up-right":
          return ["up", "right"];
        case "down-left":
          return ["down", "left"];
        case "down-right":
          return ["down", "right"];
        default:
          return [];
      }
    },
    []
  );

  // Track which stateKeys are holding each key (allows multiple buttons to hold same key)
  const keyHoldersRef = useRef<Map<string, Set<string>>>(new Map());
  // Track previous button states to only trigger on state changes
  const previousButtonStatesRef = useRef<Map<string, boolean>>(new Map());
  // Track previous axis states to only trigger on state changes
  const previousAxisStatesRef = useRef<Map<string, boolean>>(new Map());
  // Track pending mouse movements to prevent queuing (which causes drift)
  const pendingMouseMovementsRef = useRef<Set<string>>(new Set());
  const scrollRemainderRef = useRef<Map<string, { x: number; y: number }>>(
    new Map()
  );
  const lastScrollUpdateTimeRef = useRef<Map<string, number>>(new Map());
  // Track when each stick started moving for time-based acceleration
  const stickMovementStartTimeRef = useRef<Map<string, number>>(new Map());
  const gamepadsRef = useRef<GamepadState[]>([]);
  const previousInternalActionStatesRef = useRef<Map<string, boolean>>(new Map());
  const momentaryLayerHoldersRef = useRef<
    Map<number, Map<number, Set<string>>>
  >(new Map());
  const toggledLayersRef = useRef<Map<number, Set<number>>>(new Map());
  const defaultLayerRef = useRef<Map<number, number>>(new Map());
  const activeLayersRef = useRef<Map<number, number[]>>(new Map());
  const activeActionsRef = useRef<Map<string, MappingAction>>(new Map());
  const tapHoldStatesRef = useRef<Map<string, TapHoldState>>(new Map());
  const comboInputPressedAtRef = useRef<Map<string, number>>(new Map());
  const activeComboStateKeysRef = useRef<Set<string>>(new Set());
  const activeComboInputsRef = useRef<Map<string, ComboInput[]>>(new Map());
  const effectiveMappingsCacheRef = useRef<
    Map<number, EffectiveMappingsSnapshot>
  >(new Map());

  function resetRuntimeStateForGamepad(gamepadIndex: number) {
    const stateKeyPrefix = `gamepad-${gamepadIndex}-`;
    const clearStateKeyedMap = <T,>(map: Map<string, T>) => {
      Array.from(map.keys()).forEach((key) => {
        if (key.startsWith(stateKeyPrefix)) {
          map.delete(key);
        }
      });
    };
    const clearStateKeyedSet = (set: Set<string>) => {
      Array.from(set).forEach((key) => {
        if (key.startsWith(stateKeyPrefix)) {
          set.delete(key);
        }
      });
    };

    clearStateKeyedMap(previousButtonStatesRef.current);
    clearStateKeyedMap(previousAxisStatesRef.current);
    clearStateKeyedSet(pendingMouseMovementsRef.current);
    clearStateKeyedMap(scrollRemainderRef.current);
    clearStateKeyedMap(lastScrollUpdateTimeRef.current);
    clearStateKeyedMap(stickMovementStartTimeRef.current);
    clearStateKeyedMap(previousInternalActionStatesRef.current);
    clearStateKeyedMap(tapHoldStatesRef.current);
    clearStateKeyedMap(comboInputPressedAtRef.current);
    clearStateKeyedMap(activeComboInputsRef.current);

    clearStateKeyedSet(activeComboStateKeysRef.current);

    momentaryLayerHoldersRef.current.delete(gamepadIndex);
    toggledLayersRef.current.delete(gamepadIndex);
    defaultLayerRef.current.delete(gamepadIndex);
    activeLayersRef.current.delete(gamepadIndex);
    effectiveMappingsCacheRef.current.delete(gamepadIndex);
  }

  const isMouseWheelKey = (key: string) => key.startsWith("MouseWheel");

  const getMouseWheelDelta = (key: string, amount: number = 1) => {
    switch (key) {
      case "MouseWheelUp":
        return { deltaX: 0, deltaY: -amount };
      case "MouseWheelDown":
        return { deltaX: 0, deltaY: amount };
      case "MouseWheelLeft":
        return { deltaX: -amount, deltaY: 0 };
      case "MouseWheelRight":
        return { deltaX: amount, deltaY: 0 };
      default:
        return null;
    }
  };

  const sendMouseScroll = useCallback(
    (deltaX: number, deltaY: number) => {
      if (!window.mouseSimulator) {
        return;
      }

      const stepsX = Math.trunc(deltaX);
      const stepsY = Math.trunc(deltaY);
      if (stepsX === 0 && stepsY === 0) {
        return;
      }

      void window.mouseSimulator.scrollMouse(stepsX, stepsY).catch((err) => {
        console.error("Error scrolling mouse:", err);
      });
    },
    []
  );

  const triggerMappedWheelScroll = useCallback(
    (key: string, stateKey: string, amount: number = 1) => {
      const delta = getMouseWheelDelta(key, amount);
      if (!delta) {
        return;
      }
      sendMouseScroll(delta.deltaX, delta.deltaY);
    },
    [sendMouseScroll]
  );

  const getActiveLayerIndices = useCallback((gamepadIndex: number) => {
    return (
      activeLayersRef.current.get(gamepadIndex) ?? [
        defaultLayerRef.current.get(gamepadIndex) ?? BASE_LAYER_INDEX,
      ]
    );
  }, []);

  const getEffectiveMappingsSnapshot = useCallback(
    (
      gamepadIndex: number,
      mapping: GamepadMapping,
      activeLayerIndices: number[]
    ): EffectiveMappingsSnapshot => {
      const activeLayerKey = activeLayerIndices.join("|");
      const cached = effectiveMappingsCacheRef.current.get(gamepadIndex);
      if (
        cached &&
        cached.mapping === mapping &&
        cached.activeLayerKey === activeLayerKey
      ) {
        return cached;
      }

      const axisMappings = getEffectiveAxisMappings(mapping, activeLayerIndices);
      const mouseMappingsByStick = new Map<number, AxisMapping>();
      const scrollMappingsByStick = new Map<number, AxisMapping>();

      axisMappings.forEach((axisMapping) => {
        if (axisMapping.type === "mouse") {
          if (!mouseMappingsByStick.has(axisMapping.stickIndex)) {
            mouseMappingsByStick.set(axisMapping.stickIndex, axisMapping);
          }
        } else if (axisMapping.type === "scroll") {
          if (!scrollMappingsByStick.has(axisMapping.stickIndex)) {
            scrollMappingsByStick.set(axisMapping.stickIndex, axisMapping);
          }
        }
      });

      const sticksWithContinuous = new Set([
        ...Array.from(mouseMappingsByStick.keys()),
        ...Array.from(scrollMappingsByStick.keys()),
      ]);
      const hotkeyMappingsByStick = axisMappings.reduce(
        (acc, axisMapping) => {
          if (
            axisMapping.type === "hotkey" &&
            !sticksWithContinuous.has(axisMapping.stickIndex)
          ) {
            acc.set(
              axisMapping.stickIndex,
              (acc.get(axisMapping.stickIndex) ?? []).concat(axisMapping)
            );
          }
          return acc;
        },
        new Map<number, AxisMapping[]>()
      );

      const snapshot = {
        mapping,
        activeLayerKey,
        buttonMappings: getEffectiveButtonMappings(mapping, activeLayerIndices),
        dpadMappings: getEffectiveDpadMappings(mapping, activeLayerIndices),
        comboMappings: getEffectiveComboMappings(mapping, activeLayerIndices),
        mouseMappings: Array.from(mouseMappingsByStick.values()),
        scrollMappings: Array.from(scrollMappingsByStick.values()),
        hotkeyMappingsByStick: Array.from(hotkeyMappingsByStick.entries()),
      };

      effectiveMappingsCacheRef.current.set(gamepadIndex, snapshot);
      return snapshot;
    },
    []
  );

  const refreshActiveLayers = useCallback((gamepadIndex: number) => {
    const momentaryLayerHolders =
      momentaryLayerHoldersRef.current.get(gamepadIndex) ?? new Map();
    const momentaryLayers = Array.from(momentaryLayerHolders.entries())
      .filter(([, holders]) => holders.size > 0)
      .map(([layer]) => layer);
    const defaultLayer =
      defaultLayerRef.current.get(gamepadIndex) ?? BASE_LAYER_INDEX;
    const toggledLayers = toggledLayersRef.current.get(gamepadIndex) ?? new Set();

    activeLayersRef.current.set(
      gamepadIndex,
      Array.from(new Set([
        defaultLayer,
        ...Array.from(toggledLayers),
        ...momentaryLayers,
      ]))
    );
  }, []);

  const handleLayerAction = useCallback(
    (
      action: LayerAction,
      pressed: boolean,
      stateKey: string,
      gamepadIndex: number
    ) => {
      const previousState = previousInternalActionStatesRef.current.get(stateKey);
      if (previousState === pressed) {
        return;
      }
      previousInternalActionStatesRef.current.set(stateKey, pressed);

      if (action.mode === "momentary") {
        if (!momentaryLayerHoldersRef.current.has(gamepadIndex)) {
          momentaryLayerHoldersRef.current.set(gamepadIndex, new Map());
        }

        const momentaryLayerHolders =
          momentaryLayerHoldersRef.current.get(gamepadIndex)!;
        if (!momentaryLayerHolders.has(action.layer)) {
          momentaryLayerHolders.set(action.layer, new Set());
        }

        const holders = momentaryLayerHolders.get(action.layer)!;
        if (pressed) {
          holders.add(stateKey);
        } else {
          holders.delete(stateKey);
        }
        refreshActiveLayers(gamepadIndex);
        return;
      }

      if (!pressed) {
        return;
      }

      if (action.mode === "toggle") {
        if (!toggledLayersRef.current.has(gamepadIndex)) {
          toggledLayersRef.current.set(gamepadIndex, new Set());
        }

        const toggledLayers = toggledLayersRef.current.get(gamepadIndex)!;
        if (toggledLayers.has(action.layer)) {
          toggledLayers.delete(action.layer);
        } else {
          toggledLayers.add(action.layer);
        }
      } else if (action.mode === "switch") {
        toggledLayersRef.current.set(gamepadIndex, new Set());
        momentaryLayerHoldersRef.current.set(gamepadIndex, new Map());
        defaultLayerRef.current.set(gamepadIndex, action.layer);
      } else if (action.mode === "default") {
        defaultLayerRef.current.set(gamepadIndex, action.layer);
      }

      refreshActiveLayers(gamepadIndex);
    },
    [refreshActiveLayers]
  );

  // Simulate keyboard key press or mouse button via Electron IPC
  const simulateKeyPress = useCallback(
    async (key: string, pressed: boolean, stateKey: string) => {
      // Check if state actually changed
      const previousState =
        previousButtonStatesRef.current.get(stateKey) ??
        previousAxisStatesRef.current.get(stateKey);
      if (previousState === pressed) {
        // State hasn't changed, don't do anything
        return;
      }

      // Update previous state
      if (stateKey.includes("-button-") || stateKey.includes("-dpad-")) {
        previousButtonStatesRef.current.set(stateKey, pressed);
      } else {
        previousAxisStatesRef.current.set(stateKey, pressed);
      }

      // Get or create the set of stateKeys holding this key/button
      if (!keyHoldersRef.current.has(key)) {
        keyHoldersRef.current.set(key, new Set());
      }
      const holders = keyHoldersRef.current.get(key)!;

      const wasPressed = holders.size > 0;

      if (pressed) {
        // Add this stateKey to the holders set
        holders.add(stateKey);

        // Only press the key/button if it wasn't already pressed by another button
        if (!wasPressed) {
          try {
            let result;
            if (isMouseWheelKey(key)) {
              triggerMappedWheelScroll(key, stateKey);
              result = { success: true };
            } else if (key.startsWith("Mouse")) {
              // Check if it's a mouse button
              if (!window.mouseSimulator) {
                console.warn("Mouse simulator not available");
                return;
              }
              result = await window.mouseSimulator.buttonToggle(key, true);
            } else {
              if (!window.keySimulator) {
                console.warn("Key simulator not available");
                return;
              }
              result = await window.keySimulator.keyToggle(key, true);
            }

            if (result && !result.success && result.error) {
              console.error("Input simulation error:", result.error);
              // If it's a permissions error, log it prominently
              if (result.error.includes("Accessibility permissions")) {
                console.error(
                  "⚠️ Accessibility permissions required! Please grant permissions in System Preferences > Security & Privacy > Privacy > Accessibility"
                );
              }
            }
          } catch (error) {
            console.error("Error pressing key/button:", error);
          }
        }
      } else {
        // Remove this stateKey from the holders set
        holders.delete(stateKey);

        // Only release the key/button if no other buttons are holding it
        if (wasPressed && holders.size === 0) {
          try {
            let result;
            if (isMouseWheelKey(key)) {
              result = { success: true };
            } else if (key.startsWith("Mouse")) {
              // Check if it's a mouse button
              if (!window.mouseSimulator) {
                console.warn("Mouse simulator not available");
                return;
              }
              result = await window.mouseSimulator.buttonToggle(key, false);
            } else {
              if (!window.keySimulator) {
                console.warn("Key simulator not available");
                return;
              }
              result = await window.keySimulator.keyToggle(key, false);
            }

            if (result && !result.success && result.error) {
              console.error("Input simulation error:", result.error);
              if (result.error.includes("Accessibility permissions")) {
                console.error(
                  "⚠️ Accessibility permissions required! Please grant permissions in System Preferences > Security & Privacy > Privacy > Accessibility"
                );
              }
            }
          } catch (error) {
            console.error("Error releasing key/button:", error);
          }
        }
      }
    },
    [triggerMappedWheelScroll]
  );

  const pressMappedAction = useCallback(
    (action: MappingAction, stateKey: string, gamepadIndex: number) => {
      if (action.type === "layer") {
        handleLayerAction(action, true, stateKey, gamepadIndex);
        return;
      }

      if (action.type === "tap-hold") {
        return;
      }

      if (isMouseWheelKey(action.key)) {
        triggerMappedWheelScroll(action.key, stateKey);
        return;
      }

      simulateKeyPress(action.key, true, stateKey);
    },
    [handleLayerAction, simulateKeyPress, triggerMappedWheelScroll]
  );

  const releaseMappedAction = useCallback(
    (action: MappingAction, stateKey: string, gamepadIndex: number) => {
      if (action.type === "layer") {
        handleLayerAction(action, false, stateKey, gamepadIndex);
        return;
      }

      if (action.type === "tap-hold") {
        return;
      }

      if (isMouseWheelKey(action.key)) {
        return;
      }

      simulateKeyPress(action.key, false, stateKey);
    },
    [handleLayerAction, simulateKeyPress]
  );

  const tapRecordedInputAction = useCallback(
    (action: RecordedInputAction, stateKey: string) => {
      if (isMouseWheelKey(action.key)) {
        triggerMappedWheelScroll(action.key, stateKey);
        return;
      }

      void (async () => {
        await simulateKeyPress(action.key, true, stateKey);
        await simulateKeyPress(action.key, false, stateKey);
      })();
    },
    [simulateKeyPress, triggerMappedWheelScroll]
  );

  const pressTapHoldHoldAction = useCallback(
    (
      stateKey: string,
      tapHoldState: TapHoldState,
      gamepadIndex: number
    ) => {
      if (tapHoldState.holdPressed) {
        return;
      }

      const activeAction = activeActionsRef.current.get(stateKey);
      if (
        activeAction &&
        !areSameMappingActions(activeAction, tapHoldState.action.hold)
      ) {
        releaseMappedAction(activeAction, stateKey, gamepadIndex);
      }

      tapHoldState.holdPressed = true;
      activeActionsRef.current.set(stateKey, tapHoldState.action.hold);
      pressMappedAction(tapHoldState.action.hold, stateKey, gamepadIndex);
    },
    [pressMappedAction, releaseMappedAction]
  );

  const finishTapHoldState = useCallback(
    (stateKey: string, gamepadIndex: number, shouldTap: boolean) => {
      const tapHoldState = tapHoldStatesRef.current.get(stateKey);
      if (!tapHoldState) {
        return;
      }

      if (tapHoldState.holdPressed) {
        releaseMappedAction(tapHoldState.action.hold, stateKey, gamepadIndex);
        activeActionsRef.current.delete(stateKey);
      } else if (shouldTap) {
        tapRecordedInputAction(tapHoldState.action.tap, stateKey);
      }

      tapHoldStatesRef.current.delete(stateKey);
    },
    [releaseMappedAction, tapRecordedInputAction]
  );

  const cancelTapHoldState = useCallback(
    (stateKey: string, gamepadIndex: number) => {
      const tapHoldState = tapHoldStatesRef.current.get(stateKey);
      if (!tapHoldState) {
        return;
      }

      if (tapHoldState.holdPressed) {
        releaseMappedAction(tapHoldState.action.hold, stateKey, gamepadIndex);
        activeActionsRef.current.delete(stateKey);
      }

      tapHoldStatesRef.current.delete(stateKey);
    },
    [releaseMappedAction]
  );

  const advanceTapHoldState = useCallback(
    (
      stateKey: string,
      tapHoldState: TapHoldState,
      gamepadIndex: number,
      now: number
    ) => {
      if (
        !tapHoldState.holdPressed &&
        now - tapHoldState.startedAt >= tapHoldState.action.tappingTermMs
      ) {
        pressTapHoldHoldAction(stateKey, tapHoldState, gamepadIndex);
      }
    },
    [pressTapHoldHoldAction]
  );

  const processTapHoldAction = useCallback(
    (
      action: TapHoldAction,
      pressed: boolean,
      stateKey: string,
      gamepadIndex: number
    ) => {
      if (!pressed) {
        finishTapHoldState(stateKey, gamepadIndex, true);
        return;
      }

      const existingState = tapHoldStatesRef.current.get(stateKey);
      if (existingState && !areSameMappingActions(existingState.action, action)) {
        cancelTapHoldState(stateKey, gamepadIndex);
      }

      let tapHoldState = tapHoldStatesRef.current.get(stateKey);
      if (!tapHoldState) {
        tapHoldState = {
          action,
          startedAt: performance.now(),
          holdPressed: false,
        };
        tapHoldStatesRef.current.set(stateKey, tapHoldState);
      }

      advanceTapHoldState(
        stateKey,
        tapHoldState,
        gamepadIndex,
        performance.now()
      );
    },
    [advanceTapHoldState, cancelTapHoldState, finishTapHoldState]
  );

  const triggerMappedAction = useCallback(
    (
      mapping: { key: string; label: string; action?: MappingAction },
      pressed: boolean,
      stateKey: string,
      gamepadIndex: number
    ) => {
      const { action } = normalizeMappingAssignment(mapping);

      if (action.type === "tap-hold") {
        processTapHoldAction(action, pressed, stateKey, gamepadIndex);
        return;
      }

      cancelTapHoldState(stateKey, gamepadIndex);
      const activeAction = activeActionsRef.current.get(stateKey);

      if (!pressed) {
        releaseMappedAction(activeAction ?? action, stateKey, gamepadIndex);
        activeActionsRef.current.delete(stateKey);
        return;
      }

      if (activeAction && !areSameMappingActions(activeAction, action)) {
        releaseMappedAction(activeAction, stateKey, gamepadIndex);
      }

      activeActionsRef.current.set(stateKey, action);
      pressMappedAction(action, stateKey, gamepadIndex);
    },
    [
      cancelTapHoldState,
      pressMappedAction,
      processTapHoldAction,
      releaseMappedAction,
    ]
  );

  const clearActiveComboState = useCallback((comboStateKey: string) => {
    const comboInputs = activeComboInputsRef.current.get(comboStateKey);
    comboInputs?.forEach((input) => {
      const stateKeyPrefix = comboStateKey.slice(
        0,
        comboStateKey.indexOf("-combo-")
      );
      const gamepadIndex = Number(
        stateKeyPrefix.slice("gamepad-".length)
      );
      if (Number.isFinite(gamepadIndex)) {
        comboInputPressedAtRef.current.delete(
          getComboInputStateKey(gamepadIndex, input)
        );
      }
    });
    activeComboStateKeysRef.current.delete(comboStateKey);
    activeComboInputsRef.current.delete(comboStateKey);
  }, []);

  const releaseSuppressedAction = useCallback(
    (stateKey: string, gamepadIndex: number) => {
      cancelTapHoldState(stateKey, gamepadIndex);

      const activeAction = activeActionsRef.current.get(stateKey);
      if (!activeAction) {
        return;
      }

      releaseMappedAction(activeAction, stateKey, gamepadIndex);
      activeActionsRef.current.delete(stateKey);
    },
    [cancelTapHoldState, releaseMappedAction]
  );

  const processComboMappings = useCallback(
    (
      gamepad: GamepadState,
      comboMappings: ComboMapping[],
      seenStateKeys: Set<string>
    ) => {
      const suppressedStateKeys = new Set<string>();
      if (comboMappings.length === 0) {
        return suppressedStateKeys;
      }

      const now = performance.now();
      const sortedComboMappings = [...comboMappings].sort((a, b) => {
        if (b.inputs.length !== a.inputs.length) {
          return b.inputs.length - a.inputs.length;
        }

        return a.id.localeCompare(b.id);
      });

      sortedComboMappings.forEach((comboMapping) => {
        const comboStateKey = getComboStateKey(gamepad.index, comboMapping.id);
        seenStateKeys.add(comboStateKey);

        const inputStateKeys = comboMapping.inputs.map((input) => {
          const stateKey = getComboInputStateKey(gamepad.index, input);
          const pressed = isComboInputPressed(gamepad, input);

          if (pressed) {
            if (!comboInputPressedAtRef.current.has(stateKey)) {
              comboInputPressedAtRef.current.set(stateKey, now);
            }
          } else {
            comboInputPressedAtRef.current.delete(stateKey);
          }

          return stateKey;
        });
        const uniqueInputStateKeys = Array.from(new Set(inputStateKeys));
        const hasEnoughInputs = uniqueInputStateKeys.length >= 2;
        const hasOverlappingActiveCombo = uniqueInputStateKeys.some((stateKey) =>
          suppressedStateKeys.has(stateKey)
        );
        const wasActive = activeComboStateKeysRef.current.has(comboStateKey);
        const isActive =
          hasEnoughInputs &&
          !hasOverlappingActiveCombo &&
          isComboReady(
            uniqueInputStateKeys,
            comboInputPressedAtRef.current,
            comboMapping.termMs,
            wasActive
          );

        if (isActive) {
          activeComboStateKeysRef.current.add(comboStateKey);
          activeComboInputsRef.current.set(comboStateKey, comboMapping.inputs);
          uniqueInputStateKeys.forEach((stateKey) => {
            suppressedStateKeys.add(stateKey);
            releaseSuppressedAction(stateKey, gamepad.index);
          });
        } else {
          clearActiveComboState(comboStateKey);
        }

        triggerMappedAction(comboMapping, isActive, comboStateKey, gamepad.index);
      });

      return suppressedStateKeys;
    },
    [clearActiveComboState, releaseSuppressedAction, triggerMappedAction]
  );

  const releaseInactiveActionsForGamepad = useCallback(
    (gamepadIndex: number, seenStateKeys: Set<string>) => {
      const stateKeyPrefix = `gamepad-${gamepadIndex}-`;
      activeActionsRef.current.forEach((action, stateKey) => {
        if (
          stateKey.startsWith(stateKeyPrefix) &&
          !seenStateKeys.has(stateKey)
        ) {
          releaseMappedAction(action, stateKey, gamepadIndex);
          activeActionsRef.current.delete(stateKey);
          tapHoldStatesRef.current.delete(stateKey);
          if (stateKey.includes("-combo-")) {
            clearActiveComboState(stateKey);
          }
        }
      });
    },
    [clearActiveComboState, releaseMappedAction]
  );

  const isTapHoldStatePressed = useCallback(
    (gamepad: GamepadState, stateKey: string) => {
      if (stateKey.includes("-combo-")) {
        const comboInputs = activeComboInputsRef.current.get(stateKey);
        return (
          !!comboInputs &&
          comboInputs.every((input) => isComboInputPressed(gamepad, input))
        );
      }

      return getPressedStateForStateKey(gamepad, stateKey);
    },
    []
  );

  const reconcileTapHoldStatesForGamepad = useCallback(
    (gamepad: GamepadState, seenStateKeys: Set<string>) => {
      const stateKeyPrefix = `gamepad-${gamepad.index}-`;
      const now = performance.now();

      Array.from(tapHoldStatesRef.current.entries()).forEach(
        ([stateKey, tapHoldState]) => {
          if (!stateKey.startsWith(stateKeyPrefix) || seenStateKeys.has(stateKey)) {
            return;
          }

          if (isTapHoldStatePressed(gamepad, stateKey)) {
            seenStateKeys.add(stateKey);
            advanceTapHoldState(stateKey, tapHoldState, gamepad.index, now);
            return;
          }

          finishTapHoldState(stateKey, gamepad.index, true);
        }
      );
    },
    [advanceTapHoldState, finishTapHoldState, isTapHoldStatePressed]
  );

  const reconcileActiveLayerActionHoldersForGamepad = useCallback(
    (gamepad: GamepadState, seenStateKeys: Set<string>) => {
      const preservedStateKeys = new Set<string>();
      const suppressedStateKeys = new Set<string>();
      const stateKeyPrefix = `gamepad-${gamepad.index}-`;

      Array.from(activeActionsRef.current.entries()).forEach(
        ([stateKey, action]) => {
          if (!stateKey.startsWith(stateKeyPrefix) || action.type !== "layer") {
            return;
          }

          if (stateKey.includes("-combo-")) {
            const comboInputs = activeComboInputsRef.current.get(stateKey);
            const comboStillPressed =
              !!comboInputs &&
              comboInputs.every((input) => isComboInputPressed(gamepad, input));

            if (comboStillPressed) {
              seenStateKeys.add(stateKey);
              preservedStateKeys.add(stateKey);
              comboInputs.forEach((input) => {
                suppressedStateKeys.add(
                  getComboInputStateKey(gamepad.index, input)
                );
              });
              return;
            }

            releaseMappedAction(action, stateKey, gamepad.index);
            activeActionsRef.current.delete(stateKey);
            tapHoldStatesRef.current.delete(stateKey);
            clearActiveComboState(stateKey);
            return;
          }

          seenStateKeys.add(stateKey);
          if (getPressedStateForStateKey(gamepad, stateKey)) {
            preservedStateKeys.add(stateKey);
            return;
          }

          releaseMappedAction(action, stateKey, gamepad.index);
          activeActionsRef.current.delete(stateKey);
          tapHoldStatesRef.current.delete(stateKey);
        }
      );

      return { preservedStateKeys, suppressedStateKeys };
    },
    [clearActiveComboState, releaseMappedAction]
  );

  useEffect(() => {
    gamepadsRef.current = gamepads;
  }, [gamepads]);

  // Check and trigger mappings based on the latest gamepad state.
  const processGamepadMappings = useCallback(() => {
    gamepadsRef.current.forEach((gamepad) => {
      const seenStateKeys = new Set<string>();
      const {
        preservedStateKeys: preservedLayerActionStateKeys,
        suppressedStateKeys: preservedComboInputStateKeys,
      } =
        reconcileActiveLayerActionHoldersForGamepad(gamepad, seenStateKeys);
      const mapping = getMapping(gamepad.index);
      if (!mapping) {
        releaseInactiveActionsForGamepad(gamepad.index, seenStateKeys);
        return;
      }

      const activeLayerIndices = getActiveLayerIndices(gamepad.index);
      const effectiveMappings = getEffectiveMappingsSnapshot(
        gamepad.index,
        mapping,
        activeLayerIndices
      );
      const {
        buttonMappings,
        dpadMappings,
        comboMappings,
        mouseMappings,
        scrollMappings,
        hotkeyMappingsByStick,
      } = effectiveMappings;
      const suppressedStateKeys = processComboMappings(
        gamepad,
        comboMappings,
        seenStateKeys
      );
      preservedComboInputStateKeys.forEach((stateKey) => {
        suppressedStateKeys.add(stateKey);
      });

      // Check button mappings
      buttonMappings.forEach((btnMapping) => {
        const button = gamepad.buttons[btnMapping.buttonIndex];
        if (button) {
          const stateKey = `gamepad-${gamepad.index}-button-${btnMapping.buttonIndex}`;
          if (preservedLayerActionStateKeys.has(stateKey)) {
            return;
          }

          seenStateKeys.add(stateKey);
          if (suppressedStateKeys.has(stateKey)) {
            return;
          }
          triggerMappedAction(
            btnMapping,
            button.pressed,
            stateKey,
            gamepad.index
          );
        }
      });

      // Check dpad mappings with combined keys
      if (dpadMappings.length > 0) {
        const currentDirection = getDpadDirection(gamepad.buttons);

        // Check if there's a direct mapping for the current direction
        const hasDirectMapping =
          currentDirection &&
          dpadMappings.some((m) => m.direction === currentDirection);

        // Process each dpad mapping
        dpadMappings.forEach((dpadMapping) => {
          const stateKey = `gamepad-${gamepad.index}-dpad-${dpadMapping.direction}`;
          if (preservedLayerActionStateKeys.has(stateKey)) {
            return;
          }

          seenStateKeys.add(stateKey);
          if (suppressedStateKeys.has(stateKey)) {
            return;
          }
          let isActive = false;

          if (currentDirection === dpadMapping.direction) {
            // Direct match
            isActive = true;
          } else if (currentDirection && !hasDirectMapping) {
            // No direct mapping - check if this is a fallback cardinal direction for a diagonal
            const fallbackDirections = getFallbackDirections(currentDirection);
            isActive = fallbackDirections.includes(dpadMapping.direction);
          }

          triggerMappedAction(dpadMapping, isActive, stateKey, gamepad.index);
        });
      }

      // Process axis mappings - handle both hotkey and mouse control modes
      // Process mouse mappings first (one per stick)
      mouseMappings.forEach((mouseMapping) => {
        const stickIndex = mouseMapping.stickIndex;

        // Get stick axes based on stick index
        const { axisXIndex, axisYIndex } = getStickAxes(stickIndex);
        let stickX = gamepad.axes[axisXIndex] || 0;
        let stickY = gamepad.axes[axisYIndex] || 0;

        // Apply user invert settings
        if (mouseMapping.invertX) stickX = -stickX;
        if (mouseMapping.invertY) stickY = -stickY;

        // Use flat deadzone threshold for X and Y independently (not relative to magnitude)
        const absX = Math.abs(stickX);
        const absY = Math.abs(stickY);
        const threshold = mouseMapping.threshold;
        const inDeadzone = absX < threshold && absY < threshold;

        const mouseStateKey = `gamepad-${gamepad.index}-mouse-${stickIndex}`;

        if (inDeadzone) {
          // Reset movement start time when stick returns to deadzone
          stickMovementStartTimeRef.current.delete(mouseStateKey);
          return; // In deadzone - don't move mouse
        }

        // Calculate movement with sensitivity and acceleration
        const sensitivity =
          mouseMapping.sensitivity ?? DEFAULT_MOUSE_SENSITIVITY;
        const acceleration =
          mouseMapping.acceleration ?? DEFAULT_MOUSE_ACCELERATION;

        // Track movement start time for time-based acceleration
        const now = Date.now();
        if (!stickMovementStartTimeRef.current.has(mouseStateKey)) {
          stickMovementStartTimeRef.current.set(mouseStateKey, now);
        }
        const movementStartTime =
          stickMovementStartTimeRef.current.get(mouseStateKey)!;
        const movementDurationSeconds = (now - movementStartTime) / 1000;

        // Remove deadzone: subtract threshold from X and Y independently (flat deadzone)
        let normalizedX = 0;
        let normalizedY = 0;

        if (absX >= threshold) {
          const signX = stickX >= 0 ? 1 : -1;
          normalizedX = (signX * (absX - threshold)) / (1 - threshold);
        }

        if (absY >= threshold) {
          const signY = stickY >= 0 ? 1 : -1;
          normalizedY = (signY * (absY - threshold)) / (1 - threshold);
        }

        // Apply time-based acceleration: acceleration = 1 means no acceleration,
        // acceleration = 1.2 means 1.2x speed every second
        let accelerationMultiplier = 1.0;
        if (acceleration !== 1.0 && movementDurationSeconds > 0) {
          // acceleration^time gives us the multiplier
          // e.g., acceleration=1.2, time=1s -> 1.2^1 = 1.2x
          // e.g., acceleration=1.2, time=2s -> 1.2^2 = 1.44x
          accelerationMultiplier = Math.pow(
            acceleration,
            movementDurationSeconds
          );
        }

        // Calculate movement delta
        const deltaX = normalizedX * sensitivity * accelerationMultiplier * 10;
        const deltaY = normalizedY * sensitivity * accelerationMultiplier * 10;

        // Final check: re-read stick state RIGHT BEFORE sending to prevent drift
        // This ensures we never send a movement if stick is already released
        let finalStickX = gamepad.axes[axisXIndex] || 0;
        let finalStickY = gamepad.axes[axisYIndex] || 0;
        if (mouseMapping.invertX) finalStickX = -finalStickX;
        if (mouseMapping.invertY) finalStickY = -finalStickY;

        if (
          Math.abs(finalStickX) < threshold &&
          Math.abs(finalStickY) < threshold
        ) {
          // Reset movement start time when stick returns to deadzone
          stickMovementStartTimeRef.current.delete(mouseStateKey);
          return; // In deadzone now - don't send movement
        }

        // Prevent queuing: only send if no pending movement for this stick
        // Queued IPC calls cause drift because each reads mouse position after previous move
        if (pendingMouseMovementsRef.current.has(mouseStateKey)) {
          return; // Skip this frame - previous movement still pending
        }

        // Send movement - mark as pending to prevent queuing
        if (window.mouseSimulator) {
          pendingMouseMovementsRef.current.add(mouseStateKey);
          window.mouseSimulator
            .moveMouse(deltaX, deltaY)
            .then(() => {
              pendingMouseMovementsRef.current.delete(mouseStateKey);
            })
            .catch((err) => {
              console.error("Error moving mouse:", err);
              pendingMouseMovementsRef.current.delete(mouseStateKey);
            });
        }
      });

      // Process scroll mappings first (one per stick)
      scrollMappings.forEach((scrollMapping) => {
        const stickIndex = scrollMapping.stickIndex;

        const { axisXIndex, axisYIndex } = getStickAxes(stickIndex);
        let stickX = gamepad.axes[axisXIndex] || 0;
        let stickY = gamepad.axes[axisYIndex] || 0;

        if (scrollMapping.invertX) stickX = -stickX;
        if (scrollMapping.invertY) stickY = -stickY;

        const absX = Math.abs(stickX);
        const absY = Math.abs(stickY);
        const threshold = scrollMapping.threshold;
        const inDeadzone = absX < threshold && absY < threshold;
        const scrollStateKey = `gamepad-${gamepad.index}-scroll-${stickIndex}`;

        if (inDeadzone) {
          stickMovementStartTimeRef.current.delete(scrollStateKey);
          scrollRemainderRef.current.delete(scrollStateKey);
          lastScrollUpdateTimeRef.current.delete(scrollStateKey);
          return;
        }

        const sensitivity =
          scrollMapping.sensitivity ?? DEFAULT_SCROLL_SENSITIVITY;
        const acceleration =
          scrollMapping.acceleration ?? DEFAULT_SCROLL_ACCELERATION;

        const now = performance.now();
        if (!stickMovementStartTimeRef.current.has(scrollStateKey)) {
          stickMovementStartTimeRef.current.set(scrollStateKey, now);
        }
        const previousUpdateTime =
          lastScrollUpdateTimeRef.current.get(scrollStateKey) ??
          now - 1000 / SCROLL_STEPS_PER_SECOND;
        lastScrollUpdateTimeRef.current.set(scrollStateKey, now);
        const movementStartTime =
          stickMovementStartTimeRef.current.get(scrollStateKey)!;
        const movementDurationSeconds = (now - movementStartTime) / 1000;
        const elapsedSeconds = Math.min(
          Math.max((now - previousUpdateTime) / 1000, 0),
          0.05
        );

        let normalizedX = 0;
        let normalizedY = 0;

        if (absX >= threshold) {
          const signX = stickX >= 0 ? 1 : -1;
          normalizedX = (signX * (absX - threshold)) / (1 - threshold);
        }

        if (absY >= threshold) {
          const signY = stickY >= 0 ? 1 : -1;
          normalizedY = (signY * (absY - threshold)) / (1 - threshold);
        }

        let accelerationMultiplier = 1.0;
        if (acceleration !== 1.0 && movementDurationSeconds > 0) {
          accelerationMultiplier = Math.pow(
            acceleration,
            movementDurationSeconds
          );
        }

        let finalStickX = gamepad.axes[axisXIndex] || 0;
        let finalStickY = gamepad.axes[axisYIndex] || 0;
        if (scrollMapping.invertX) finalStickX = -finalStickX;
        if (scrollMapping.invertY) finalStickY = -finalStickY;

        if (
          Math.abs(finalStickX) < threshold &&
          Math.abs(finalStickY) < threshold
        ) {
          stickMovementStartTimeRef.current.delete(scrollStateKey);
          scrollRemainderRef.current.delete(scrollStateKey);
          lastScrollUpdateTimeRef.current.delete(scrollStateKey);
          return;
        }

        const remainder =
          scrollRemainderRef.current.get(scrollStateKey) ?? { x: 0, y: 0 };
        const nextX =
          remainder.x +
          normalizedX *
            sensitivity *
            accelerationMultiplier *
            elapsedSeconds *
            SCROLL_STEPS_PER_SECOND;
        const nextY =
          remainder.y +
          normalizedY *
            sensitivity *
            accelerationMultiplier *
            elapsedSeconds *
            SCROLL_STEPS_PER_SECOND;
        const stepsX = nextX < 0 ? Math.ceil(nextX) : Math.floor(nextX);
        const stepsY = nextY < 0 ? Math.ceil(nextY) : Math.floor(nextY);

        scrollRemainderRef.current.set(scrollStateKey, {
          x: nextX - stepsX,
          y: nextY - stepsY,
        });

        sendMouseScroll(stepsX, stepsY);
      });

      // Process each stick's mappings
      hotkeyMappingsByStick.forEach(([stickIndex, axisMappings]) => {
        const { axisXIndex, axisYIndex } = getStickAxes(stickIndex);
        const stickX = gamepad.axes[axisXIndex] || 0;
        const stickY = gamepad.axes[axisYIndex] || 0;

        // Get all configured directions for this stick (to check if diagonal has direct mapping)
        const configuredDirections = new Set(
          axisMappings.map((m) => m.direction)
        );

        // Process each mapping for this stick
        axisMappings.forEach((axisMapping) => {
          const stateKey = `gamepad-${gamepad.index}-axis-${axisMapping.stickIndex}-${axisMapping.direction}`;
          if (preservedLayerActionStateKeys.has(stateKey)) {
            return;
          }

          seenStateKeys.add(stateKey);
          if (suppressedStateKeys.has(stateKey)) {
            return;
          }
          const detectedDirection = getStickDirection(
            stickX,
            stickY,
            axisMapping.threshold,
            axisMapping.directionGapDegrees
          );
          let isActive = false;

          if (detectedDirection === axisMapping.direction) {
            // Direct match
            isActive = true;
          } else if (
            detectedDirection &&
            !configuredDirections.has(detectedDirection)
          ) {
            // No direct mapping configured for detected direction - check if this is a fallback cardinal direction for a diagonal
            const fallbackDirections = getFallbackDirections(detectedDirection);
            isActive = fallbackDirections.includes(axisMapping.direction);
          }

          triggerMappedAction(axisMapping, isActive, stateKey, gamepad.index);
        });
      });

      reconcileTapHoldStatesForGamepad(gamepad, seenStateKeys);
      releaseInactiveActionsForGamepad(gamepad.index, seenStateKeys);
    });
  }, [
    getActiveLayerIndices,
    getEffectiveMappingsSnapshot,
    getFallbackDirections,
    getMapping,
    processComboMappings,
    reconcileActiveLayerActionHoldersForGamepad,
    reconcileTapHoldStatesForGamepad,
    releaseInactiveActionsForGamepad,
    sendMouseScroll,
    triggerMappedAction,
  ]);

  useEffect(() => {
    const intervalId = window.setInterval(processGamepadMappings, 16);
    return () => window.clearInterval(intervalId);
  }, [processGamepadMappings]);

  return {
    mappings,
    getMapping,
    getProfiles,
    getActiveProfileId,
    setActiveProfile,
    addProfile,
    duplicateProfile,
    renameProfile,
    removeProfile,
    getLayers,
    getLayerView,
    ensureLayer,
    setButtonMapping,
    setAxisMapping,
    setDpadMapping,
    setComboMapping,
    removeButtonMapping,
    removeAxisMapping,
    removeDpadMapping,
    removeComboMapping,
    editingButton,
    setEditingButton,
    editingAxis,
    setEditingAxis,
    editingDpad,
    setEditingDpad,
  };
}
