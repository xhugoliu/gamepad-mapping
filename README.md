# Gamepad Mapping

[简体中文](README.zh-CN.md) | English

Gamepad Mapping is a macOS desktop app for turning gamepad controls into
keyboard, mouse, wheel, media, layer, combo, and tap-hold actions. The mapping
editor is dropdown-based, so hard-to-record keys such as symbols, numpad keys,
high function keys, media controls, and mouse browser buttons can be configured
directly.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-macOS-lightgrey.svg)

## Features

- Button, D-pad, and stick-button mappings.
- Analog stick modes:
  - 8-direction hotkeys with threshold and configurable angle gap between
    neighboring directions.
  - Mouse control with sensitivity, acceleration, and axis inversion.
  - Scroll control with sensitivity up to 30, acceleration, and axis inversion.
- Layered mappings inspired by keyboard firmware:
  - Per-device layer list with add/select controls.
  - Isolated layers: unmapped controls on one layer do not fall through to lower
    layers.
  - Layer actions are first-class categories: `MO(layer)`, `TG(layer)`,
    `TO(layer)`, and `DF(layer)`.
- Combo mappings with a configurable combo term.
- Tap-hold actions:
  - `Mod-Tap - MT(mod, key)`.
  - `Layer-Tap - LT(layer, key)`.
  - Configurable tapping term.
- Dropdown input catalog:
  - Letters, number row, symbols, shifted symbols, Chinese punctuation,
    navigation keys, `F1`-`F24`, numpad keys, modifiers, mouse buttons, mouse
    wheel, and media keys.
  - Optional `CTRL`, `ALT`, `SHIFT`, and `META` modifiers where the selected
    input category supports them.
  - Mouse button 4/5 are exposed as Browser Back and Browser Forward.
- Visual controller UI with live button/stick state.
- Multiple connected gamepads.
- Local persistence through browser storage.
- Electron auto-update support.

## Usage

1. Connect a gamepad and press any button so the app can detect it.
2. Select the gamepad from the device list.
3. Choose the target layer from the layer toolbar, or add a new layer.
4. Click a controller button, stick, or D-pad control in the visual controller.
5. In the mapping panel, choose a category from the dropdown:
   - Input categories such as Letters, Symbols, Navigation, Numpad, Mouse
     Buttons, Mouse Wheel, and Media Keys.
   - Layer categories such as `Momentary - MO(layer)` and `Toggle - TG(layer)`.
   - Tap-hold categories such as `Mod-Tap - MT(mod, key)` and
     `Layer-Tap - LT(layer, key)`.
6. Configure the remaining fields, then press `Apply Changes`.

Use `Revert Changes` to discard pending edits, and `Remove Mapping` to clear an
existing mapping.

## Stick Modes

Each analog stick can be configured independently.

- `8 Directions (Hotkeys)` maps directional sectors to actions. Threshold
  controls when the stick becomes active, and angle gap reserves space between
  neighboring directions to reduce accidental adjacent triggers.
- `Mouse Control` turns the stick into cursor movement.
- `Scroll Control` turns the stick into wheel movement.

Mouse and scroll modes expose speed, acceleration, deadzone, and inversion
settings.

## Advanced Actions

Layer actions:

- `MO(layer)`: momentarily activates a layer while held.
- `TG(layer)`: toggles a layer on or off.
- `TO(layer)`: switches to a layer.
- `DF(layer)`: sets the default layer.

Tap-hold actions:

- `MT(mod, key)`: tap sends the key; hold sends the modifier.
- `LT(layer, key)`: tap sends the key; hold momentarily activates the layer.

Combos:

- Select two or more gamepad inputs.
- Choose the combo output from the same mapping action editor.
- Tune the combo term to control the allowed press window.

## Development

This repository includes a `yarn.lock`, so `yarn` is the preferred package
manager for day-to-day development.

```bash
# Clone the fork used for current development
git clone https://github.com/xhugoliu/gamepad-mapping.git
cd gamepad-mapping

# Install dependencies
yarn install

# Run the Electron/Vite dev environment
yarn dev
```

Useful commands:

```bash
yarn test
yarn build
```

On macOS, simulated keyboard and mouse output may require granting the app or
terminal Accessibility/Input Monitoring permissions in System Settings.

## Tech Stack

- React 19 + TypeScript
- Electron 39
- Vite 7
- `@nut-tree-fork/nut-js` for input simulation
- `electron-updater` for app updates
- Vitest and Playwright for verification
- PostCSS/Tailwind toolchain plus app-specific CSS

## Project Structure

```text
electron/            Electron main process and preload scripts
src/components/      React UI components
src/constants/       Input catalogs, controller mappings, and defaults
src/hooks/           Gamepad polling and mapping persistence
src/types/           Mapping action data structures
src/utils/           Shortcut, combo, and stick direction helpers
test/                Unit tests
public/              Static assets
release/             Built application artifacts
```

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for
details.

## Acknowledgments

Originally based on the upstream
[humbertogontijo/gamepad-mapping](https://github.com/humbertogontijo/gamepad-mapping)
project and the Electron/Vite React template.
