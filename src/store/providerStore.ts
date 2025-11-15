import { useConfigStore } from './configStore';
import { ProviderFactory, CloudProviderType } from '../api';

/**
 * Hook to get the current cloud provider instance
 * 根据当前配置返回对应的 Provider 实例
 */
export const useProvider = () => {
  const { config } = useConfigStore();
  
  const getProvider = () => {
    const providerType = (config.cloud_provider || 'aitable') as CloudProviderType;
    return ProviderFactory.getProvider(providerType);
  };
  
  return { getProvider };
};
