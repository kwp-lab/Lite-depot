import { BaseProvider } from './base-provider';
import { AITableProvider } from './aitables';
import { AITableRecord, AITableSchema } from '../types';

/**
 * 云服务提供者类型
 */
export type CloudProviderType = 'aitable';

/**
 * Provider 工厂类
 * 根据配置返回对应的服务提供者实例
 */
export class ProviderFactory {
  private static instances: Map<CloudProviderType, BaseProvider<any, any>> = new Map();

  /**
   * 获取服务提供者实例（单例模式）
   * @param providerType 提供者类型
   */
  static getProvider(providerType: CloudProviderType): BaseProvider<AITableRecord, AITableSchema> {
    // 如果已有实例，直接返回
    if (this.instances.has(providerType)) {
      return this.instances.get(providerType)!;
    }

    // 根据类型创建新实例
    let provider: BaseProvider<any, any>;
    
    switch (providerType) {
      case 'aitable':
        provider = new AITableProvider();
        break;
      default:
        throw new Error(`Unknown provider type: ${providerType}`);
    }

    // 缓存实例
    this.instances.set(providerType, provider);
    return provider;
  }

  /**
   * 清除所有缓存的实例
   */
  static clearInstances(): void {
    this.instances.clear();
  }

  /**
   * 获取所有可用的提供者列表
   */
  static getAvailableProviders(): Array<{ value: CloudProviderType; label: string; description: string }> {
    return [
      {
        value: 'aitable',
        label: 'AITable',
        description: 'Streamline workflows with a visual database',
      },
      // 未来可以添加更多提供者
      // {
      //   value: 'notion',
      //   label: 'Notion',
      //   description: 'Notion Database',
      // },
    ];
  }
}
