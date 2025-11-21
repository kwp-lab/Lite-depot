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
  code: number;
  success: boolean;
  message: string;
  data: {
    records: AITableRecord[];
  };
}

interface VikaConfig {
  apiKey: string;
  spaceId: string;
  datasheetId: string;
}

/**
 * 维格云（Vika）服务提供者
 * 维格云与 AITable 是同一家公司的产品，API 完全相同
 * 实现 BaseProvider 定义的所有数据操作接口
 */
export class VikaProvider extends BaseProvider<AITableRecord, AITableSchema> {
  private http: HttpClient | null = null;
  private spaceId: string = '';
  private datasheetId: string = '';

  /**
   * 初始化维格云服务
   * @param config 包含 apiKey, spaceId, datasheetId 的配置对象
   */
  initialize(config: VikaConfig): void;
  initialize(apiKey: string, spaceId: string, datasheetId: string): void;
  initialize(configOrApiKey: VikaConfig | string, spaceId?: string, datasheetId?: string): void {
    if (typeof configOrApiKey === 'object') {
      const config = configOrApiKey;
      const baseURL = 'https://vika.cn/fusion/v1';
      this.http = new HttpClient(baseURL, config.apiKey);
      this.spaceId = config.spaceId;
      this.datasheetId = config.datasheetId;
    } else {
      const apiKey = configOrApiKey;
      const baseURL = 'https://vika.cn/fusion/v1';
      this.http = new HttpClient(baseURL, apiKey);
      this.spaceId = spaceId!;
      this.datasheetId = datasheetId!;
    }
  }

  isInitialized(): boolean {
    return this.http !== null && !!this.spaceId && !!this.datasheetId;
  }

  async getSchema(): Promise<AITableSchema> {
    if (!this.http) throw new Error('Vika service not initialized');

    const url = `/datasheets/${this.datasheetId}/fields`;
    const response = await this.http.get<FieldSchemaResponse>(url);
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to get schema');
    }
    
    return { fields: response.data.fields };
  }

  async getRecords(viewId?: string): Promise<AITableRecord[]> {
    if (!this.http) throw new Error('Vika service not initialized');
    
    const url = `/datasheets/${this.datasheetId}/records`;
    const params: Record<string, unknown> = { maxRecords: 100, fieldKey: "name" };
    
    if (viewId) {
      params.view = viewId;
    }
    
    const response = await this.http.get<RecordsResponse>(url, params);

    if (!response.success || !response.data.records) {
      throw new Error(response.message || 'Failed to get records');
    } 

    return response.data.records || [];
  }

  async createRecord(fields: Record<string, any>): Promise<AITableRecord> {
    if (!this.http) throw new Error('Vika service not initialized');
    
    const url = `/datasheets/${this.datasheetId}/records`;
    const response = await this.http.post<RecordsResponse>(url, { 
      records: [{ fields }],
      fieldKey: "name"
    });

    if (!response.success || !response.data.records) {
      throw new Error(response.message || 'Failed to create record');
    } 

    return response.data.records[0];
  }

  async batchCreate(records: Array<{ fields: Record<string, any> }>): Promise<AITableRecord[]> {
    if (!this.http) throw new Error('Vika service not initialized');
    
    const url = `/datasheets/${this.datasheetId}/records`;
    const batchSize = 10;
    const results: AITableRecord[] = [];
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const response = await this.http.post<RecordsResponse>(url, { records: batch, fieldKey: "name" });
      if (!response.success || !response.data.records) {
        throw new Error(response.message || 'Failed to create record');
      } 
      results.push(...(response.data.records || []));
    }
    
    return results;
  }

  async updateRecord(id: string, fields: Record<string, any>): Promise<AITableRecord> {
    if (!this.http) throw new Error('Vika service not initialized');
    
    const url = `/datasheets/${this.datasheetId}/records`;
    const response = await this.http.patch<RecordsResponse>(url, { 
      records: [{ recordId: id, fields }],
      fieldKey: "name"
    });

    if (!response.success || !response.data.records) {
      throw new Error(response.message || 'Failed to update record');
    }

    return response.data.records[0];
  }

  async batchUpdate(records: Array<{ id: string; fields: Record<string, any> }>): Promise<AITableRecord[]> {
    if (!this.http) throw new Error('Vika service not initialized');
    
    const url = `/datasheets/${this.datasheetId}/records`;
    const batchSize = 10;
    const results: AITableRecord[] = [];
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize).map(r => ({ recordId: r.id, fields: r.fields }));
      const response = await this.http.patch<RecordsResponse>(url, { records: batch, fieldKey: "name" });

      if (!response.success || !response.data.records) {
        throw new Error(response.message || 'Failed to update record');
      }

      results.push(...(response.data.records || []));
    }
    
    return results;
  }

  async deleteRecord(id: string): Promise<boolean> {
    if (!this.http) throw new Error('Vika service not initialized');
    
    const url = `/datasheets/${this.datasheetId}/records`;
    const response = await this.http.delete<RecordsResponse>(url, { recordIds: [id] });

    if (!response.success) {
      throw new Error(response.message || 'Failed to delete record');
    }

    return true;
  }

  async batchDelete(ids: string[]): Promise<boolean> {
    if (!this.http) throw new Error('Vika service not initialized');
    
    const url = `/datasheets/${this.datasheetId}/records`;
    const batchSize = 10;
    
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const response = await this.http.delete<RecordsResponse>(url, { recordIds: batch });
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete record');
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
