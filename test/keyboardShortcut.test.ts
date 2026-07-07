import { Key } from "@nut-tree-fork/nut-js";
import { describe, expect, it } from "vitest";
import {
  getNutKeysForShortcut,
  getNutKeysForKeyName,
} from "../electron/main/keyShortcut";
import {
  createKeyboardShortcut,
  KeyboardShortcutEvent,
} from "../src/utils/keyboardShortcut";

function keyboardEvent(
  overrides: Partial<KeyboardShortcutEvent>
): KeyboardShortcutEvent {
  return {
    altKey: false,
    code: "",
    ctrlKey: false,
    key: "",
    metaKey: false,
    shiftKey: false,
    ...overrides,
  };
}

describe("createKeyboardShortcut", () => {
  it("records unshifted symbol keys as stable base tokens", () => {
    expect(
      createKeyboardShortcut(keyboardEvent({ code: "Semicolon", key: ";" }))
    ).toEqual({ key: ";", label: ";" });
  });

  it("records shifted symbols by physical base key", () => {
    expect(
      createKeyboardShortcut(
        keyboardEvent({ code: "Semicolon", key: ":", shiftKey: true })
      )
    ).toEqual({ key: "Shift+;", label: "SHIFT+;" });

    expect(
      createKeyboardShortcut(
        keyboardEvent({ code: "Equal", key: "+", shiftKey: true })
      )
    ).toEqual({ key: "Shift+=", label: "SHIFT+=" });
  });

  it("uses Control instead of the unsupported Ctrl alias for new recordings", () => {
    expect(
      createKeyboardShortcut(
        keyboardEvent({ code: "Slash", ctrlKey: true, key: "/" })
      )
    ).toEqual({ key: "Control+/", label: "CTRL+/" });
  });

  it("records high function keys", () => {
    expect(
      createKeyboardShortcut(keyboardEvent({ code: "F18", key: "F18" }))
    ).toEqual({ key: "F18", label: "F18" });
  });

  it("records numpad keys separately from main keyboard keys", () => {
    expect(
      createKeyboardShortcut(keyboardEvent({ code: "Enter", key: "Enter" }))
    ).toEqual({ key: "Enter", label: "ENTER" });
    expect(
      createKeyboardShortcut(keyboardEvent({ code: "Digit1", key: "1" }))
    ).toEqual({ key: "1", label: "1" });
    expect(
      createKeyboardShortcut(keyboardEvent({ code: "Numpad1", key: "1" }))
    ).toEqual({ key: "Numpad1", label: "NUM 1" });
    expect(
      createKeyboardShortcut(keyboardEvent({ code: "NumpadAdd", key: "+" }))
    ).toEqual({ key: "NumpadAdd", label: "NUM +" });
    expect(
      createKeyboardShortcut(
        keyboardEvent({ code: "NumpadDivide", ctrlKey: true, key: "/" })
      )
    ).toEqual({ key: "Control+NumpadDivide", label: "CTRL+NUM /" });
  });
});

describe("getNutKeysForShortcut", () => {
  it("resolves normalized shifted symbol shortcuts", () => {
    expect(getNutKeysForShortcut("Shift+;")).toEqual([
      Key.LeftShift,
      Key.Semicolon,
    ]);
    expect(getNutKeysForShortcut("Shift+=")).toEqual([
      Key.LeftShift,
      Key.Equal,
    ]);
  });

  it("keeps old recorded shifted symbol characters working", () => {
    expect(getNutKeysForKeyName(":")).toEqual([Key.LeftShift, Key.Semicolon]);
    expect(getNutKeysForShortcut("Shift++")).toEqual([
      Key.LeftShift,
      Key.Equal,
    ]);
  });

  it("supports previous Ctrl combo recordings", () => {
    expect(getNutKeysForShortcut("Ctrl+/")).toEqual([
      Key.LeftControl,
      Key.Slash,
    ]);
  });

  it("resolves high function keys", () => {
    expect(getNutKeysForShortcut("F18")).toEqual([Key.F18]);
    expect(getNutKeysForShortcut("F20")).toEqual([Key.F20]);
  });

  it("resolves numpad shortcuts separately from main keyboard shortcuts", () => {
    expect(getNutKeysForShortcut("Enter")).toEqual([Key.Return]);
    expect(getNutKeysForShortcut("1")).toEqual([Key.Num1]);
    expect(getNutKeysForShortcut("Numpad1")).toEqual([Key.NumPad1]);
    expect(getNutKeysForShortcut("NumpadAdd")).toEqual([Key.Add]);
    expect(getNutKeysForShortcut("NumpadEnter")).toEqual([Key.Enter]);
    expect(getNutKeysForShortcut("Control+NumpadDivide")).toEqual([
      Key.LeftControl,
      Key.Divide,
    ]);
  });

  it("keeps old recorded Chinese punctuation keys working", () => {
    expect(getNutKeysForKeyName("，")).toEqual([Key.Comma]);
    expect(getNutKeysForKeyName("。")).toEqual([Key.Period]);
    expect(getNutKeysForKeyName("；")).toEqual([Key.Semicolon]);
    expect(getNutKeysForKeyName("【")).toEqual([Key.LeftBracket]);
    expect(getNutKeysForKeyName("】")).toEqual([Key.RightBracket]);
    expect(getNutKeysForKeyName("、")).toEqual([Key.Backslash]);
    expect(getNutKeysForKeyName("·")).toEqual([Key.Grave]);
    expect(getNutKeysForKeyName("？")).toEqual([Key.LeftShift, Key.Slash]);
  });
});
