import { create } from 'zustand';
import { AppConfig } from '../types';
import { db, dbHelpers } from '../db';

interface ConfigState {
  config: Partial<AppConfig>;
  isConfigured: boolean;
  isLoading: boolean;
  loadConfig: () => Promise<void>;
  saveConfig: (config: Partial<AppConfig>) => Promise<void>;
  updateConfig: (key: keyof AppConfig, value: string | number | boolean | null | undefined) => Promise<void>;
  clearConfig: () => Promise<void>;
}

/**
 * 系统配置存储 (ConfigStore)
 * Based on Technical Specification Section 7.1
 * 
 * 存储内容：
 * - 云服务提供者类型 (cloud_provider)
 * - 云服务相关配置 (API Key, Base ID, Table ID 等)
 * - 扫码设置
 * - 工号
 * - 状态字段名（用户定义）
 * - UI 配置（主题、全屏模式等）
 * 
 * 持久化：
 * - SetupPage 填写的初始配置保存至 IndexedDB
 * - SettingsPage 修改的设置保存至 IndexedDB
 * - 应用启动时从 IndexedDB 加载配置
 */
export const useConfigStore = create<ConfigState>((set, get) => ({
  config: {},
  isConfigured: false,
  isLoading: false,

  /**
   * 从 IndexedDB 加载配置
   * 在应用启动时调用，恢复用户之前保存的配置
   */
  loadConfig: async () => {
    try {
      set({ isLoading: true });
      
      // 从 IndexedDB 加载所有配置项
      const configItems = await db.system_config.toArray();
      const config: Partial<AppConfig> = {};
      
      configItems.forEach(item => {
        if (item.value !== null && item.value !== undefined) {
          config[item.key as keyof AppConfig] = item.value as never;
        }
      });
      
      // 检查是否已完成初始配置（必需字段都已填写）
      const isConfigured = !!(
        config.api_key &&
        config.base_id &&
        config.table_id &&
        config.employee_id
      );
      
      set({ config, isConfigured, isLoading: false });
    } catch (error) {
      console.error('Failed to load config:', error);
      set({ isLoading: false });
    }
  },

  /**
   * 保存配置到 IndexedDB
   * 在 SetupPage 和 SettingsPage 中调用
   * 支持部分更新和完整配置保存
   */
  saveConfig: async (newConfig: Partial<AppConfig>) => {
    try {
      const entries = Object.entries(newConfig);
      
      // 批量保存配置项到 IndexedDB
      for (const [key, value] of entries) {
        await db.system_config.put({ key, value });
      }
      
      // 更新内存中的配置
      const config = { ...get().config, ...newConfig };
      
      // 检查是否已完成初始配置
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

  /**
   * 更新单个配置项
   * 便捷方法，用于更新单个配置值
   */
  updateConfig: async (key: keyof AppConfig, value: string | number | boolean | null | undefined) => {
    await get().saveConfig({ [key]: value });
  },

  /**
   * 清除所有配置
   * 用于重置应用状态，清除所有存储的配置信息
   */
  clearConfig: async () => {
    try {
      await db.system_config.clear();
      set({ config: {}, isConfigured: false });
    } catch (error) {
      console.error('Failed to clear config:', error);
    }
  },
}));
