'use strict';

import path from 'path';
import { app, protocol, BrowserWindow, ipcMain, Menu, dialog } from 'electron';
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib';
import installExtension, { VUEJS3_DEVTOOLS } from 'electron-devtools-installer';
const isDevelopment = process.env.NODE_ENV !== 'production';

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
  openWindow();
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

async function openWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    backgroundColor: '#cfcfcf',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  if (process.env.WEBPACK_DEV_SERVER_URL) {
    await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL);
    if (!process.env.IS_TEST) win.webContents.openDevTools({ mode: 'detach' });
  } else {
    // todo handle video file
    win.loadURL('app://./index.html');
  }
}

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
            openFile(win);
          }
        },
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+n',
          click: function(item, win) {
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

ipcMain.on('loaded-data', function(event, params) {
  //console.log(event);
  //console.log(ratio);
});

function openFile(win) {
  dialog
    .showOpenDialog(win)
    .then(({ canceled, filePaths }) => {
      if (canceled) {
        return;
      }
      // fixme イベントを定数に
      win.webContents.send('open-file', filePaths);
    })
    .catch(err => {
      console.error(err);
    });
}
