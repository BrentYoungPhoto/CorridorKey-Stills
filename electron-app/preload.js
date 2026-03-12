/**
 * Preload script — exposes a safe API to the renderer via contextBridge.
 */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("corridorKey", {
  // Backend URL
  getBackendUrl: () => ipcRenderer.invoke("get-backend-url"),

  // File dialogs
  openFileDialog: (options) => ipcRenderer.invoke("open-file-dialog", options),
  saveFileDialog: (options) => ipcRenderer.invoke("save-file-dialog", options),

  // Backend status events
  onBackendStatus: (callback) => {
    ipcRenderer.on("backend-status", (event, status) => callback(status));
  },
});
