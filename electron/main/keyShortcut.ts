import { Key } from "@nut-tree-fork/nut-js";

const SPECIAL_KEY_MAP: Record<string, Key> = {
  Alt: Key.LeftAlt,
  Backspace: Key.Backspace,
  Control: Key.LeftControl,
  Ctrl: Key.LeftControl,
  Delete: Key.Delete,
  End: Key.End,
  Enter: Key.Enter,
  Escape: Key.Escape,
  F1: Key.F1,
  F10: Key.F10,
  F11: Key.F11,
  F12: Key.F12,
  F2: Key.F2,
  F3: Key.F3,
  F4: Key.F4,
  F5: Key.F5,
  F6: Key.F6,
  F7: Key.F7,
  F8: Key.F8,
  F9: Key.F9,
  Home: Key.Home,
  Insert: Key.Insert,
  Meta: Key.LeftSuper,
  PageDown: Key.PageDown,
  PageUp: Key.PageUp,
  Shift: Key.LeftShift,
  Space: Key.Space,
  Tab: Key.Tab,
  ArrowDown: Key.Down,
  ArrowLeft: Key.Left,
  ArrowRight: Key.Right,
  ArrowUp: Key.Up,
};

const ALIAS_KEY_MAP: Record<string, Key> = {
  Backquote: Key.Grave,
  Backslash: Key.Backslash,
  BracketLeft: Key.LeftBracket,
  BracketRight: Key.RightBracket,
  Comma: Key.Comma,
  Equal: Key.Equal,
  Minus: Key.Minus,
  Period: Key.Period,
  Quote: Key.Quote,
  Semicolon: Key.Semicolon,
  Slash: Key.Slash,
  Numpad0: Key.NumPad0,
  Numpad1: Key.NumPad1,
  Numpad2: Key.NumPad2,
  Numpad3: Key.NumPad3,
  Numpad4: Key.NumPad4,
  Numpad5: Key.NumPad5,
  Numpad6: Key.NumPad6,
  Numpad7: Key.NumPad7,
  Numpad8: Key.NumPad8,
  Numpad9: Key.NumPad9,
  NumpadAdd: Key.Add,
  NumpadDecimal: Key.Decimal,
  NumpadDivide: Key.Divide,
  NumpadEqual: Key.NumPadEqual,
  NumpadMultiply: Key.Multiply,
  NumpadSubtract: Key.Subtract,
};

const UNSHIFTED_CHARACTER_KEY_MAP: Record<string, Key> = {
  a: Key.A,
  b: Key.B,
  c: Key.C,
  d: Key.D,
  e: Key.E,
  f: Key.F,
  g: Key.G,
  h: Key.H,
  i: Key.I,
  j: Key.J,
  k: Key.K,
  l: Key.L,
  m: Key.M,
  n: Key.N,
  o: Key.O,
  p: Key.P,
  q: Key.Q,
  r: Key.R,
  s: Key.S,
  t: Key.T,
  u: Key.U,
  v: Key.V,
  w: Key.W,
  x: Key.X,
  y: Key.Y,
  z: Key.Z,
  "0": Key.Num0,
  "1": Key.Num1,
  "2": Key.Num2,
  "3": Key.Num3,
  "4": Key.Num4,
  "5": Key.Num5,
  "6": Key.Num6,
  "7": Key.Num7,
  "8": Key.Num8,
  "9": Key.Num9,
  "-": Key.Minus,
  "=": Key.Equal,
  "[": Key.LeftBracket,
  "]": Key.RightBracket,
  "\\": Key.Backslash,
  ";": Key.Semicolon,
  "'": Key.Quote,
  ",": Key.Comma,
  ".": Key.Period,
  "/": Key.Slash,
  "`": Key.Grave,
};

const SHIFTED_CHARACTER_KEY_MAP: Record<string, Key> = {
  "!": Key.Num1,
  "@": Key.Num2,
  "#": Key.Num3,
  $: Key.Num4,
  "%": Key.Num5,
  "^": Key.Num6,
  "&": Key.Num7,
  "*": Key.Num8,
  "(": Key.Num9,
  ")": Key.Num0,
  _: Key.Minus,
  "+": Key.Equal,
  "{": Key.LeftBracket,
  "}": Key.RightBracket,
  "|": Key.Backslash,
  ":": Key.Semicolon,
  "\"": Key.Quote,
  "<": Key.Comma,
  ">": Key.Period,
  "?": Key.Slash,
  "~": Key.Grave,
};

const IME_UNSHIFTED_CHARACTER_KEY_MAP: Record<string, Key> = {
  "·": Key.Grave,
  "、": Key.Backslash,
  "。": Key.Period,
  "【": Key.LeftBracket,
  "】": Key.RightBracket,
  "；": Key.Semicolon,
  "，": Key.Comma,
};

const IME_SHIFTED_CHARACTER_KEY_MAP: Record<string, Key> = {
  "！": Key.Num1,
  "＠": Key.Num2,
  "＃": Key.Num3,
  "￥": Key.Num4,
  "％": Key.Num5,
  "……": Key.Num6,
  "＆": Key.Num7,
  "＊": Key.Num8,
  "（": Key.Num9,
  "）": Key.Num0,
  "——": Key.Minus,
  "＋": Key.Equal,
  "｛": Key.LeftBracket,
  "｝": Key.RightBracket,
  "｜": Key.Backslash,
  "：": Key.Semicolon,
  "“": Key.Quote,
  "”": Key.Quote,
  "《": Key.Comma,
  "》": Key.Period,
  "？": Key.Slash,
  "～": Key.Grave,
};

function splitShortcut(shortcut: string) {
  if (shortcut === "+") {
    return ["+"];
  }

  if (shortcut.endsWith("++")) {
    return [...shortcut.split("+").filter(Boolean), "+"];
  }

  return shortcut.split("+").filter(Boolean);
}

function appendUnique(keys: Key[], nextKeys: Key[]) {
  nextKeys.forEach((key) => {
    if (!keys.includes(key)) {
      keys.push(key);
    }
  });
}

export function getNutKeysForKeyName(keyName: string): Key[] | null {
  if (SPECIAL_KEY_MAP[keyName] !== undefined) {
    return [SPECIAL_KEY_MAP[keyName]];
  }

  if (ALIAS_KEY_MAP[keyName] !== undefined) {
    return [ALIAS_KEY_MAP[keyName]];
  }

  if (/^[A-Z]$/.test(keyName)) {
    return [Key.LeftShift, UNSHIFTED_CHARACTER_KEY_MAP[keyName.toLowerCase()]];
  }

  if (UNSHIFTED_CHARACTER_KEY_MAP[keyName] !== undefined) {
    return [UNSHIFTED_CHARACTER_KEY_MAP[keyName]];
  }

  if (SHIFTED_CHARACTER_KEY_MAP[keyName] !== undefined) {
    return [Key.LeftShift, SHIFTED_CHARACTER_KEY_MAP[keyName]];
  }

  if (IME_UNSHIFTED_CHARACTER_KEY_MAP[keyName] !== undefined) {
    return [IME_UNSHIFTED_CHARACTER_KEY_MAP[keyName]];
  }

  if (IME_SHIFTED_CHARACTER_KEY_MAP[keyName] !== undefined) {
    return [Key.LeftShift, IME_SHIFTED_CHARACTER_KEY_MAP[keyName]];
  }

  return null;
}

export function getNutKeysForShortcut(shortcut: string): Key[] | null {
  const keyNames = splitShortcut(shortcut);
  if (keyNames.length === 0) {
    return null;
  }

  const keys: Key[] = [];
  for (const keyName of keyNames) {
    const nextKeys = getNutKeysForKeyName(keyName);
    if (!nextKeys) {
      return null;
    }
    appendUnique(keys, nextKeys);
  }

  return keys;
}
