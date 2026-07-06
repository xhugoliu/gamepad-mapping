import { describe, expect, it } from "vitest";
import type { ComboInput } from "../src/hooks/useGamepadMapping";
import {
  dedupeComboInputs,
  getComboInputStateKey,
  isComboReady,
  normalizeComboTermMs,
} from "../src/utils/comboMapping";

describe("comboMapping", () => {
  it("normalizes combo term bounds", () => {
    expect(normalizeComboTermMs(undefined)).toBe(80);
    expect(normalizeComboTermMs(1)).toBe(20);
    expect(normalizeComboTermMs(999)).toBe(250);
  });

  it("generates stable state keys for combo inputs", () => {
    expect(
      getComboInputStateKey(0, { type: "button", buttonIndex: 1 })
    ).toBe("gamepad-0-button-1");
    expect(
      getComboInputStateKey(0, { type: "dpad", direction: "up" })
    ).toBe("gamepad-0-dpad-up");
    expect(
      getComboInputStateKey(0, {
        type: "axis",
        stickIndex: 1,
        direction: "down-right",
      })
    ).toBe("gamepad-0-axis-1-down-right");
  });

  it("deduplicates equivalent inputs", () => {
    const inputs: ComboInput[] = [
      { type: "button", buttonIndex: 1 },
      { type: "button", buttonIndex: 1 },
      { type: "dpad", direction: "up" },
    ];

    expect(dedupeComboInputs(inputs)).toEqual([
      { type: "button", buttonIndex: 1 },
      { type: "dpad", direction: "up" },
    ]);
  });

  it("requires all inputs inside the combo term before activation", () => {
    const pressedAt = new Map([
      ["gamepad-0-button-0", 100],
      ["gamepad-0-button-1", 170],
    ]);

    expect(
      isComboReady(
        ["gamepad-0-button-0", "gamepad-0-button-1"],
        pressedAt,
        80,
        false
      )
    ).toBe(true);
    expect(
      isComboReady(
        ["gamepad-0-button-0", "gamepad-0-button-1"],
        pressedAt,
        50,
        false
      )
    ).toBe(false);
  });

  it("keeps an active combo held while all inputs remain pressed", () => {
    const pressedAt = new Map([
      ["gamepad-0-button-0", 100],
      ["gamepad-0-button-1", 400],
    ]);

    expect(
      isComboReady(
        ["gamepad-0-button-0", "gamepad-0-button-1"],
        pressedAt,
        80,
        true
      )
    ).toBe(true);
  });
});
