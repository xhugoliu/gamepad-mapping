import { Button } from "@nut-tree-fork/nut-js";
import { describe, expect, it } from "vitest";
import { getMouseButtonAction } from "../electron/main/mouseButtonAction";
import { getNutKeysForShortcut } from "../electron/main/keyShortcut";
import {
  createInputShortcut,
  getInputOptionSelection,
  INPUT_OPTION_GROUPS,
} from "../src/constants/inputOptions";

const keyboardOptionKeys = INPUT_OPTION_GROUPS.flatMap((group) =>
  group.id === "mouse" || group.id === "wheel"
    ? []
    : group.options.map((option) => option.key)
);

describe("input options", () => {
  it("creates modifier shortcuts from dropdown selections", () => {
    expect(createInputShortcut("symbols", "/", ["Control"])).toEqual({
      key: "Control+/",
      label: "CTRL+/",
    });
    expect(createInputShortcut("numpad", "NumpadDivide", ["Control"])).toEqual({
      key: "Control+NumpadDivide",
      label: "CTRL+NUM /",
    });
  });

  it("selects existing shortcut tokens for editor display", () => {
    expect(getInputOptionSelection("Control+/")).toEqual({
      groupId: "symbols",
      optionKey: "/",
      modifiers: ["Control"],
    });
    expect(getInputOptionSelection("NumpadEnter")).toEqual({
      groupId: "numpad",
      optionKey: "NumpadEnter",
      modifiers: [],
    });
    expect(getInputOptionSelection("MouseBack")).toEqual({
      groupId: "mouse",
      optionKey: "MouseBack",
      modifiers: [],
    });
    expect(getInputOptionSelection("MediaVolumeUp")).toEqual({
      groupId: "media",
      optionKey: "MediaVolumeUp",
      modifiers: [],
    });
  });

  it("keeps dropdown keyboard options aligned with output support", () => {
    for (const key of keyboardOptionKeys) {
      expect(getNutKeysForShortcut(key), key).not.toBeNull();
    }
  });
});

describe("getMouseButtonAction", () => {
  it("maps standard buttons to native mouse buttons", () => {
    expect(getMouseButtonAction("MouseLeft")).toEqual({
      type: "button",
      button: Button.LEFT,
    });
    expect(getMouseButtonAction("MouseMiddle")).toEqual({
      type: "button",
      button: Button.MIDDLE,
    });
    expect(getMouseButtonAction("MouseRight")).toEqual({
      type: "button",
      button: Button.RIGHT,
    });
  });

  it("maps browser buttons to platform shortcuts", () => {
    expect(getMouseButtonAction("MouseBack", "darwin")).toEqual({
      type: "shortcut",
      key: "Meta+[",
    });
    expect(getMouseButtonAction("MouseForward", "darwin")).toEqual({
      type: "shortcut",
      key: "Meta+]",
    });
    expect(getMouseButtonAction("MouseBack", "win32")).toEqual({
      type: "shortcut",
      key: "Alt+ArrowLeft",
    });
    expect(getMouseButtonAction("MouseForward", "linux")).toEqual({
      type: "shortcut",
      key: "Alt+ArrowRight",
    });
  });
});
