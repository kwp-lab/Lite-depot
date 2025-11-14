// AITable related types
export interface AITableField {
  id: string;
  name: string;
  type: string;
  options?: {
    choices?: Array<{ id: string; name: string; color?: string }>;
  };
}

export interface AITableRecord {
  id: string;
  fields: Record<string, string | number | boolean | null | undefined>;
  createdTime?: string;
}

export interface AITableSchema {
  fields: AITableField[];
}

// Device related types
export interface Device {
  id: string;
  device_id: string;
  fields: Record<string, string | number | boolean | null | undefined>;
  updated_at: number;
}

// System config types
export interface SystemConfig {
  key: string;
  value: string | number | boolean | null | undefined;
}

export interface AppConfig {
  employee_id: string;
  api_key: string;
  base_id: string;
  table_id: string;
  view_id: string;
  status_field: string;
  borrower_field: string;
  inbound_time_field: string;
  outbound_time_field: string;
  checked_time_field: string;
  fullscreen_mode: boolean;
  offline_enabled: boolean;
}

// Outbound related types
export interface OutboundItem {
  device: Device;
  addedAt: number;
}

// Inventory related types
export interface InventoryRecord {
  device_id: string;
  scanned_at: number;
}
