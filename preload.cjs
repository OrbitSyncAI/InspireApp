const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('InspireUpdater', {
  downloadAndInstall(payload) {
    return ipcRenderer.invoke('inspire-download-update', payload);
  },
});
