// Global type declarations for Electron API
export {};

declare global {
  interface Window {
    electronAPI: {
      logError: (message: string) => Promise<{ success: boolean }>;
      getUserDataPath: () => Promise<string>;
    };
  }
}
