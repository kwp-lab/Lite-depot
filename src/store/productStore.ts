import { create } from 'zustand';
import { Product } from '../types';
import { db, dbHelpers } from '../db';
import { ProviderFactory, CloudProviderType } from '../api';

interface ProductState {
  products: Product[];
  isLoading: boolean;
  lastSyncTime: number | null;
  cloudProvider: CloudProviderType;
  setCloudProvider: (provider: CloudProviderType) => void;
  loadProductsFromDB: () => Promise<void>;
  syncFromRemote: (viewId?: string) => Promise<void>;
  getProductByCode: (code: string) => Product | undefined;
  updateProduct: (id: string, fields: Record<string, string | number | boolean | null | undefined>) => Promise<void>;
  clearProducts: () => Promise<void>;
}

/**
 * 设备列表存储 (ProductStore)
 * Based on Technical Specification Section 7.2
 * 
 * 状态：
 * - products: 设备列表（从 IndexedDB 加载）
 * - cloudProvider: 当前使用的云服务类型
 * - isLoading: 加载状态
 * - lastSyncTime: 上次同步时间
 * 
 * 提供方法：
 * - loadProductsFromDB(): 从本地 IndexedDB 加载
 * - syncFromRemote(): 从云端同步（使用 ProviderFactory）
 * - getProductByCode(): 根据编号查找（用于扫码）
 * - updateProduct(): 更新设备（使用 ProviderFactory）
 * 
 * 同步规则：
 * ✅ 始终以远端为准（覆盖本地）
 * ✅ 使用 ProviderFactory 根据 cloudProvider 获取对应实例
 */
export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  isLoading: false,
  lastSyncTime: null,
  cloudProvider: 'aitable' as CloudProviderType,

  /**
   * 设置云服务提供者类型
   */
  setCloudProvider: (provider: CloudProviderType) => {
    set({ cloudProvider: provider });
  },

  /**
   * 从 IndexedDB 加载设备列表
   * 应用启动时调用，加载本地缓存的设备数据
   */
  loadProductsFromDB: async () => {
    try {
      set({ isLoading: true });
      const products = await db.products.toArray();
      
      // 如果有缓存，加载上次同步时间
      let lastSyncTime: number | null = null;
      if (products.length > 0) {
        // 从设备记录中获取最新的更新时间
        const maxUpdatedAt = Math.max(...products.map(d => d.updated_at));
        lastSyncTime = maxUpdatedAt;
      }
      
      set({ products, lastSyncTime, isLoading: false });
    } catch (error) {
      console.error('Failed to load products from DB:', error);
      set({ isLoading: false });
    }
  },

  /**
   * 从云端同步设备列表
   * 同步规则：始终以远端为准（覆盖本地）
   * 
   * @param viewId - 可选的视图 ID，用于筛选特定视图的数据
   */
  syncFromRemote: async (viewId?: string) => {
    try {
      set({ isLoading: true });
      
      // 使用 ProviderFactory 获取当前配置的云服务 Provider
      const provider = ProviderFactory.getProvider(get().cloudProvider);
      if (!provider.isInitialized()) {
        throw new Error('Provider not initialized');
      }
      
      // 从云端获取记录
      // 从云端获取记录
      const records = await provider.getRecords(viewId);
      
      // 清空本地设备数据（以远端为准）
      await db.products.clear();
      
      // 转换并保存记录到 IndexedDB
      const products: Product[] = records.map(record => {
        // 尝试从不同字段获取设备 ID（兼容不同命名）
        const productId = record.fields.product_id || record.fields.Product_ID || record.id;
        return {
          id: record.id,
          product_id: String(productId),
          fields: record.fields,
          updated_at: Date.now(),
        };
      });
      
      // 批量保存到 IndexedDB
      await db.products.bulkPut(products);
      
      set({ 
        products, 
        isLoading: false,
        lastSyncTime: Date.now(),
      });
      
      return;
    } catch (error) {
      console.error('Failed to sync from remote:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  /**
   * 根据设备编号查找设备
   * 用于扫码查找设备信息
   * 
   * @param code - 设备编号（二维码内容）
   * @returns 找到的设备或 undefined
   */
  getProductByCode: (code: string) => {
    const products = get().products;
    return products.find(d => d.product_id === code);
  },

  /**
   * 更新设备信息
   * 同时更新云端和本地 IndexedDB
   * 
   * @param id - 设备记录 ID
   * @param fields - 要更新的字段
   */
  updateProduct: async (id: string, fields: Record<string, string | number | boolean | null | undefined>) => {
    try {
      // 使用 Provider 更新云端数据
      const provider = ProviderFactory.getProvider(get().cloudProvider);
      await provider.updateRecord(id, fields);
      
      // 更新本地 IndexedDB
      const product = get().products.find(d => d.id === id);
      if (product) {
        const updatedProduct = {
          ...product,
          fields: { ...product.fields, ...fields },
          updated_at: Date.now(),
        };
        
        await db.products.put(updatedProduct);
        
        // 更新内存中的设备列表
        set({
          products: get().products.map(d => 
            d.id === id ? updatedProduct : d
          ),
        });
      }
    } catch (error) {
      console.error('Failed to update product:', error);
      throw error;
    }
  },

  /**
   * 清空所有设备数据
   * 用于清除本地缓存
   */
  clearProducts: async () => {
    try {
      await db.products.clear();
      set({ products: [], lastSyncTime: null });
    } catch (error) {
      console.error('Failed to clear products:', error);
    }
  },
}));
