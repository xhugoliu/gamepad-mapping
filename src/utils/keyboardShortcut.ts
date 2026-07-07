export type KeyboardShortcutEvent = Pick<
  KeyboardEvent,
  "altKey" | "code" | "ctrlKey" | "key" | "metaKey" | "shiftKey"
>;

export interface KeyboardShortcut {
  key: string;
  label: string;
}

const MODIFIER_KEY_TO_PART: Record<string, string> = {
  Alt: "Alt",
  Control: "Control",
  Ctrl: "Control",
  Meta: "Meta",
  Shift: "Shift",
};

const MODIFIER_LABELS: Record<string, string> = {
  Alt: "ALT",
  Control: "CTRL",
  Meta: "META",
  Shift: "SHIFT",
};

const CODE_TO_KEY_PART: Record<string, string> = {
  Backquote: "`",
  Backslash: "\\",
  BracketLeft: "[",
  BracketRight: "]",
  Comma: ",",
  Equal: "=",
  IntlBackslash: "\\",
  Minus: "-",
  Period: ".",
  Quote: "'",
  Semicolon: ";",
  Slash: "/",
};

const NUMPAD_CODE_TO_KEY_PART: Record<string, string> = {
  Numpad0: "Numpad0",
  Numpad1: "Numpad1",
  Numpad2: "Numpad2",
  Numpad3: "Numpad3",
  Numpad4: "Numpad4",
  Numpad5: "Numpad5",
  Numpad6: "Numpad6",
  Numpad7: "Numpad7",
  Numpad8: "Numpad8",
  Numpad9: "Numpad9",
  NumpadAdd: "NumpadAdd",
  NumpadComma: "NumpadComma",
  NumpadDecimal: "NumpadDecimal",
  NumpadDivide: "NumpadDivide",
  NumpadEnter: "NumpadEnter",
  NumpadEqual: "NumpadEqual",
  NumpadMultiply: "NumpadMultiply",
  NumpadSubtract: "NumpadSubtract",
};

const KEY_PART_LABELS: Record<string, string> = {
  Numpad0: "NUM 0",
  Numpad1: "NUM 1",
  Numpad2: "NUM 2",
  Numpad3: "NUM 3",
  Numpad4: "NUM 4",
  Numpad5: "NUM 5",
  Numpad6: "NUM 6",
  Numpad7: "NUM 7",
  Numpad8: "NUM 8",
  Numpad9: "NUM 9",
  NumpadAdd: "NUM +",
  NumpadComma: "NUM ,",
  NumpadDecimal: "NUM .",
  NumpadDivide: "NUM /",
  NumpadEnter: "NUM ENTER",
  NumpadEqual: "NUM =",
  NumpadMultiply: "NUM *",
  NumpadSubtract: "NUM -",
};

const MODIFIER_PRIORITY: Record<string, number> = {
  Control: 1,
  Alt: 2,
  Shift: 3,
  Meta: 4,
};

function getKeyPartFromCode(code: string) {
  if (NUMPAD_CODE_TO_KEY_PART[code]) {
    return NUMPAD_CODE_TO_KEY_PART[code];
  }

  if (/^Key[A-Z]$/.test(code)) {
    return code.slice(3).toLowerCase();
  }

  if (/^Digit[0-9]$/.test(code)) {
    return code.slice(5);
  }

  return CODE_TO_KEY_PART[code] ?? null;
}

function getMainKeyPart(event: KeyboardShortcutEvent) {
  const modifierPart = MODIFIER_KEY_TO_PART[event.key];
  if (modifierPart) {
    return modifierPart;
  }

  if (event.key === " ") {
    return "Space";
  }

  const codePart = getKeyPartFromCode(event.code);
  if (codePart) {
    return codePart;
  }

  return event.key || null;
}

function pushModifier(
  parts: string[],
  part: string,
  mainPart: string | null,
  pressed: boolean
) {
  if (pressed && mainPart !== part) {
    parts.push(part);
  }
}

function sortShortcutParts(parts: string[]) {
  return [...parts].sort((a, b) => {
    const aPriority = MODIFIER_PRIORITY[a] ?? 100;
    const bPriority = MODIFIER_PRIORITY[b] ?? 100;
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    return a.localeCompare(b);
  });
}

function formatShortcutLabel(parts: string[]) {
  return parts
    .map((part) => MODIFIER_LABELS[part] ?? KEY_PART_LABELS[part] ?? part.toUpperCase())
    .join("+");
}

export function createKeyboardShortcut(
  event: KeyboardShortcutEvent
): KeyboardShortcut | null {
  const mainPart = getMainKeyPart(event);
  if (!mainPart) {
    return null;
  }

  const parts: string[] = [];
  pushModifier(parts, "Control", mainPart, event.ctrlKey);
  pushModifier(parts, "Alt", mainPart, event.altKey);
  pushModifier(parts, "Shift", mainPart, event.shiftKey);
  pushModifier(parts, "Meta", mainPart, event.metaKey);
  parts.push(mainPart);

  const sortedParts = sortShortcutParts(parts);
  const key = sortedParts.join("+");

  return {
    key,
    label: formatShortcutLabel(sortedParts),
  };
}
