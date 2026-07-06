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
