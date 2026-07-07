import { Key } from "@nut-tree-fork/nut-js";
import { describe, expect, it } from "vitest";
import {
  getNutKeysForShortcut,
  getNutKeysForKeyName,
} from "../electron/main/keyShortcut";

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
