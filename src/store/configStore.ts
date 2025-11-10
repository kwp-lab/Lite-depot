import { create } from 'zustand';
import { AppConfig } from '../types';
import { db } from '../db';

interface ConfigState {
  config: Partial<AppConfig>;
  isConfigured: boolean;
  loadConfig: () => Promise<void>;
  saveConfig: (config: Partial<AppConfig>) => Promise<void>;
  updateConfig: (key: keyof AppConfig, value: string | number | boolean | null | undefined) => Promise<void>;
  clearConfig: () => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: {},
  isConfigured: false,

  loadConfig: async () => {
    try {
      const configItems = await db.system_config.toArray();
      const config: Partial<AppConfig> = {};
      
      configItems.forEach(item => {
        config[item.key as keyof AppConfig] = item.value;
      });
      
      const isConfigured = !!(
        config.api_key &&
        config.base_id &&
        config.table_id &&
        config.employee_id
      );
      
      set({ config, isConfigured });
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  },

  saveConfig: async (newConfig: Partial<AppConfig>) => {
    try {
      const entries = Object.entries(newConfig);
      
      for (const [key, value] of entries) {
        await db.system_config.put({ key, value });
      }
      
      const config = { ...get().config, ...newConfig };
      const isConfigured = !!(
        config.api_key &&
        config.base_id &&
        config.table_id &&
        config.employee_id
      );
      
      set({ config, isConfigured });
    } catch (error) {
      console.error('Failed to save config:', error);
      throw error;
    }
  },

  updateConfig: async (key: keyof AppConfig, value: string | number | boolean | null | undefined) => {
    await get().saveConfig({ [key]: value });
  },

  clearConfig: async () => {
    try {
      await db.system_config.clear();
      set({ config: {}, isConfigured: false });
    } catch (error) {
      console.error('Failed to clear config:', error);
    }
  },
}));
