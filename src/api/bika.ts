import { HttpClient } from './http';
import { DatabaseRecord, FieldsSchema } from '../types';
import { BaseProvider } from './base-provider';

interface BikaRecord {
    id: string;
    fields: Record<string, any>;
}

interface FieldSchemaResponse {
    code: number;
    success: boolean;
    data: { fields: Array<any> };
    message: string;
}

interface RecordsResponse {
    code: number;
    success: boolean;
    message: string;
    data: { records: BikaRecord[] };
}

interface BikaConfig {
    apiKey: string;
    spaceId: string;
    datasheetId: string;
}

/**
 * Bika 服务提供者 (Bika.ai)
 * 与 AITable/Vika API 保持一致
 */
export class BikaProvider extends BaseProvider<DatabaseRecord, FieldsSchema> {
    private http: HttpClient | null = null;
    private spaceId: string = '';
    private datasheetId: string = '';

    initialize(config: BikaConfig): void;
    initialize(apiKey: string, spaceId: string, datasheetId: string): void;
    initialize(configOrApiKey: BikaConfig | string, spaceId?: string, datasheetId?: string): void {
        if (typeof configOrApiKey === 'object') {
            const config = configOrApiKey;
            const baseURL = 'https://bika.ai/api/openapi/bika';
            this.http = new HttpClient(baseURL, config.apiKey);
            this.spaceId = config.spaceId;
            this.datasheetId = config.datasheetId;
        } else {
            const apiKey = configOrApiKey;
            const baseURL = 'https://bika.ai/api/openapi/bika';
            this.http = new HttpClient(baseURL, apiKey);
            this.spaceId = spaceId!;
            this.datasheetId = datasheetId!;
        }
    }

    isInitialized(): boolean {
        return this.http !== null && !!this.spaceId && !!this.datasheetId;
    }

    async getSchema(): Promise<FieldsSchema> {
        if (!this.http) throw new Error('Bika service not initialized');
        const url = `/v1/spaces/${this.spaceId}/resources/databases/${this.datasheetId}/fields`;
        const response = await this.http.get<FieldSchemaResponse>(url);
        if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to get schema');
        }
        return { fields: response.data.fields };
    }

    async getRecords(viewId?: string): Promise<DatabaseRecord[]> {
        if (!this.http) throw new Error('Bika service not initialized');
        const url = `/v2/spaces/${this.spaceId}/resources/databases/${this.datasheetId}/records`;
        const params: Record<string, unknown> = { maxRecords: 100, fieldKey: 'name' };
        if (viewId) params.view = viewId;
        const response = await this.http.get<RecordsResponse>(url, params);
        if (!response.success || !response.data.records) {
            throw new Error(response.message || 'Failed to get records');
        }
        const result = response.data.records.map(record => ({
            fields: record.fields,
            recordId: record.id,
        }));

        return result || [];
    }

    async createRecord(fields: Record<string, any>): Promise<DatabaseRecord> {
        if (!this.http) throw new Error('Bika service not initialized');
        const url = `/v2/spaces/${this.spaceId}/resources/databases/${this.datasheetId}/records`;
        const response = await this.http.post<RecordsResponse>(url, { records: [{ fields }], fieldKey: 'name' });
        if (!response.success || !response.data.records) {
            throw new Error(response.message || 'Failed to create record');
        }
        return {
            recordId: response.data.records[0].id,
            fields: response.data.records[0].fields,
        };
    }

    async batchCreate(records: Array<{ fields: Record<string, any> }>): Promise<DatabaseRecord[]> {
        if (!this.http) throw new Error('Bika service not initialized');
        const url = `/v2/spaces/${this.spaceId}/resources/databases/${this.datasheetId}/records`;
        const batchSize = 10;
        const results: BikaRecord[] = [];
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            const response = await this.http.post<RecordsResponse>(url, { records: batch, fieldKey: 'name' });
            if (!response.success || !response.data.records) {
                throw new Error(response.message || 'Failed to create record');
            }
            results.push(...(response.data.records || []));
        }
        return results.map(record => ({
            recordId: record.id,
            fields: record.fields,
        }));
    }

    async updateRecord(id: string, fields: Record<string, any>): Promise<DatabaseRecord> {
        if (!this.http) throw new Error('AITable service not initialized');

        const url = `/v2/spaces/${this.spaceId}/resources/databases/${this.datasheetId}/records`;
        const response = await this.http.patch<RecordsResponse>(url, {
            records: [{ recordId: id, fields }],
            fieldKey: "name"
        });

        if (!response.success || !response.data.records) {
            throw new Error(response.message || 'Failed to update record');
        }

        return {
            recordId: response.data.records[0].id,
            fields: response.data.records[0].fields,
        };
    }

    async batchUpdate(records: Array<{ id: string; fields: Record<string, any> }>): Promise<DatabaseRecord[]> {
        if (!this.http) throw new Error('AITable service not initialized');

        const url = `/v2/spaces/${this.spaceId}/resources/databases/${this.datasheetId}/records`;
        const batchSize = 10;
        const results = [];

        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize).map(r => ({ recordId: r.id, fields: r.fields }));
            const response = await this.http.patch<RecordsResponse>(url, { records: batch, fieldKey: "name" });

            if (!response.success || !response.data.records) {
                throw new Error(response.message || 'Failed to update record');
            }

            results.push(...(response.data.records || []));
        }

        return results.map(record => ({
            recordId: record.id,
            fields: record.fields,
        }));
    }

    async deleteRecord(id: string): Promise<boolean> {
        if (!this.http) throw new Error('AITable service not initialized');

        const url = `/v2/spaces/${this.spaceId}/resources/databases/${this.datasheetId}/records`;
        const response = await this.http.delete<RecordsResponse>(url, { recordIds: [id] });

        if (!response.success) {
            throw new Error(response.message || 'Failed to delete record');
        }

        return true;
    }

    async batchDelete(ids: string[]): Promise<boolean> {
        if (!this.http) throw new Error('AITable service not initialized');

        const url = `/v2/spaces/${this.spaceId}/resources/databases/${this.datasheetId}/records`;
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
