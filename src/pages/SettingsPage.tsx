import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider
} from '@/components/ui/tooltip';
import { useConfigStore, useProductStore, useLanguageStore } from '@/store';
import { useTheme } from '@/components/theme-provider';
import { ProviderFactory } from '@/api';
import { Loader2, Save, Trash2, RefreshCw, Monitor, Moon, Sun, Info } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { config, saveConfig, clearConfig } = useConfigStore();
  const { syncFromRemote, lastSyncTime, clearProducts } = useProductStore();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguageStore();

  const [formData, setFormData] = useState({
    cloud_provider: 'aitable',
    employee_name: '',
    api_key: '',
    workspace_id: '',
    products_datasheet_id: '',
    transactions_datasheet_id: '',
    sku_field: 'SKU',
    type_field: 'Type (in/out)',
    quantity_field: 'Quantity',
    operator_field: 'Employee',
    time_field: 'Date',
    fullscreen_mode: false,
    offline_enabled: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    setFormData(prev => ({ ...prev, ...config }));
  }, [config]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleProviderChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      cloud_provider: value,
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Validate required fields
      if (!formData.employee_name || !formData.api_key || !formData.workspace_id || !formData.products_datasheet_id || !formData.transactions_datasheet_id) {
        alert(t('settings.fillAllRequiredFields'));
        return;
      }

      await saveConfig(formData);

      // Initialize provider
      const provider = ProviderFactory.getProvider(formData.cloud_provider as any);
      provider.initialize({
        apiKey: formData.api_key,
        spaceId: formData.workspace_id,
        datasheetId: formData.products_datasheet_id,
      });

      alert(t('settings.configSaved'));

      // If this is initial setup, redirect to inbound page
      if (!config.api_key) {
        navigate('/inbound');
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      alert(t('settings.saveConfigFailed') + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);

      const provider = ProviderFactory.getProvider(formData.cloud_provider as any);
      provider.initialize({
        apiKey: formData.api_key,
        spaceId: formData.workspace_id,
        datasheetId: formData.products_datasheet_id,
      });

      await syncFromRemote();
      alert(t('settings.syncSuccess'));
    } catch (error) {
      console.error('Failed to sync:', error);
      alert(t('settings.syncFailed') + (error as Error).message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearCache = async () => {
    if (!confirm(t('settings.confirmClearCache'))) {
      return;
    }

    try {
      setIsClearing(true);
      await clearProducts();
      alert(t('settings.cacheCleared'));
    } catch (error) {
      console.error('Failed to clear cache:', error);
      alert(t('settings.clearCacheFailed') + (error as Error).message);
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearConfig = async () => {
    if (!confirm(t('settings.confirmClearConfig'))) {
      return;
    }

    await clearConfig();
    navigate('/setup');
  };

  return (
    <TooltipProvider>
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">{t('settings.title')}</h1>

      {/* Basic Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('settings.basicConfigTitle')}</CardTitle>
          <CardDescription>{t('settings.basicConfigDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">{t('settings.cloudProviderLabel')} {t('common.required')}</label>
            <Select value={formData.cloud_provider} onValueChange={handleProviderChange}>
              <SelectTrigger className="h-auto min-h-[2.5rem] py-2">
                <SelectValue placeholder={t('settings.cloudProviderPlaceholder')}>
                  {formData.cloud_provider && (() => {
                    const selectedProvider = ProviderFactory.getAvailableProviders().find(
                      p => p.value === formData.cloud_provider
                    );
                    return selectedProvider ? (
                      <div className="flex flex-col items-start">
                        <span>{selectedProvider.label}</span>
                        <span className="text-xs text-muted-foreground">{selectedProvider.description}</span>
                      </div>
                    ) : null;
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ProviderFactory.getAvailableProviders().map((provider) => (
                  <SelectItem key={provider.value} value={provider.value}>
                    <div className="flex flex-col">
                      <span>{provider.label}</span>
                      <span className="text-xs text-muted-foreground">{provider.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('settings.employeeLabel')} {t('common.required')}</label>
            <Input
              name="employee_name"
              value={formData.employee_name}
              onChange={handleChange}
              placeholder={t('settings.employeePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('settings.apiKeyLabel')} {t('common.required')}</label>
            <Input
              name="api_key"
              type="password"
              value={formData.api_key}
              onChange={handleChange}
              placeholder={t('settings.apiKeyPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('settings.workspaceLabel')} {t('common.required')}</label>
            <Input
              name="workspace_id"
              value={formData.workspace_id}
              onChange={handleChange}
              placeholder={t('settings.workspacePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('settings.productsDatasheetLabel')} {t('common.required')}</label>
            <p className="text-xs text-muted-foreground mt-1">
              {t('settings.productsDatasheetHint')}
            </p>
            <Input
              name="products_datasheet_id"
              value={formData.products_datasheet_id}
              onChange={handleChange}
              placeholder={t('settings.productsDatasheetPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('settings.transactionsDatasheetLabel')} {t('common.required')}</label>
            <p className="text-xs text-muted-foreground mt-1">
              {t('settings.transactionsDatasheetHint')}
            </p>
            <Input
              name="transactions_datasheet_id"
              value={formData.transactions_datasheet_id}
              onChange={handleChange}
              placeholder={t('settings.transactionsDatasheetPlaceholder')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Field Mapping */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>字段映射</CardTitle>
          <CardDescription>配置 AITable 表中的字段名称</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">“SKU/Product ID” 字段</label>
              <Input
                name="sku_field"
                value={formData.sku_field}
                onChange={handleChange}
                placeholder="the field name for SKU or Product ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                “操作类型” 字段
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="inline-block ml-1 h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>操作类型，表示入库或出库</TooltipContent>
                </Tooltip>
              </label>
              <Input
                name="type_field"
                value={formData.type_field}
                onChange={handleChange}
                placeholder="the field name for transaction type (in/out)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                “数量” 字段
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="inline-block ml-1 h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>进库或出库的数量</TooltipContent>
                </Tooltip>
              </label>
              <Input
                name="quantity_field"
                value={formData.quantity_field}
                onChange={handleChange}
                placeholder="the field name for quantity"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                “操作人” 字段
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="inline-block ml-1 h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>登记入库或出库的操作人</TooltipContent>
                </Tooltip>
              </label>
              <Input
                name="operator_field"
                value={formData.operator_field}
                onChange={handleChange}
                placeholder="the field name for operator"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                时间字段
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="inline-block ml-1 h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>登记入库或出库的操作时间</TooltipContent>
                </Tooltip>
              </label>
              <Input
                name="time_field"
                value={formData.time_field}
                onChange={handleChange}
                placeholder="inbound_time"
              />
            </div>
            
          </div>
        </CardContent>
      </Card>

      {/* Theme Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('settings.themeTitle')}</CardTitle>
          <CardDescription>{t('settings.themeDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <label className="block text-sm font-medium mb-2">{t('settings.themeModeLabel')}</label>
            <div className="grid grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex flex-col items-center gap-2 p-4 border-2 rounded-lg transition-colors ${theme === 'light'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                  }`}
              >
                <Sun className="h-6 w-6" />
                <span className="text-sm font-medium">{t('settings.lightMode')}</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex flex-col items-center gap-2 p-4 border-2 rounded-lg transition-colors ${theme === 'dark'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                  }`}
              >
                <Moon className="h-6 w-6" />
                <span className="text-sm font-medium">{t('settings.darkMode')}</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('system')}
                className={`flex flex-col items-center gap-2 p-4 border-2 rounded-lg transition-colors ${theme === 'system'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                  }`}
              >
                <Monitor className="h-6 w-6" />
                <span className="text-sm font-medium">{t('settings.systemMode')}</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Language Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('settings.languageTitle')}</CardTitle>
          <CardDescription>{t('settings.languageDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <label className="block text-sm font-medium mb-2">{t('settings.languageLabel')}</label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh">{t('settings.languageChinese')}</SelectItem>
                <SelectItem value="en">{t('settings.languageEnglish')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>数据管理</CardTitle>
          <CardDescription>同步和清除本地数据</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {lastSyncTime && (
            <div className="text-sm text-muted-foreground">
              上次同步: {new Date(lastSyncTime).toLocaleString('zh-CN')}
            </div>
          )}

          <div className="flex space-x-4">
            <Button onClick={handleSync} disabled={isSyncing}>
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  同步中...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  同步货品列表
                </>
              )}
            </Button>

            <Button variant="outline" onClick={handleClearCache} disabled={isClearing}>
              {isClearing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  清除中...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  清除本地货品缓存
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="destructive" onClick={handleClearConfig}>
          清除所有配置
        </Button>

        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              保存配置
            </>
          )}
        </Button>
      </div>
    </div>
    </TooltipProvider>
  );
};
