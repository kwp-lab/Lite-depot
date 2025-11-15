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
  fields: Record<string, any>;
  createdTime?: string;
}

export interface AITableSchema {
  fields: AITableField[];
}

// Provider related types
export interface ProviderConfig {
  [key: string]: any;
}

export interface ProviderRecord {
  id: string;
  fields: Record<string, any>;
  createdTime?: string;
  [key: string]: any;
}

export interface ProviderSchema {
  fields: Array<{
    id: string;
    name: string;
    type: string;
    [key: string]: any;
  }>;
}

// Product related types
export interface Product {
  id: string;
  product_id: string;
  fields: Record<string, string | number | boolean | null | undefined>;
  updated_at: number;
}

// System config types
export interface SystemConfig {
  key: string;
  value: string | number | boolean | null | undefined;
}

export interface AppConfig {
  cloud_provider: string; // 云服务提供者，如 'aitable', 'notion' 等
  employee_id: string;
  api_key: string;
  workspace_id: string;
  datasheet_id: string;
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
  product: Product;
  addedAt: number;
}

// Inventory related types
export interface InventoryRecord {
  product_id: string;
  scanned_at: number;
}
