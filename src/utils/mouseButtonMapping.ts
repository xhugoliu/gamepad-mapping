import type { KeyboardShortcut } from "./keyboardShortcut";

export function getMouseButtonMapping(
  button: number
): KeyboardShortcut | null {
  switch (button) {
    case 0:
      return { key: "MouseLeft", label: "Left Mouse" };
    case 1:
      return { key: "MouseMiddle", label: "Middle Mouse" };
    case 2:
      return { key: "MouseRight", label: "Right Mouse" };
    case 3:
      return { key: "MouseBack", label: "Browser Back" };
    case 4:
      return { key: "MouseForward", label: "Browser Forward" };
    default:
      return null;
  }
}
