const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('deck', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (cfg) => ipcRenderer.invoke('config:save', cfg),
  runAction: (action) => ipcRenderer.invoke('action:run', action),
  listDisplays: () => ipcRenderer.invoke('displays:list'),
  listApps: () => ipcRenderer.invoke('apps:list'),
  getAppIcon: (p) => ipcRenderer.invoke('apps:icon', p),
  pickPath: () => ipcRenderer.invoke('dialog:pickPath'),
  onFullscreen: (cb) => ipcRenderer.on('deck:fullscreen', (_e, on) => cb(!!on)),
  moveToDisplay: (id) => ipcRenderer.invoke('window:moveToDisplay', id),
  setFullscreen: (on) => ipcRenderer.invoke('window:setFullscreen', on),
  toggleFullscreen: () => ipcRenderer.invoke('window:toggleFullscreen'),
  quit: () => ipcRenderer.invoke('app:quit'),
});
