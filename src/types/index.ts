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
  recordId: string;
  fields: Record<string, any>;
}

export interface AITableSchema {
  fields: AITableField[];
}

// Provider related types
export interface ProviderConfig {
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
  employee_name: string;
  api_key: string;
  workspace_id: string;
  products_datasheet_id: string;
  transactions_datasheet_id: string;
  sku_field: string;
  type_field: string;
  quantity_field: string;
  operator_field: string;
  time_field: string;
  fullscreen_mode: boolean;
  offline_enabled: boolean;
}

// Outbound related types
export interface OutboundItem {
  product: Product;
  quantity: number;
  addedAt: number;
}

// Inventory related types
export interface InventoryRecord {
  product_id: string;
  scanned_at: number;
}
