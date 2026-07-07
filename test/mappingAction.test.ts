import { describe, expect, it } from "vitest";
import {
  createInputAction,
  createLayerAction,
  createTapHoldAction,
  describeMappingAction,
  normalizeMappingAssignment,
  normalizeTappingTermMs,
} from "../src/types/mappingAction";

describe("mappingAction", () => {
  it("normalizes tapping term bounds", () => {
    expect(normalizeTappingTermMs(undefined)).toBe(200);
    expect(normalizeTappingTermMs(1)).toBe(80);
    expect(normalizeTappingTermMs(999)).toBe(500);
  });

  it("describes mod-tap actions", () => {
    const action = createTapHoldAction(
      "mod-tap",
      createInputAction("a", "A"),
      createInputAction("Control", "CTRL"),
      200
    );

    expect(describeMappingAction(action)).toBe("MT(CTRL, A)");
  });

  it("describes layer-tap actions", () => {
    const action = createTapHoldAction(
      "layer-tap",
      createInputAction("Space", "SPACE"),
      createLayerAction("momentary", 2),
      200
    );

    expect(describeMappingAction(action)).toBe("LT(2, SPACE)");
  });

  it("normalizes tap-hold assignment labels and term", () => {
    const assignment = normalizeMappingAssignment({
      key: "custom",
      label: "custom",
      action: createTapHoldAction(
        "mod-tap",
        createInputAction("Escape", "ESCAPE"),
        createInputAction("Shift", "SHIFT"),
        999
      ),
    });

    expect(assignment.key).toBe("custom");
    expect(assignment.label).toBe("MT(SHIFT, ESCAPE)");
    expect(assignment.action.type).toBe("tap-hold");
    if (assignment.action.type === "tap-hold") {
      expect(assignment.action.tappingTermMs).toBe(500);
    }
  });
});
