import { create } from 'zustand';
import { Device } from '../types';
import { db } from '../db';
import { aiTableService } from '../api';

interface DeviceState {
  devices: Device[];
  isLoading: boolean;
  lastSyncTime: number | null;
  loadDevicesFromDB: () => Promise<void>;
  syncFromRemote: (viewId?: string) => Promise<void>;
  getDeviceByCode: (code: string) => Device | undefined;
  updateDevice: (id: string, fields: Record<string, string | number | boolean | null | undefined>) => Promise<void>;
  clearDevices: () => Promise<void>;
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  devices: [],
  isLoading: false,
  lastSyncTime: null,

  loadDevicesFromDB: async () => {
    try {
      set({ isLoading: true });
      const devices = await db.devices.toArray();
      set({ devices, isLoading: false });
    } catch (error) {
      console.error('Failed to load devices from DB:', error);
      set({ isLoading: false });
    }
  },

  syncFromRemote: async (viewId?: string) => {
    try {
      set({ isLoading: true });
      
      if (!aiTableService.isInitialized()) {
        throw new Error('AITable service not initialized');
      }
      
      const records = await aiTableService.getRecords(viewId);
      
      // Clear existing devices
      await db.devices.clear();
      
      // Transform and save records
      const devices: Device[] = records.map(record => {
        const deviceId = record.fields.device_id || record.fields.Device_ID || record.id;
        return {
          id: record.id,
          device_id: String(deviceId),
          fields: record.fields,
          updated_at: Date.now(),
        };
      });
      
      await db.devices.bulkPut(devices);
      
      set({ 
        devices, 
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

  getDeviceByCode: (code: string) => {
    const devices = get().devices;
    return devices.find(d => d.device_id === code);
  },

  updateDevice: async (id: string, fields: Record<string, string | number | boolean | null | undefined>) => {
    try {
      // Update in AITable
      await aiTableService.updateRecord(id, fields);
      
      // Update in local DB
      const device = get().devices.find(d => d.id === id);
      if (device) {
        const updatedDevice = {
          ...device,
          fields: { ...device.fields, ...fields },
          updated_at: Date.now(),
        };
        
        await db.devices.put(updatedDevice);
        
        set({
          devices: get().devices.map(d => 
            d.id === id ? updatedDevice : d
          ),
        });
      }
    } catch (error) {
      console.error('Failed to update device:', error);
      throw error;
    }
  },

  clearDevices: async () => {
    try {
      await db.devices.clear();
      set({ devices: [], lastSyncTime: null });
    } catch (error) {
      console.error('Failed to clear devices:', error);
    }
  },
}));
