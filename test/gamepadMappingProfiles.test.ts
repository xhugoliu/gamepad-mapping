import { describe, expect, it } from "vitest";
import { normalizeGamepadMapping } from "../src/hooks/useGamepadMapping";

describe("gamepad mapping profiles", () => {
  it("migrates a legacy mapping into the default profile", () => {
    const mapping = normalizeGamepadMapping({
      gamepadIndex: 0,
      buttonMappings: [{ buttonIndex: 0, key: "Space", label: "SPACE" }],
      axisMappings: [],
      dpadMappings: [],
      comboMappings: [],
      layers: [
        {
          layerIndex: 0,
          name: "Base",
          buttonMappings: [
            { buttonIndex: 1, key: "Enter", label: "ENTER" },
          ],
          axisMappings: [],
          dpadMappings: [],
          comboMappings: [],
        },
      ],
    });

    expect(mapping.activeProfileId).toBe("default");
    expect(mapping.profiles).toHaveLength(1);
    expect(mapping.profiles?.[0].name).toBe("Default");
    expect(mapping.buttonMappings).toEqual([
      { buttonIndex: 1, key: "Enter", label: "ENTER" },
    ]);
    expect(mapping.profiles?.[0].layers).toHaveLength(1);
  });

  it("exposes the active profile as the current mapping view", () => {
    const mapping = normalizeGamepadMapping({
      gamepadIndex: 0,
      activeProfileId: "game",
      buttonMappings: [],
      axisMappings: [],
      dpadMappings: [],
      comboMappings: [],
      profiles: [
        {
          id: "work",
          name: "Work",
          buttonMappings: [{ buttonIndex: 0, key: "KeyW", label: "W" }],
          axisMappings: [],
          dpadMappings: [],
          comboMappings: [],
        },
        {
          id: "game",
          name: "Game",
          buttonMappings: [{ buttonIndex: 1, key: "KeyG", label: "G" }],
          axisMappings: [],
          dpadMappings: [],
          comboMappings: [],
        },
      ],
    });

    expect(mapping.id).toBe("game");
    expect(mapping.name).toBe("Game");
    expect(mapping.buttonMappings).toEqual([
      { buttonIndex: 1, key: "KeyG", label: "G" },
    ]);
    expect(mapping.profiles?.[0].buttonMappings).toEqual([
      { buttonIndex: 0, key: "KeyW", label: "W" },
    ]);
  });
});
