/**
 * 抽象基类 - 数据服务提供者
 * 定义统一的数据操作接口，所有具体的服务提供者都需要实现这些方法
 */
export abstract class BaseProvider<TRecord = any, TSchema = any> {
  /**
   * 初始化服务提供者
   * @param config 配置参数，不同的提供者可能需要不同的配置
   */
  abstract initialize(config: Record<string, any>): void;

  /**
   * 检查服务是否已初始化
   */
  abstract isInitialized(): boolean;

  /**
   * 获取数据表的 Schema 结构
   */
  abstract getSchema(): Promise<TSchema>;

  /**
   * 获取记录列表
   * @param viewId 可选的视图 ID 或过滤条件
   */
  abstract getRecords(viewId?: string): Promise<TRecord[]>;

  /**
   * 创建单条记录
   * @param fields 记录字段数据
   */
  abstract createRecord(fields: Record<string, any>): Promise<TRecord>;

  /**
   * 批量创建记录
   * @param records 记录数组
   */
  abstract batchCreate(records: Array<{ fields: Record<string, any> }>): Promise<TRecord[]>;

  /**
   * 更新单条记录
   * @param id 记录 ID
   * @param fields 要更新的字段数据
   */
  abstract updateRecord(id: string, fields: Record<string, any>): Promise<TRecord>;

  /**
   * 批量更新记录
   * @param records 包含 ID 和字段的记录数组
   */
  abstract batchUpdate(records: Array<{ id: string; fields: Record<string, any> }>): Promise<TRecord[]>;

  /**
   * 删除单条记录
   * @param id 记录 ID
   */
  abstract deleteRecord(id: string): Promise<boolean>;

  /**
   * 批量删除记录
   * @param ids 记录 ID 数组
   */
  abstract batchDelete(ids: string[]): Promise<boolean>;

  /**
   * 更新认证信息（如 API Key）
   * @param credentials 认证凭据
   */
  abstract updateCredentials(credentials: Record<string, any>): void;
}
