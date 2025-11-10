import { ipcRenderer } from 'electron';

// Expose electron APIs to the renderer process
window.electronAPI = {
  logError: (message: string) => ipcRenderer.invoke('log-error', message),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
};
