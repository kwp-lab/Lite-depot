import Dexie, { Table } from 'dexie';
import { Product, SystemConfig } from '../types';

/**
 * IndexedDB Database Schema
 * Based on Technical Specification Section 5 (数据存储设计)
 * 
 * Tables:
 * - products: 从云端同步的货品列表（以远端为准）
 * - system_config: 系统配置存储
 */
export class InventoryDatabase extends Dexie {
  products!: Table<Product, string>;
  system_config!: Table<SystemConfig, string>;

  constructor() {
    super('inventory_client_db');
    
    // Version 1 Schema
    this.version(1).stores({
      // products 表
      // 索引: id (primary), product_id
      products: 'id, product_id',
      
      // system_config 表
      // 索引: key (primary)
      // 存储内容：云服务提供者、员工、API Key、Base/Table/View ID、状态字段名、扫码配置、UI配置
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
   * 根据货品编号查找货品（用于扫码查找）
   */
  async findProductByCode(code: string): Promise<Product | undefined> {
    return await db.products.where('product_id').equals(code).first();
  },

  /**
   * 批量更新货品
   */
  async bulkUpdateProducts(products: Product[]): Promise<void> {
    await db.products.bulkPut(products);
  },

  /**
   * 清空所有数据
   */
  async clearAll(): Promise<void> {
    await db.products.clear();
    await db.system_config.clear();
  },
};
