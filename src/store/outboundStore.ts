import { create } from 'zustand';
import { Product, OutboundItem } from '../types';
import { ProviderFactory, CloudProviderType } from '../api';

interface OutboundState {
  items: OutboundItem[];
  isSubmitting: boolean;
  cloudProvider: CloudProviderType;
  setCloudProvider: (provider: CloudProviderType) => void;
  addProduct: (product: Product) => void;
  removeProduct: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
}

/**
 * 批量出库篮存储 (OutboundStore)
 * Based on Technical Specification Section 7.3
 * 
 * 状态：
 * - items: 出库货品列表
 * - cloudProvider: 当前使用的云服务类型
 * - borrowerName: 借用人姓名
 * - isSubmitting: 提交状态
 * 
 * 方法：
 * - addProduct(): 添加货品到出库篮
 * - removeProduct(): 从出库篮移除货品
 * - submit(): 提交出库（批量更新）
 * - clear(): 清空出库篮
 * 
 * 业务逻辑：
 * - 一次提交调用 Provider 的 batchUpdate
 * - 如 >10 条则自动拆分为多批（Provider 内部处理）
 */
export const useOutboundStore = create<OutboundState>((set, get) => ({
  items: [],
  borrowerName: '',
  isSubmitting: false,
  cloudProvider: 'aitable' as CloudProviderType,

  /**
   * 设置云服务提供者类型
   */
  setCloudProvider: (provider: CloudProviderType) => {
    set({ cloudProvider: provider });
  },

  /**
   * 添加货品到出库篮
   * 自动检查是否已存在，避免重复添加
   * 
   * @param product - 要添加的货品
   */
  addProduct: (product: Product) => {
    const items = get().items;
    
    // 检查是否已在出库篮中
    if (items.some(item => item.product.id === product.id)) {
      return;
    }
    
    set({
      items: [...items, { product, quantity: 1, addedAt: Date.now() }],
    });
  },

  /**
   * 从出库篮移除货品
   * 
   * @param productId - 货品 ID
   */
  removeProduct: (productId: string) => {
    set({
      items: get().items.filter(item => item.product.id !== productId),
    });
  },

  /**
   * 更新货品出库数量
   * 
   * @param productId - 货品 ID
   * @param quantity - 新的数量
   */
  updateQuantity: (productId: string, quantity: number) => {
    set({
      items: get().items.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      ),
    });
  },

  /**
   * 清空出库篮
   * 清除所有待出库货品和借用人信息
   */
  clear: () => {
    set({ items: [] });
  },
}));
