import { create } from 'zustand';
import { Product, OutboundItem } from '../types';
import { ProviderFactory, CloudProviderType } from '../api';

interface OutboundState {
  items: OutboundItem[];
  borrowerName: string;
  isSubmitting: boolean;
  cloudProvider: CloudProviderType;
  setCloudProvider: (provider: CloudProviderType) => void;
  addProduct: (product: Product) => void;
  removeProduct: (productId: string) => void;
  setBorrowerName: (name: string) => void;
  submit: (employeeId: string, statusField: string, borrowerField: string, outboundTimeField: string) => Promise<void>;
  clear: () => void;
}

/**
 * 批量出库篮存储 (OutboundStore)
 * Based on Technical Specification Section 7.3
 * 
 * 状态：
 * - items: 出库设备列表
 * - cloudProvider: 当前使用的云服务类型
 * - borrowerName: 借用人姓名
 * - isSubmitting: 提交状态
 * 
 * 方法：
 * - addProduct(): 添加设备到出库篮
 * - removeProduct(): 从出库篮移除设备
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
   * 添加设备到出库篮
   * 自动检查是否已存在，避免重复添加
   * 
   * @param product - 要添加的设备
   */
  addProduct: (product: Product) => {
    const items = get().items;
    
    // 检查是否已在出库篮中
    if (items.some(item => item.product.id === product.id)) {
      return;
    }
    
    set({
      items: [...items, { product, addedAt: Date.now() }],
    });
  },

  /**
   * 从出库篮移除设备
   * 
   * @param productId - 设备 ID
   */
  removeProduct: (productId: string) => {
    set({
      items: get().items.filter(item => item.product.id !== productId),
    });
  },

  /**
   * 设置借用人姓名
   * 
   * @param name - 借用人姓名
   */
  setBorrowerName: (name: string) => {
    set({ borrowerName: name });
  },

  /**
   * 提交出库
   * 批量更新设备状态，调用 Provider 的 batchUpdate 方法
   * 如果超过 10 条，Provider 会自动拆分为多批处理
   * 
   * @param employeeId - 操作员工号
   * @param statusField - 状态字段名
   * @param borrowerField - 借用人字段名
   * @param outboundTimeField - 出库时间字段名
   */
  submit: async (employeeId: string, statusField: string, borrowerField: string, outboundTimeField: string) => {
    const { items, borrowerName } = get();
    
    // 验证出库篮不为空
    if (items.length === 0) {
      throw new Error('没有待出库设备');
    }
    
    // 验证借用人姓名已填写
    if (!borrowerName.trim()) {
      throw new Error('请输入借用人姓名');
    }
    
    try {
      set({ isSubmitting: true });
      
      // 构建批量更新记录
      const records = items.map(item => ({
        id: item.product.id,
        fields: {
          [statusField]: '出库',
          [borrowerField]: borrowerName,
          [outboundTimeField]: new Date().toISOString(),
          operator: employeeId,
        },
      }));
      
      // 使用 Provider 批量更新（Provider 内部会处理 >10 条的拆分）
      const provider = ProviderFactory.getProvider(get().cloudProvider);
      await provider.batchUpdate(records);
      
      // 提交成功后清空出库篮
      set({ items: [], borrowerName: '', isSubmitting: false });
    } catch (error) {
      console.error('Failed to submit outbound:', error);
      set({ isSubmitting: false });
      throw error;
    }
  },

  /**
   * 清空出库篮
   * 清除所有待出库设备和借用人信息
   */
  clear: () => {
    set({ items: [], borrowerName: '' });
  },
}));
