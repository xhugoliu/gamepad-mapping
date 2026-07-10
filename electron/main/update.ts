import electron from 'electron'
import { createRequire } from 'node:module'
import type {
  AppUpdater,
  ProgressInfo,
  UpdateDownloadedEvent,
  UpdateInfo,
} from 'electron-updater'

const { app, ipcMain } = electron
const require = createRequire(import.meta.url)

let handlersRegistered = false;
let autoUpdater: AppUpdater | null = null;

function getAutoUpdater() {
  if (!autoUpdater) {
    autoUpdater = require('electron-updater').autoUpdater as AppUpdater
  }

  return autoUpdater
}

export function update(win: Electron.BrowserWindow) {
  const updater = getAutoUpdater()

  // When set to false, the update download will be triggered through the API
  updater.autoDownload = false
  updater.disableWebInstaller = false
  updater.allowDowngrade = false

  // start check
  updater.on('checking-for-update', function () { })
  // update available
  updater.on('update-available', (arg: UpdateInfo) => {
    win.webContents.send('update-can-available', { update: true, version: app.getVersion(), newVersion: arg?.version })
  })
  // update not available
  updater.on('update-not-available', (arg: UpdateInfo) => {
    win.webContents.send('update-can-available', { update: false, version: app.getVersion(), newVersion: arg?.version })
  })

  // Only register IPC handlers once
  if (!handlersRegistered) {
    // Checking for updates
    ipcMain.handle('check-update', async () => {
      if (!app.isPackaged) {
        const error = new Error('The update feature is only available after the package.')
        return { message: error.message, error }
      }

      try {
        return await getAutoUpdater().checkForUpdatesAndNotify()
      } catch (error) {
        return { message: 'Network error', error }
      }
    })

    // Start downloading and feedback on progress
    ipcMain.handle('start-download', (event: Electron.IpcMainInvokeEvent) => {
      startDownload(
        (error, progressInfo) => {
          if (error) {
            // feedback download error message
            event.sender.send('update-error', { message: error.message, error })
          } else {
            // feedback update progress message
            event.sender.send('download-progress', progressInfo)
          }
        },
        () => {
          // feedback update downloaded message
          event.sender.send('update-downloaded')
        }
      )
    })

    // Install now
    ipcMain.handle('quit-and-install', () => {
      getAutoUpdater().quitAndInstall(false, true)
    })

    handlersRegistered = true;
  }
}

function startDownload(
  callback: (error: Error | null, info: ProgressInfo | null) => void,
  complete: (event: UpdateDownloadedEvent) => void,
) {
  const updater = getAutoUpdater()

  updater.on('download-progress', (info: ProgressInfo) => callback(null, info))
  updater.on('error', (error: Error) => callback(error, null))
  updater.on('update-downloaded', complete)
  updater.downloadUpdate()
}
