import { Button } from "@nut-tree-fork/nut-js";

export type MouseButtonAction =
  | {
      type: "button";
      button: Button;
    }
  | {
      type: "shortcut";
      key: string;
    };

function getBrowserBackShortcut(platform: NodeJS.Platform) {
  return platform === "darwin" ? "Meta+[" : "Alt+ArrowLeft";
}

function getBrowserForwardShortcut(platform: NodeJS.Platform) {
  return platform === "darwin" ? "Meta+]" : "Alt+ArrowRight";
}

export function getMouseButtonAction(
  button: string,
  platform: NodeJS.Platform = process.platform
): MouseButtonAction | null {
  switch (button) {
    case "MouseLeft":
      return { type: "button", button: Button.LEFT };
    case "MouseMiddle":
      return { type: "button", button: Button.MIDDLE };
    case "MouseRight":
      return { type: "button", button: Button.RIGHT };
    case "MouseBack":
      return { type: "shortcut", key: getBrowserBackShortcut(platform) };
    case "MouseForward":
      return { type: "shortcut", key: getBrowserForwardShortcut(platform) };
    default:
      return null;
  }
}
