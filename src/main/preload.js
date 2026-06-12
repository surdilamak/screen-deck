const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('deck', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (cfg) => ipcRenderer.invoke('config:save', cfg),
  runAction: (action) => ipcRenderer.invoke('action:run', action),
  listDisplays: () => ipcRenderer.invoke('displays:list'),
  listApps: () => ipcRenderer.invoke('apps:list'),
  getAppIcon: (p) => ipcRenderer.invoke('apps:icon', p),
  pickPath: () => ipcRenderer.invoke('dialog:pickPath'),
  pickAudio: () => ipcRenderer.invoke('dialog:pickAudio'),
  getStats: () => ipcRenderer.invoke('sys:stats'),
  getStartup: () => ipcRenderer.invoke('startup:get'),
  setStartup: (on) => ipcRenderer.invoke('startup:set', on),
  onFullscreen: (cb) => ipcRenderer.on('deck:fullscreen', (_e, on) => cb(!!on)),
  onUpdateStatus: (cb) => ipcRenderer.on('update:status', (_e, msg) => cb(msg)),
  moveToDisplay: (id) => ipcRenderer.invoke('window:moveToDisplay', id),
  setFullscreen: (on) => ipcRenderer.invoke('window:setFullscreen', on),
  toggleFullscreen: () => ipcRenderer.invoke('window:toggleFullscreen'),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  quit: () => ipcRenderer.invoke('app:quit'),
  getVersion: () => ipcRenderer.invoke('app:version'),
});
