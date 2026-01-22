const { contextBridge, ipcRenderer, webUtils } = require('electron');
import { OPEN_WINDOW, SET_WINDOW_TITLE } from '../../src/events';

contextBridge.exposeInMainWorld('electron', {
  send: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  /**
   * @param files FileList の配列
   */
  openWindow: ({ files }) => {
    // https://www.electronjs.org/docs/latest/breaking-changes#removed-filepath
    const filePath = files.map((f) => webUtils.getPathForFile(f));
    ipcRenderer.send(OPEN_WINDOW, { files: filePath });
  },
  setWindowTitle: ({ file, name }) => {
    ipcRenderer.send(SET_WINDOW_TITLE, { file, name });
  },
  on: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  }
});
