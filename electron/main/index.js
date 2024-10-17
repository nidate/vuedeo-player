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

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  app,
  protocol,
  BrowserWindow,
  ipcMain,
  Menu,
  dialog,
  shell
} from 'electron';
const isDevelopment = process.env.NODE_ENV !== 'production';
import {
  RESIZE_WINDOW,
  CLOSE_WINDOW,
  OPEN_FILE,
  STORE_DATA,
  OPEN_WINDOW
} from '../../src/events';
import { hashFile } from 'hasha';
import Store from 'electron-store';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.DIST_ELECTRON = path.join(__dirname, '..');
process.env.DIST = path.join(process.env.DIST_ELECTRON, '../dist');
process.env.PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? path.join(process.env.DIST_ELECTRON, '../public')
  : process.env.DIST;
const preload = path.join(__dirname, '../preload/index.js');
const url = process.env.VITE_DEV_SERVER_URL;
const indexHtml = path.join(process.env.DIST, 'index.html');

const store = new Store();

// https://github.com/electron/electron/issues/43415#issuecomment-2407778540
if (process.platform === 'darwin' && process.arch === 'x64') {
  app.disableHardwareAcceleration();
}

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true, stream: true } },
  {
    scheme: 'local-resource',
    privileges: {
      starndard: true,
      secure: false,
      supportFetchAPI: true,
      corsEnabled: true,
      bypassCSP: true,
      stream: true
    }
  }
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
  registerLocalResourceProtocol();
  createMenu();

  if (initOpenFileQueue.length) {
    initOpenFileQueue.forEach((file) => openWindow({ file }));
  } else {
    openWindow();
  }
});

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
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

function getMimeType(url) {
  const extension = path.extname(url).toLowerCase();
  let mimeType = 'video/mp4';
  if (extension === '.mp4') {
    mimeType = 'video/mp4';
  } else if (extension === '.mp3') {
    mimeType = 'audio/mp3';
  }
  return mimeType;
}

function registerLocalResourceProtocol() {
  protocol.registerFileProtocol('local-resource', (request, callback) => {
    const url = request.url.replace(/^local-resource:\/\//, '');
    // Decode URL to prevent errors when loading filenames with UTF-8 chars or chars like "#"
    const decodedUrl = decodeURI(url); // Needed in case URL contains spaces
    const mimeType = getMimeType(decodedUrl);
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
        preload
      }
    });
  }

  if (process.env.VITE_DEV_SERVER_URL) {
    await win.loadURL(url);
    win.webContents.openDevTools();
  } else {
    await win.loadFile(indexHtml);
  }
  if (!file) {
    return win;
  }

  // get file information
  const basename = path.basename(file);
  const hash = await hashFile(file);
  const fileInfo = store.get(hash, {});
  fileInfo.name = basename;
  store.set(hash, fileInfo);

  const mimeType = getMimeType(file);
  win.webContents.send(OPEN_FILE, { file, hash, fileInfo, mimeType });
  win.setTitle(basename);
  win.setRepresentedFilename(file);
  win.setDocumentEdited(true);

  return win;
}

ipcMain.on(RESIZE_WINDOW, (event, { width, height, marginHeight = 0 }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) {
    return;
  }
  win.setSize(width, height + marginHeight);
  win.setAspectRatio(width / height);
});

ipcMain.on(CLOSE_WINDOW, (event) => {
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
          click: function (item, win) {
            openFileDialog(win).then(
              () => {},
              (err) => {
                console.error(err);
              }
            );
          }
        },
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+n',
          click: function () {
            openWindow();
          }
        },
        { role: 'close' },
        { type: 'separator' },
        {
          label: 'Show in Finder',
          accelerator: 'Cmd+Option+Space',
          click: function (item, win) {
            const filename = win.representedFilename;
            if (filename) {
              shell.showItemInFolder(filename);
            }
          }
        },
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
