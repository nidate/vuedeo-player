'use strict';

/**
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 **/

import path from 'path';
import { app, protocol, BrowserWindow, ipcMain, Menu, dialog } from 'electron';
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib';
import installExtension, { VUEJS3_DEVTOOLS } from 'electron-devtools-installer';
const isDevelopment = process.env.NODE_ENV !== 'production';
import {
  RESIZE_WINDOW,
  CLOSE_WINDOW,
  OPEN_FILE,
  STORE_DATA,
  OPEN_WINDOW
} from './events';
import hasha from 'hasha';
import Store from 'electron-store';

const store = new Store();

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true, stream: true } }
]);
// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) openWindow();
});

let initOpenFileQueue = [];
app.on('will-finish-launching', () => {
  app.on('open-file', (event, file) => {
    if (app.isReady() === false) {
      initOpenFileQueue.push(file);
    } else {
      openWindow({ file });
    }
    event.preventDefault();
  });
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS3_DEVTOOLS);
    } catch (e) {
      console.error('Vue Devtools failed to install:', e.toString());
    }
  }
  createProtocol('app');
  registerLocalResourceProtocol();
  createMenu();

  if (initOpenFileQueue.length) {
    initOpenFileQueue.forEach(file => openWindow(file));
  } else {
    openWindow();
  }
});

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', data => {
      if (data === 'graceful-exit') {
        app.quit();
      }
    });
  } else {
    process.on('SIGTERM', () => {
      app.quit();
    });
  }
}

function registerLocalResourceProtocol() {
  protocol.registerFileProtocol('local-resource', (request, callback) => {
    const url = request.url.replace(/^local-resource:\/\//, '');
    // Decode URL to prevent errors when loading filenames with UTF-8 chars or chars like "#"
    const decodedUrl = decodeURI(url); // Needed in case URL contains spaces

    const extension = path.extname(decodedUrl).toLowerCase();
    let mimeType = 'video/mp4';
    if (extension === '.mp4') {
      mimeType = 'video/mp4';
    }
    try {
      return callback({ path: decodedUrl, mimeType });
    } catch (error) {
      console.error(
        'ERROR: registerLocalResourceProtocol: Could not get file path:',
        error
      );
    }
  });
}

/**
 * create the browser window and send open event to that window.
 */
async function openWindow({ win, file } = {}) {
  if (!win) {
    win = new BrowserWindow({
      width: 640,
      height: 360,
      backgroundColor: '#cfcfcf',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: path.join(__dirname, 'preload.js')
      }
    });
  }
  if (process.env.WEBPACK_DEV_SERVER_URL && !process.env.IS_TEST) {
    win.webContents.openDevTools({ mode: 'detach' });
  }
  let url = process.env.WEBPACK_DEV_SERVER_URL || 'app://./index.html';
  await win.loadURL(url);
  if (!file) {
    return win;
  }

  // get file information
  const basename = path.basename(file);
  // If you use `hasha.fromFile`, Electron 11 will crash on the process exit.
  // Electron 11 has a problem on exiting when the `worker_threads` used, and hasha.fromFile uses it.
  // https://github.com/electron/electron/issues/23315
  const hash = hasha.fromFileSync(file);
  const fileInfo = store.get(hash, {});
  fileInfo.name = basename;
  store.set(hash, fileInfo);

  win.webContents.send(OPEN_FILE, { file, hash, fileInfo });
  win.setTitle(basename);
  win.setRepresentedFilename(file);
  win.setDocumentEdited(true);

  return win;
}

ipcMain.on(RESIZE_WINDOW, (event, { width, height, merginHeight = 0 }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) {
    return;
  }
  win.setSize(width, height + merginHeight);
  win.setAspectRatio(width / height);
});

ipcMain.on(CLOSE_WINDOW, event => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) {
    return;
  }
  win.close();
});

ipcMain.on(STORE_DATA, (event, { hash, key, value }) => {
  store.set(`${hash}.${key}`, value);
});

ipcMain.on(OPEN_WINDOW, (event, { files }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  openFiles({ win, files });
});

function createMenu() {
  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Preference',
          accelerator: 'CmdOrCtrl+,'
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'Open',
          accelerator: 'CmdOrCtrl+o',
          click: function(item, win) {
            openFileDialog(win).then(
              () => {},
              err => {
                console.error(err);
              }
            );
          }
        },
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+n',
          click: function() {
            openWindow();
          }
        },
        { role: 'close' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        {
          role: 'hide'
        },
        {
          role: 'zoom'
        },
        { type: 'separator' }
        // todo 開いているウィンドウ
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * open file dialog and open window
 */
async function openFileDialog(win) {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openFile', 'multiSelections']
  });
  if (canceled) {
    return;
  }
  openFiles({ win, files: filePaths });
}

function openFiles({ win, files }) {
  for (let i = 0; i < files.length; i++) {
    if (win && i == 0) {
      openWindow({ win, file: files[i] });
      continue;
    }
    openWindow({ file: files[i] });
  }
}
