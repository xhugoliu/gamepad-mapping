import { useState, useEffect, useCallback } from "react";
import { DEFAULT_DRIFT_THRESHOLD } from "../constants/defaults";

export interface GamepadButton {
  pressed: boolean;
  value: number;
}

export interface GamepadState {
  index: number;
  id: string;
  mapping: string;
  buttons: GamepadButton[];
  axes: number[];
  connected: boolean;
}

const VALUE_EPSILON = 0.001;

function areValuesEqual(a: number, b: number) {
  return Math.abs(a - b) <= VALUE_EPSILON;
}

function areGamepadStatesEqual(
  previousGamepads: GamepadState[],
  nextGamepads: GamepadState[]
) {
  if (previousGamepads.length !== nextGamepads.length) {
    return false;
  }

  return previousGamepads.every((previousGamepad, index) => {
    const nextGamepad = nextGamepads[index];
    if (
      !nextGamepad ||
      previousGamepad.index !== nextGamepad.index ||
      previousGamepad.id !== nextGamepad.id ||
      previousGamepad.mapping !== nextGamepad.mapping ||
      previousGamepad.connected !== nextGamepad.connected ||
      previousGamepad.buttons.length !== nextGamepad.buttons.length ||
      previousGamepad.axes.length !== nextGamepad.axes.length
    ) {
      return false;
    }

    const buttonsEqual = previousGamepad.buttons.every(
      (previousButton, buttonIndex) => {
        const nextButton = nextGamepad.buttons[buttonIndex];
        return (
          previousButton.pressed === nextButton.pressed &&
          areValuesEqual(previousButton.value, nextButton.value)
        );
      }
    );

    if (!buttonsEqual) {
      return false;
    }

    return previousGamepad.axes.every((previousAxis, axisIndex) =>
      areValuesEqual(previousAxis, nextGamepad.axes[axisIndex])
    );
  });
}

export function useGamepad() {
  const [gamepads, setGamepads] = useState<GamepadState[]>([]);

  // Extract gamepad polling logic to avoid duplication
  const pollGamepads = useCallback((): GamepadState[] => {
    const gamepadList = navigator.getGamepads();

    const connectedGamepads: GamepadState[] = [];
    for (let i = 0; i < gamepadList.length; i++) {
      const gamepad = gamepadList[i];
      if (gamepad) {
        connectedGamepads.push({
          index: gamepad.index,
          id: gamepad.id,
          mapping: gamepad.mapping,
          buttons: Array.from(gamepad.buttons).map((btn) => {
            const pressed = btn.pressed || btn.touched;
            return {
              pressed,
              value:
                pressed || Math.abs(btn.value) > DEFAULT_DRIFT_THRESHOLD
                  ? btn.value
                  : 0,
            };
          }),
          axes: Array.from(gamepad.axes).map((axis) =>
            Math.abs(axis) > DEFAULT_DRIFT_THRESHOLD ? axis : 0
          ),
          connected: gamepad.connected,
        });
      }
    }

    return connectedGamepads;
  }, []);

  const publishGamepads = useCallback((nextGamepads: GamepadState[]) => {
    setGamepads((previousGamepads) => {
      if (areGamepadStatesEqual(previousGamepads, nextGamepads)) {
        return previousGamepads;
      }

      return nextGamepads;
    });
  }, []);

  const updateGamepads = useCallback(() => {
    publishGamepads(pollGamepads());
  }, [pollGamepads, publishGamepads]);

  useEffect(() => {
    const handleGamepadConnected = (e: GamepadEvent) => {
      console.log("Gamepad connected:", e.gamepad.id);
      updateGamepads();
    };

    const handleGamepadDisconnected = (e: GamepadEvent) => {
      console.log("Gamepad disconnected:", e.gamepad.id);
      updateGamepads();
    };

    window.addEventListener("gamepadconnected", handleGamepadConnected);
    window.addEventListener("gamepaddisconnected", handleGamepadDisconnected);

    // Listen for gamepad updates from main process (works even when window doesn't have focus)
    const handleGamepadUpdate = (_event: unknown, gamepads: GamepadState[]) => {
      publishGamepads(gamepads);
    };

    // Listen for poll requests from main process
    const handlePollRequest = () => {
      const connectedGamepads = pollGamepads();

      // Send gamepad data to main process
      if (window.ipcRenderer) {
        window.ipcRenderer.send("gamepad-data", connectedGamepads);
      }

      // Main process rebroadcasts this as gamepad-update; keep state writes in one path.
    };

    if (window.ipcRenderer) {
      window.ipcRenderer.on("poll-gamepads", handlePollRequest);
      window.ipcRenderer.on("gamepad-update", handleGamepadUpdate);
    }

    // Also poll locally as fallback when IPC communication is unavailable.
    const intervalId = !window.ipcRenderer
      ? window.setInterval(() => {
          updateGamepads();
        }, 16)
      : undefined;

    return () => {
      window.removeEventListener("gamepadconnected", handleGamepadConnected);
      window.removeEventListener(
        "gamepaddisconnected",
        handleGamepadDisconnected
      );
      if (window.ipcRenderer) {
        window.ipcRenderer.off("poll-gamepads", handlePollRequest);
        window.ipcRenderer.off("gamepad-update", handleGamepadUpdate);
      }
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, [updateGamepads, pollGamepads, publishGamepads]);

  return gamepads;
}
