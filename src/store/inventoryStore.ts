import { create } from 'zustand';
import { InventoryRecord } from '../types';

interface InventoryState {
  scannedToday: Map<string, number>;
  isActive: boolean;
  startInventory: () => void;
  markScanned: (deviceId: string) => void;
  endInventory: () => InventoryRecord[];
  clear: () => void;
}

/**
 * 盘点存储 (InventoryStore)
 * Based on Technical Specification Section 7.4
 * 
 * 属性：
 * - scannedToday: {device_id: timestamp} - 今日已扫描的设备
 * - isActive: 盘点是否进行中
 * 
 * 方法：
 * - startInventory(): 开始盘点
 * - markScanned(device): 标记设备已扫描
 * - endInventory(): 结束盘点，返回未盘点列表
 * - clear(): 清空盘点记录
 * 
 * 业务流程（参考 Section 9.3）：
 * 1. 进入盘点模式
 * 2. 扫码 → 查找对应设备
 * 3. 成功 → 更新 last_checked_at
 * 4. 本地标记 scannedToday
 * 5. 结束 → 比较 devices - scannedToday → 未盘点列表
 */
export const useInventoryStore = create<InventoryState>((set, get) => ({
  scannedToday: new Map(),
  isActive: false,

  /**
   * 开始盘点
   * 清空之前的盘点记录，开始新的盘点会话
   */
  startInventory: () => {
    set({ isActive: true, scannedToday: new Map() });
  },

  /**
   * 标记设备已扫描
   * 记录设备 ID 和扫描时间戳
   * 
   * @param deviceId - 设备编号
   */
  markScanned: (deviceId: string) => {
    const scannedToday = new Map(get().scannedToday);
    scannedToday.set(deviceId, Date.now());
    set({ scannedToday });
  },

  /**
   * 结束盘点
   * 返回本次盘点扫描的所有设备记录
   * 
   * @returns 盘点记录数组 {device_id, scanned_at}
   */
  endInventory: () => {
    const scannedToday = get().scannedToday;
    const records: InventoryRecord[] = [];
    
    scannedToday.forEach((scanned_at, device_id) => {
      records.push({ device_id, scanned_at });
    });
    
    set({ isActive: false });
    return records;
  },

  /**
   * 清空盘点记录
   * 重置盘点状态
   */
  clear: () => {
    set({ scannedToday: new Map(), isActive: false });
  },
}));
