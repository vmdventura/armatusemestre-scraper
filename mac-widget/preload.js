const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('claudeAPI', {
  getUsageData:   () => ipcRenderer.invoke('get-usage-data'),
  getTheme:       () => ipcRenderer.invoke('get-theme'),
  closeWindow:    () => ipcRenderer.send('close-window'),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
});
