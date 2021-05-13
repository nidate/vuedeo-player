const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  changeAspect: aspectRatio => {
    ipcRenderer.send('aspect-changed', aspectRatio);
  }
});
