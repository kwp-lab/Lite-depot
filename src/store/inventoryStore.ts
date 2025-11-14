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

export const useInventoryStore = create<InventoryState>((set, get) => ({
  scannedToday: new Map(),
  isActive: false,

  startInventory: () => {
    set({ isActive: true, scannedToday: new Map() });
  },

  markScanned: (deviceId: string) => {
    const scannedToday = new Map(get().scannedToday);
    scannedToday.set(deviceId, Date.now());
    set({ scannedToday });
  },

  endInventory: () => {
    const scannedToday = get().scannedToday;
    const records: InventoryRecord[] = [];
    
    scannedToday.forEach((scanned_at, device_id) => {
      records.push({ device_id, scanned_at });
    });
    
    set({ isActive: false });
    return records;
  },

  clear: () => {
    set({ scannedToday: new Map(), isActive: false });
  },
}));
