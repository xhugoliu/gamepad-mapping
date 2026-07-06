import { Button, keyboard, mouse } from "@nut-tree-fork/nut-js";
import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  nativeImage,
  screen,
  shell,
  systemPreferences,
  Tray,
} from "electron";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { getNutKeysForShortcut } from "./keyShortcut";
import { update } from "./update";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const { libnut } = require("@nut-tree-fork/libnut/dist/import_libnut");

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.APP_ROOT = path.join(__dirname, "../..");

export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith("6.1")) app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (process.platform === "win32") app.setAppUserModelId(app.getName());

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

let win: BrowserWindow | null = null;
const preload = path.join(__dirname, "../preload/index.mjs");
const indexHtml = path.join(RENDERER_DIST, "index.html");

function createWindow() {
  win = new BrowserWindow({
    width: 1580,
    height: 960,
    icon: path.join(process.env.VITE_PUBLIC, "icon.png"),
    show: true,
    skipTaskbar: false,
    webPreferences: {
      preload,
      backgroundThrottling: false,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    // #298
    win.loadURL(VITE_DEV_SERVER_URL);
    // Open devTool if the app is not packaged
    // win.webContents.openDevTools();
  } else {
    win.loadFile(indexHtml);
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:")) shell.openExternal(url);
    return { action: "deny" };
  });

  // Auto update
  update(win);
}

// Check and request accessibility permissions on macOS
function checkAccessibilityPermissions() {
  if (process.platform === "darwin") {
    const hasAccess = systemPreferences.isTrustedAccessibilityClient(true);
    if (!hasAccess) {
      console.warn(
        "Accessibility permissions not granted. Please grant accessibility permissions in System Preferences > Security & Privacy > Privacy > Accessibility"
      );
    } else {
      console.log("Accessibility permissions granted");
    }
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

keyboard.config.autoDelayMs = 0;
mouse.config.autoDelayMs = 0;

// Handle mouse movement requests
ipcMain.handle("mouse-move", async (_event, deltaX: number, deltaY: number) => {
  try {
    const currentPos = await mouse.getPosition();

    // Get screen bounds for the display containing the current mouse position
    const display = screen.getDisplayNearestPoint({
      x: currentPos.x,
      y: currentPos.y,
    });
    const bounds = display.bounds;

    // Calculate new position
    let newX = currentPos.x + Math.round(deltaX);
    let newY = currentPos.y + Math.round(deltaY);

    // Clamp to screen boundaries
    newX = Math.max(bounds.x, Math.min(bounds.x + bounds.width - 1, newX));
    newY = Math.max(bounds.y, Math.min(bounds.y + bounds.height - 1, newY));

    // Move mouse to clamped position
    await mouse.setPosition({
      x: newX,
      y: newY,
    });

    return { success: true };
  } catch (error) {
    console.error("Error moving mouse:", error);
    return { success: false, error: String(error) };
  }
});

// Mouse button mapping
const mouseButtonMap: Record<string, Button> = {
  MouseLeft: Button.LEFT,
  MouseRight: Button.RIGHT,
  MouseMiddle: Button.MIDDLE,
};

// Handle mouse button toggle requests
ipcMain.handle(
  "mouse-button-toggle",
  async (_event, button: string, down: boolean) => {
    try {
      const nutButton = mouseButtonMap[button];
      if (nutButton === undefined) {
        console.warn(`Unknown mouse button: ${button}`);
        return { success: false, error: `Unknown mouse button: ${button}` };
      }

      if (down) {
        await mouse.pressButton(nutButton);
      } else {
        await mouse.releaseButton(nutButton);
      }

      return { success: true };
    } catch (error) {
      console.error("Error simulating mouse button:", error);
      return { success: false, error: String(error) };
    }
  }
);

// Handle mouse wheel scrolling requests
ipcMain.handle("mouse-scroll", async (_event, deltaX: number, deltaY: number) => {
  try {
    const stepsX = Math.trunc(deltaX);
    const stepsY = Math.trunc(deltaY);
    if (stepsX === 0 && stepsY === 0) {
      return { success: true };
    }

    // libnut uses positive Y for wheel-up, while the renderer uses
    // positive Y for content-down to match DOM WheelEvent semantics.
    libnut.scrollMouse(stepsX, -stepsY);

    return { success: true };
  } catch (error) {
    console.error("Error scrolling mouse:", error);
    return { success: false, error: String(error) };
  }
});

// Handle key toggle requests
ipcMain.handle("key-toggle", async (_event, key: string, down: boolean) => {
  try {
    const nutKeys = getNutKeysForShortcut(key);
    if (!nutKeys) {
      console.warn(`Unsupported key: ${key}`);
      return { success: false, error: `Unsupported key: ${key}` };
    }

    if (down) {
      await keyboard.pressKey(...nutKeys);
    } else {
      await keyboard.releaseKey(...nutKeys);
    }

    return { success: true };
  } catch (error) {
    console.error("Error simulating key:", error);
    return { success: false, error: String(error) };
  }
});

// Gamepad polling state
let gamepadPollingInterval: NodeJS.Timeout | null = null;

// Start gamepad polling in main process
// This ensures polling continues even when main window doesn't have focus
function startGamepadPolling() {
  if (gamepadPollingInterval) {
    return; // Already polling
  }

  // Poll gamepads from main process
  // Send message to renderer to poll gamepads, which will use navigator.getGamepads()
  // and send the data back to main process for broadcasting
  gamepadPollingInterval = setInterval(() => {
    if (win && !win.isDestroyed()) {
      win.webContents.send("poll-gamepads");
    }
  }, 16); // ~60fps
}

// Listen for gamepad data from renderer
ipcMain.on("gamepad-data", (_event, gamepads) => {
  // Broadcast to all renderers
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send("gamepad-update", gamepads);
  });
});

app.setLoginItemSettings({
  openAtLogin: true,
});


let tray = null;

function createTray() {
  const trayIconPath = path.join(process.env.VITE_PUBLIC, "trayTemplate@2x.png");
  const image = nativeImage.createFromPath(trayIconPath);
  image.setTemplateImage(true);

  tray = new Tray(image);
  image.setTemplateImage(true);

  const loginSettings = app.getLoginItemSettings();

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click: () => { win?.show(); win?.focus(); } },
    {
      label: 'Open at Login',
      type: 'checkbox',
      checked: loginSettings.openAtLogin,
      click: (menuItem) => {
        app.setLoginItemSettings({
          openAtLogin: menuItem.checked,
        });
      },
    },
    {
      label: 'Show in Dock',
      type: 'checkbox',
      checked: app.dock?.isVisible() ?? true,
      visible: process.platform === 'darwin',
      click: (menuItem) => {
        if (menuItem.checked) {
          app.dock?.show();
        } else {
          app.dock?.hide();
        }
      },
    },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },

  ]);

  tray.setToolTip('Gamepad Mapping');
  tray.setContextMenu(contextMenu);
}

app.whenReady().then(() => {
  if (process.platform === "darwin") {
    app.dock?.hide();
  }

  createWindow();
  // Check permissions
  checkAccessibilityPermissions();
  // Start gamepad polling
  startGamepadPolling();

  createTray();
});
