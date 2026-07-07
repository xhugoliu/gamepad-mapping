import type { ComboInput } from "../hooks/useGamepadMapping";
import type { GamepadState } from "../hooks/useGamepad";
import {
  DEFAULT_COMBO_TERM_MS,
  DEFAULT_STICK_DIRECTION_GAP_DEGREES,
  DEFAULT_STICK_THRESHOLD,
  MAX_COMBO_TERM_MS,
  MIN_COMBO_TERM_MS,
} from "../constants/defaults";
import {
  getDpadDirection,
  getStickAxes,
  getStickDirection,
} from "./stickDirection";

export function normalizeComboTermMs(termMs?: number) {
  if (typeof termMs !== "number" || !Number.isFinite(termMs)) {
    return DEFAULT_COMBO_TERM_MS;
  }

  return Math.min(
    MAX_COMBO_TERM_MS,
    Math.max(MIN_COMBO_TERM_MS, Math.round(termMs))
  );
}

export function getComboStateKey(gamepadIndex: number, comboId: string) {
  return `gamepad-${gamepadIndex}-combo-${comboId}`;
}

export function getComboInputStateKey(
  gamepadIndex: number,
  input: ComboInput
) {
  if (input.type === "button") {
    return `gamepad-${gamepadIndex}-button-${input.buttonIndex}`;
  }

  if (input.type === "dpad") {
    return `gamepad-${gamepadIndex}-dpad-${input.direction}`;
  }

  return `gamepad-${gamepadIndex}-axis-${input.stickIndex}-${input.direction}`;
}

export function areComboInputsEqual(
  previousInput: ComboInput,
  nextInput: ComboInput
) {
  if (previousInput.type !== nextInput.type) {
    return false;
  }

  if (previousInput.type === "button" && nextInput.type === "button") {
    return previousInput.buttonIndex === nextInput.buttonIndex;
  }

  if (previousInput.type === "dpad" && nextInput.type === "dpad") {
    return previousInput.direction === nextInput.direction;
  }

  if (previousInput.type === "axis" && nextInput.type === "axis") {
    return (
      previousInput.stickIndex === nextInput.stickIndex &&
      previousInput.direction === nextInput.direction
    );
  }

  return false;
}

export function dedupeComboInputs(inputs: ComboInput[]) {
  return inputs.reduce<ComboInput[]>((uniqueInputs, input) => {
    if (
      !uniqueInputs.some((uniqueInput) => areComboInputsEqual(uniqueInput, input))
    ) {
      uniqueInputs.push(input);
    }

    return uniqueInputs;
  }, []);
}

export function isComboInputPressed(gamepad: GamepadState, input: ComboInput) {
  if (input.type === "button") {
    return gamepad.buttons[input.buttonIndex]?.pressed ?? false;
  }

  if (input.type === "dpad") {
    return getDpadDirection(gamepad.buttons) === input.direction;
  }

  const { axisXIndex, axisYIndex } = getStickAxes(input.stickIndex);
  return (
    getStickDirection(
      gamepad.axes[axisXIndex] || 0,
      gamepad.axes[axisYIndex] || 0,
      input.threshold ?? DEFAULT_STICK_THRESHOLD,
      input.directionGapDegrees ?? DEFAULT_STICK_DIRECTION_GAP_DEGREES
    ) === input.direction
  );
}

export function isComboReady(
  inputStateKeys: string[],
  inputPressedAt: Map<string, number>,
  termMs: number,
  wasActive: boolean
) {
  const pressedAtTimes = inputStateKeys.map((stateKey) =>
    inputPressedAt.get(stateKey)
  );

  if (pressedAtTimes.some((pressedAt) => pressedAt === undefined)) {
    return false;
  }

  if (wasActive) {
    return true;
  }

  const firstPressedAt = Math.min(...(pressedAtTimes as number[]));
  const lastPressedAt = Math.max(...(pressedAtTimes as number[]));
  return lastPressedAt - firstPressedAt <= normalizeComboTermMs(termMs);
}
