import { HttpClient } from './http';
import { AITableSchema, AITableRecord } from '../types';
import { BaseProvider } from './base-provider';

interface FieldSchemaResponse {
  code: number;
  success: boolean;
  data: {
    fields: Array<any>;
  };
  message: string;
}

interface RecordsResponse {
  records: AITableRecord[];
}

interface AITableConfig {
  apiKey: string;
  baseId: string;
  tableId: string;
}

/**
 * AITable 服务提供者
 * 实现 BaseProvider 定义的所有数据操作接口
 */
export class AITableProvider extends BaseProvider<AITableRecord, AITableSchema> {
  private http: HttpClient | null = null;
  private baseId: string = '';
  private tableId: string = '';

  /**
   * 初始化 AITable 服务
   * @param config 包含 apiKey, baseId, tableId 的配置对象
   */
  initialize(config: AITableConfig): void;
  initialize(apiKey: string, baseId: string, tableId: string): void;
  initialize(configOrApiKey: AITableConfig | string, baseId?: string, tableId?: string): void {
    if (typeof configOrApiKey === 'object') {
      const config = configOrApiKey;
      const baseURL = 'https://aitable.ai/fusion/v1';
      this.http = new HttpClient(baseURL, config.apiKey);
      this.baseId = config.baseId;
      this.tableId = config.tableId;
    } else {
      const apiKey = configOrApiKey;
      const baseURL = 'https://aitable.ai/fusion/v1';
      this.http = new HttpClient(baseURL, apiKey);
      this.baseId = baseId!;
      this.tableId = tableId!;
    }
  }

  isInitialized(): boolean {
    return this.http !== null && !!this.baseId && !!this.tableId;
  }

  async getSchema(): Promise<AITableSchema> {
    if (!this.http) throw new Error('AITable service not initialized');

    const url = `/datasheets/${this.tableId}/fields`;
    const response = await this.http.get<FieldSchemaResponse>(url);
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to get schema');
    }
    
    return { fields: response.data.fields };
  }

  async getRecords(viewId?: string): Promise<AITableRecord[]> {
    if (!this.http) throw new Error('AITable service not initialized');
    
    const url = `/${this.baseId}/${this.tableId}`;
    const params: Record<string, unknown> = { maxRecords: 10000 };
    
    if (viewId) {
      params.view = viewId;
    }
    
    const response = await this.http.get<RecordsResponse>(url, params);
    return response.records || [];
  }

  async createRecord(fields: Record<string, any>): Promise<AITableRecord> {
    if (!this.http) throw new Error('AITable service not initialized');
    
    const url = `/${this.baseId}/${this.tableId}`;
    const response = await this.http.post<{ record: AITableRecord }>(url, { fields });
    return response.record;
  }

  async batchCreate(records: Array<{ fields: Record<string, any> }>): Promise<AITableRecord[]> {
    if (!this.http) throw new Error('AITable service not initialized');
    
    const url = `/${this.baseId}/${this.tableId}`;
    const batchSize = 10;
    const results: AITableRecord[] = [];
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const response = await this.http.post<RecordsResponse>(url, { records: batch });
      results.push(...(response.records || []));
    }
    
    return results;
  }

  async updateRecord(id: string, fields: Record<string, any>): Promise<AITableRecord> {
    if (!this.http) throw new Error('AITable service not initialized');
    
    const url = `/${this.baseId}/${this.tableId}/${id}`;
    const response = await this.http.patch<AITableRecord>(url, { fields });
    return response;
  }

  async batchUpdate(records: Array<{ id: string; fields: Record<string, any> }>): Promise<AITableRecord[]> {
    if (!this.http) throw new Error('AITable service not initialized');
    
    const url = `/${this.baseId}/${this.tableId}`;
    const batchSize = 10;
    const results: AITableRecord[] = [];
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const response = await this.http.patch<RecordsResponse>(url, { records: batch });
      results.push(...(response.records || []));
    }
    
    return results;
  }

  async deleteRecord(id: string): Promise<boolean> {
    if (!this.http) throw new Error('AITable service not initialized');
    
    const url = `/${this.baseId}/${this.tableId}/${id}`;
    await this.http.delete(url);
    return true;
  }

  async batchDelete(ids: string[]): Promise<boolean> {
    if (!this.http) throw new Error('AITable service not initialized');
    
    const batchSize = 10;
    
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      for (const id of batch) {
        const url = `/${this.baseId}/${this.tableId}/${id}`;
        await this.http.delete(url);
      }
    }
    
    return true;
  }

  updateCredentials(credentials: { apiKey?: string }): void {
    if (credentials.apiKey && this.http) {
      this.http.updateApiKey(credentials.apiKey);
    }
  }

  /**
   * 兼容旧的方法名
   * @deprecated 使用 updateCredentials 代替
   */
  updateApiKey(apiKey: string): void {
    this.updateCredentials({ apiKey });
  }
}
