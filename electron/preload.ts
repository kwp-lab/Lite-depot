import { ipcRenderer, contextBridge } from 'electron';

// Expose electron APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  logError: (message: string) => ipcRenderer.invoke('log-error', message),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
});

declare global {
  interface Window {
    electronAPI: {
      logError: (message: string) => Promise<unknown>;
      getUserDataPath: () => Promise<unknown>;
    };
  }
}
