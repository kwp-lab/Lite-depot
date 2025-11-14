import { HttpClient } from './http';
import { AITableSchema, AITableRecord } from '../types';

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

export class AITableService {
  private http: HttpClient | null = null;
  private baseId: string = '';
  private tableId: string = '';

  initialize(apiKey: string, baseId: string, tableId: string) {
    const baseURL = 'https://aitable.ai/fusion/v1';
    this.http = new HttpClient(baseURL, apiKey);
    this.baseId = baseId;
    this.tableId = tableId;
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

  async updateRecord(id: string, fields: Record<string, string | number | boolean | null | undefined>): Promise<AITableRecord> {
    if (!this.http) throw new Error('AITable service not initialized');
    
    const url = `/${this.baseId}/${this.tableId}/${id}`;
    const response = await this.http.patch<AITableRecord>(url, { fields });
    return response;
  }

  async batchUpdate(records: Array<{ id: string; fields: Record<string, string | number | boolean | null | undefined> }>): Promise<AITableRecord[]> {
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

  updateApiKey(apiKey: string) {
    if (this.http) {
      this.http.updateApiKey(apiKey);
    }
  }
}

export const aiTableService = new AITableService();
