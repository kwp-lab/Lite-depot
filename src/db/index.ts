import Dexie, { Table } from 'dexie';
import { Device, SystemConfig } from '../types';

export class InventoryDatabase extends Dexie {
  devices!: Table<Device, string>;
  system_config!: Table<SystemConfig, string>;

  constructor() {
    super('inventory_client_db');
    
    this.version(1).stores({
      devices: 'id, device_id, updated_at',
      system_config: 'key',
    });
  }
}

export const db = new InventoryDatabase();
