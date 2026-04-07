const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('printflow', {
  // Config
  getServerUrl:   ()      => ipcRenderer.invoke('config:getServerUrl'),
  setServerUrl:   (url)   => ipcRenderer.invoke('config:setServerUrl', url),
  getTheme:       ()      => ipcRenderer.invoke('config:getTheme'),
  setTheme:       (theme) => ipcRenderer.invoke('config:setTheme', theme),
  getEulaAccepted: ()     => ipcRenderer.invoke('config:getEulaAccepted'),
  setEulaAccepted: ()     => ipcRenderer.invoke('config:setEulaAccepted'),

  // Secure token storage (OS keychain)
  getToken:   ()      => ipcRenderer.invoke('token:get'),
  setToken:   (token) => ipcRenderer.invoke('token:set', token),
  clearToken: ()      => ipcRenderer.invoke('token:clear'),

  // Frameless window controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow:    () => ipcRenderer.send('window:close'),
  isMaximized:    () => ipcRenderer.invoke('window:isMaximized'),

  // Open link in system browser
  openExternal: (url) => ipcRenderer.send('shell:openExternal', url),

  // Platform info
  platform: process.platform,

  // Auto-detect best server (LAN vs Tailscale)
  autoDetectServer: () => ipcRenderer.invoke('server:autoDetect'),

  // Camera popout window
  openCameraPopout: (opts) => ipcRenderer.send('camera:popout', opts),

  // Updates
  checkForUpdates: ()          => ipcRenderer.invoke('updates:check'),
  downloadUpdate:  (url)       => ipcRenderer.invoke('updates:download', url),
  getVersion:      ()          => ipcRenderer.invoke('app:getVersion'),
});
