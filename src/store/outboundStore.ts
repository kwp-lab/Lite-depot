import { create } from 'zustand';
import { Device, OutboundItem } from '../types';
import { ProviderFactory, CloudProviderType } from '../api';

interface OutboundState {
  items: OutboundItem[];
  borrowerName: string;
  isSubmitting: boolean;
  cloudProvider: CloudProviderType;
  setCloudProvider: (provider: CloudProviderType) => void;
  addDevice: (device: Device) => void;
  removeDevice: (deviceId: string) => void;
  setBorrowerName: (name: string) => void;
  submit: (employeeId: string, statusField: string, borrowerField: string, outboundTimeField: string) => Promise<void>;
  clear: () => void;
}

export const useOutboundStore = create<OutboundState>((set, get) => ({
  items: [],
  borrowerName: '',
  isSubmitting: false,
  cloudProvider: 'aitable' as CloudProviderType,

  setCloudProvider: (provider: CloudProviderType) => {
    set({ cloudProvider: provider });
  },

  addDevice: (device: Device) => {
    const items = get().items;
    
    // Check if already exists
    if (items.some(item => item.device.id === device.id)) {
      return;
    }
    
    set({
      items: [...items, { device, addedAt: Date.now() }],
    });
  },

  removeDevice: (deviceId: string) => {
    set({
      items: get().items.filter(item => item.device.id !== deviceId),
    });
  },

  setBorrowerName: (name: string) => {
    set({ borrowerName: name });
  },

  submit: async (employeeId: string, statusField: string, borrowerField: string, outboundTimeField: string) => {
    const { items, borrowerName } = get();
    
    if (items.length === 0) {
      throw new Error('没有待出库设备');
    }
    
    if (!borrowerName.trim()) {
      throw new Error('请输入借用人姓名');
    }
    
    try {
      set({ isSubmitting: true });
      
      const records = items.map(item => ({
        id: item.device.id,
        fields: {
          [statusField]: '出库',
          [borrowerField]: borrowerName,
          [outboundTimeField]: new Date().toISOString(),
          operator: employeeId,
        },
      }));
      
      const provider = ProviderFactory.getProvider(get().cloudProvider);
      await provider.batchUpdate(records);
      
      // Clear after successful submission
      set({ items: [], borrowerName: '', isSubmitting: false });
    } catch (error) {
      console.error('Failed to submit outbound:', error);
      set({ isSubmitting: false });
      throw error;
    }
  },

  clear: () => {
    set({ items: [], borrowerName: '' });
  },
}));
