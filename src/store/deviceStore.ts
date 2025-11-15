import { create } from 'zustand';
import { Device } from '../types';
import { db } from '../db';
import { ProviderFactory, CloudProviderType } from '../api';

interface DeviceState {
  devices: Device[];
  isLoading: boolean;
  lastSyncTime: number | null;
  cloudProvider: CloudProviderType;
  setCloudProvider: (provider: CloudProviderType) => void;
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
  cloudProvider: 'aitable' as CloudProviderType,

  setCloudProvider: (provider: CloudProviderType) => {
    set({ cloudProvider: provider });
  },

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
      
      const provider = ProviderFactory.getProvider(get().cloudProvider);
      if (!provider.isInitialized()) {
        throw new Error('Provider not initialized');
      }
      
      const records = await provider.getRecords(viewId);
      
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
      // Update in Provider
      const provider = ProviderFactory.getProvider(get().cloudProvider);
      await provider.updateRecord(id, fields);
      
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
