import { Button } from "@nut-tree-fork/nut-js";
import { describe, expect, it } from "vitest";
import { getMouseButtonAction } from "../electron/main/mouseButtonAction";
import { getMouseButtonMapping } from "../src/utils/mouseButtonMapping";

describe("getMouseButtonMapping", () => {
  it("records standard and browser mouse buttons", () => {
    expect(getMouseButtonMapping(0)).toEqual({
      key: "MouseLeft",
      label: "Left Mouse",
    });
    expect(getMouseButtonMapping(1)).toEqual({
      key: "MouseMiddle",
      label: "Middle Mouse",
    });
    expect(getMouseButtonMapping(2)).toEqual({
      key: "MouseRight",
      label: "Right Mouse",
    });
    expect(getMouseButtonMapping(3)).toEqual({
      key: "MouseBack",
      label: "Browser Back",
    });
    expect(getMouseButtonMapping(4)).toEqual({
      key: "MouseForward",
      label: "Browser Forward",
    });
  });

  it("ignores unknown mouse buttons", () => {
    expect(getMouseButtonMapping(5)).toBeNull();
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
