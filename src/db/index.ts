import Dexie, { Table } from 'dexie';
import { Device, SystemConfig } from '../types';

/**
 * IndexedDB Database Schema
 * Based on Technical Specification Section 5 (数据存储设计)
 * 
 * Tables:
 * - devices: 从云端同步的设备列表（以远端为准）
 * - system_config: 系统配置存储
 */
export class InventoryDatabase extends Dexie {
  devices!: Table<Device, string>;
  system_config!: Table<SystemConfig, string>;

  constructor() {
    super('inventory_client_db');
    
    // Version 1 Schema
    this.version(1).stores({
      // devices 表
      // 索引: id (primary), device_id (用于扫码快速查找), updated_at
      devices: 'id, device_id, updated_at',
      
      // system_config 表
      // 索引: key (primary)
      // 存储内容：云服务提供者、工号、API Key、Base/Table/View ID、状态字段名、扫码配置、UI配置
      system_config: 'key',
    });
  }
}

export const db = new InventoryDatabase();

// Export helper functions for common operations
export const dbHelpers = {
  /**
   * 保存单个配置项
   */
  async setConfig(key: string, value: any): Promise<void> {
    await db.system_config.put({ key, value });
  },

  /**
   * 获取单个配置项
   */
  async getConfig(key: string): Promise<any | undefined> {
    const item = await db.system_config.get(key);
    return item?.value;
  },

  /**
   * 批量保存配置
   */
  async setConfigs(configs: Record<string, any>): Promise<void> {
    const items = Object.entries(configs).map(([key, value]) => ({ key, value }));
    await db.system_config.bulkPut(items);
  },

  /**
   * 获取所有配置
   */
  async getAllConfigs(): Promise<Record<string, any>> {
    const items = await db.system_config.toArray();
    const config: Record<string, any> = {};
    items.forEach(item => {
      config[item.key] = item.value;
    });
    return config;
  },

  /**
   * 根据设备编号查找设备（用于扫码查找）
   */
  async findDeviceByCode(code: string): Promise<Device | undefined> {
    return await db.devices.where('device_id').equals(code).first();
  },

  /**
   * 批量更新设备
   */
  async bulkUpdateDevices(devices: Device[]): Promise<void> {
    await db.devices.bulkPut(devices);
  },

  /**
   * 清空所有数据
   */
  async clearAll(): Promise<void> {
    await db.devices.clear();
    await db.system_config.clear();
  },
};
