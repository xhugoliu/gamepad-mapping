export type InputModifierKey = "Control" | "Alt" | "Shift" | "Meta";

export type InputOption = {
  key: string;
  label: string;
};

export type InputOptionGroup = {
  id: string;
  label: string;
  allowModifiers: boolean;
  options: InputOption[];
};

export type InputOptionSelection = {
  groupId: string;
  optionKey: string;
  modifiers: InputModifierKey[];
};

export const INPUT_MODIFIER_OPTIONS: Array<{
  key: InputModifierKey;
  label: string;
}> = [
  { key: "Control", label: "CTRL" },
  { key: "Alt", label: "ALT" },
  { key: "Shift", label: "SHIFT" },
  { key: "Meta", label: "META" },
];

const LETTER_OPTIONS: InputOption[] = "abcdefghijklmnopqrstuvwxyz"
  .split("")
  .map((key) => ({ key, label: key.toUpperCase() }));

const NUMBER_ROW_OPTIONS: InputOption[] = "0123456789"
  .split("")
  .map((key) => ({ key, label: key }));

const SYMBOL_OPTIONS: InputOption[] = [
  { key: "`", label: "`" },
  { key: "-", label: "-" },
  { key: "=", label: "=" },
  { key: "[", label: "[" },
  { key: "]", label: "]" },
  { key: "\\", label: "\\" },
  { key: ";", label: ";" },
  { key: "'", label: "'" },
  { key: ",", label: "," },
  { key: ".", label: "." },
  { key: "/", label: "/" },
];

const SHIFTED_SYMBOL_OPTIONS: InputOption[] = [
  { key: "!", label: "!" },
  { key: "@", label: "@" },
  { key: "#", label: "#" },
  { key: "$", label: "$" },
  { key: "%", label: "%" },
  { key: "^", label: "^" },
  { key: "&", label: "&" },
  { key: "*", label: "*" },
  { key: "(", label: "(" },
  { key: ")", label: ")" },
  { key: "_", label: "_" },
  { key: "+", label: "+" },
  { key: "{", label: "{" },
  { key: "}", label: "}" },
  { key: "|", label: "|" },
  { key: ":", label: ":" },
  { key: "\"", label: "\"" },
  { key: "<", label: "<" },
  { key: ">", label: ">" },
  { key: "?", label: "?" },
  { key: "~", label: "~" },
];

const CJK_PUNCTUATION_OPTIONS: InputOption[] = [
  { key: "，", label: "，" },
  { key: "。", label: "。" },
  { key: "；", label: "；" },
  { key: "【", label: "【" },
  { key: "】", label: "】" },
  { key: "、", label: "、" },
  { key: "·", label: "·" },
  { key: "？", label: "？" },
  { key: "！", label: "！" },
  { key: "￥", label: "￥" },
  { key: "（", label: "（" },
  { key: "）", label: "）" },
];

const NAVIGATION_OPTIONS: InputOption[] = [
  { key: "Escape", label: "ESCAPE" },
  { key: "Enter", label: "ENTER" },
  { key: "Tab", label: "TAB" },
  { key: "Space", label: "SPACE" },
  { key: "Backspace", label: "BACKSPACE" },
  { key: "Delete", label: "DELETE" },
  { key: "Insert", label: "INSERT" },
  { key: "Home", label: "HOME" },
  { key: "End", label: "END" },
  { key: "PageUp", label: "PAGE UP" },
  { key: "PageDown", label: "PAGE DOWN" },
  { key: "ArrowUp", label: "ARROW UP" },
  { key: "ArrowDown", label: "ARROW DOWN" },
  { key: "ArrowLeft", label: "ARROW LEFT" },
  { key: "ArrowRight", label: "ARROW RIGHT" },
];

const FUNCTION_OPTIONS: InputOption[] = Array.from({ length: 24 }, (_, index) => {
  const key = `F${index + 1}`;
  return { key, label: key };
});

const NUMPAD_OPTIONS: InputOption[] = [
  { key: "Numpad0", label: "NUM 0" },
  { key: "Numpad1", label: "NUM 1" },
  { key: "Numpad2", label: "NUM 2" },
  { key: "Numpad3", label: "NUM 3" },
  { key: "Numpad4", label: "NUM 4" },
  { key: "Numpad5", label: "NUM 5" },
  { key: "Numpad6", label: "NUM 6" },
  { key: "Numpad7", label: "NUM 7" },
  { key: "Numpad8", label: "NUM 8" },
  { key: "Numpad9", label: "NUM 9" },
  { key: "NumpadDivide", label: "NUM /" },
  { key: "NumpadMultiply", label: "NUM *" },
  { key: "NumpadSubtract", label: "NUM -" },
  { key: "NumpadAdd", label: "NUM +" },
  { key: "NumpadDecimal", label: "NUM ." },
  { key: "NumpadEnter", label: "NUM ENTER" },
  { key: "NumpadEqual", label: "NUM =" },
  { key: "NumpadComma", label: "NUM ," },
];

const MOUSE_OPTIONS: InputOption[] = [
  { key: "MouseLeft", label: "Left Mouse" },
  { key: "MouseMiddle", label: "Middle Mouse" },
  { key: "MouseRight", label: "Right Mouse" },
  { key: "MouseBack", label: "Browser Back" },
  { key: "MouseForward", label: "Browser Forward" },
];

const WHEEL_OPTIONS: InputOption[] = [
  { key: "MouseWheelUp", label: "Wheel Up" },
  { key: "MouseWheelDown", label: "Wheel Down" },
  { key: "MouseWheelLeft", label: "Wheel Left" },
  { key: "MouseWheelRight", label: "Wheel Right" },
];

const MEDIA_OPTIONS: InputOption[] = [
  { key: "MediaRewind", label: "Media Rewind" },
  { key: "MediaPlayPause", label: "Media Play/Pause" },
  { key: "MediaFastForward", label: "Media Fast Forward" },
  { key: "MediaVolumeDown", label: "Volume Down" },
  { key: "MediaMute", label: "Mute" },
  { key: "MediaVolumeUp", label: "Volume Up" },
  { key: "MediaPrevious", label: "Media Previous" },
  { key: "MediaNext", label: "Media Next" },
  { key: "MediaStop", label: "Media Stop" },
  { key: "MediaPause", label: "Media Pause" },
];

export const INPUT_OPTION_GROUPS: InputOptionGroup[] = [
  {
    id: "letters",
    label: "Letters",
    allowModifiers: true,
    options: LETTER_OPTIONS,
  },
  {
    id: "number-row",
    label: "Number Row",
    allowModifiers: true,
    options: NUMBER_ROW_OPTIONS,
  },
  {
    id: "symbols",
    label: "Symbols",
    allowModifiers: true,
    options: SYMBOL_OPTIONS,
  },
  {
    id: "shifted-symbols",
    label: "Shifted Symbols",
    allowModifiers: false,
    options: SHIFTED_SYMBOL_OPTIONS,
  },
  {
    id: "cjk-punctuation",
    label: "Chinese Punctuation",
    allowModifiers: false,
    options: CJK_PUNCTUATION_OPTIONS,
  },
  {
    id: "navigation",
    label: "Navigation",
    allowModifiers: true,
    options: NAVIGATION_OPTIONS,
  },
  {
    id: "function",
    label: "Function Keys",
    allowModifiers: true,
    options: FUNCTION_OPTIONS,
  },
  {
    id: "numpad",
    label: "Numpad",
    allowModifiers: true,
    options: NUMPAD_OPTIONS,
  },
  {
    id: "modifiers",
    label: "Modifiers",
    allowModifiers: false,
    options: INPUT_MODIFIER_OPTIONS,
  },
  {
    id: "mouse",
    label: "Mouse Buttons",
    allowModifiers: false,
    options: MOUSE_OPTIONS,
  },
  {
    id: "wheel",
    label: "Mouse Wheel",
    allowModifiers: false,
    options: WHEEL_OPTIONS,
  },
  {
    id: "media",
    label: "Media Keys",
    allowModifiers: false,
    options: MEDIA_OPTIONS,
  },
];

const MODIFIER_LABELS: Record<InputModifierKey, string> = {
  Control: "CTRL",
  Alt: "ALT",
  Shift: "SHIFT",
  Meta: "META",
};

const INPUT_GROUP_BY_ID = new Map(
  INPUT_OPTION_GROUPS.map((group) => [group.id, group])
);

const INPUT_OPTION_BY_KEY = new Map<
  string,
  { group: InputOptionGroup; option: InputOption }
>();

for (const group of INPUT_OPTION_GROUPS) {
  for (const option of group.options) {
    if (!INPUT_OPTION_BY_KEY.has(option.key)) {
      INPUT_OPTION_BY_KEY.set(option.key, { group, option });
    }
  }
}

function splitInputShortcut(shortcut: string) {
  if (shortcut === "+") {
    return ["+"];
  }

  if (shortcut.endsWith("++")) {
    return [...shortcut.split("+").filter(Boolean), "+"];
  }

  return shortcut.split("+").filter(Boolean);
}

function normalizeModifierKey(key: string): InputModifierKey | null {
  if (key === "Ctrl") {
    return "Control";
  }

  return INPUT_MODIFIER_OPTIONS.some((modifier) => modifier.key === key)
    ? (key as InputModifierKey)
    : null;
}

function sortModifiers(modifiers: InputModifierKey[]) {
  const modifierOrder = INPUT_MODIFIER_OPTIONS.map((modifier) => modifier.key);
  return [...new Set(modifiers)].sort(
    (a, b) => modifierOrder.indexOf(a) - modifierOrder.indexOf(b)
  );
}

export function getInputOptionGroup(groupId: string) {
  return INPUT_GROUP_BY_ID.get(groupId) ?? INPUT_OPTION_GROUPS[0];
}

export function getInputOptionByKey(key: string) {
  return INPUT_OPTION_BY_KEY.get(key) ?? null;
}

export function getInputOptionSelection(
  shortcut: string
): InputOptionSelection | null {
  const exactMatch = getInputOptionByKey(shortcut);
  if (exactMatch) {
    return {
      groupId: exactMatch.group.id,
      optionKey: exactMatch.option.key,
      modifiers: [],
    };
  }

  const modifiers: InputModifierKey[] = [];
  const keyParts: string[] = [];

  for (const part of splitInputShortcut(shortcut)) {
    const modifierKey = normalizeModifierKey(part);
    if (modifierKey) {
      modifiers.push(modifierKey);
    } else {
      keyParts.push(part);
    }
  }

  if (keyParts.length !== 1) {
    return null;
  }

  const parsedMatch = getInputOptionByKey(keyParts[0]);
  if (!parsedMatch || !parsedMatch.group.allowModifiers) {
    return null;
  }

  return {
    groupId: parsedMatch.group.id,
    optionKey: parsedMatch.option.key,
    modifiers: sortModifiers(modifiers),
  };
}

export function createInputShortcut(
  groupId: string,
  optionKey: string,
  modifiers: InputModifierKey[] = []
) {
  const group = getInputOptionGroup(groupId);
  const option =
    group.options.find((candidate) => candidate.key === optionKey) ??
    getInputOptionByKey(optionKey)?.option;

  if (!option) {
    return null;
  }

  if (!group.allowModifiers) {
    return {
      key: option.key,
      label: option.label,
    };
  }

  const sortedModifiers = sortModifiers(modifiers);
  const keyParts = [...sortedModifiers, option.key];
  const labelParts = [
    ...sortedModifiers.map((modifier) => MODIFIER_LABELS[modifier]),
    option.label,
  ];

  return {
    key: keyParts.join("+"),
    label: labelParts.join("+"),
  };
}
