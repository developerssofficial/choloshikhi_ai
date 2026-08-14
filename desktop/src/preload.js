const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Window controls
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),
  isMaximized: () => ipcRenderer.invoke("window-is-maximized"),
  onMaximizeChange: (callback) => {
    ipcRenderer.on("window-maximize-change", (_event, isMaximized) => callback(isMaximized));
  },

  // Auth (Electron OAuth popup flow)
  isElectron: true,
  electronLogin: (authUrl) => ipcRenderer.invoke("electron-login", authUrl),
  electronLogout: () => ipcRenderer.invoke("electron-logout"),
  onAuthCallback: (callback) => {
    ipcRenderer.on("auth-callback", (_event, data) => callback(data));
  },
});
