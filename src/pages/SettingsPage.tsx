import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useConfigStore, useProductStore } from '@/store';
import { useTheme } from '@/components/theme-provider';
import { ProviderFactory } from '@/api';
import { Loader2, Save, Trash2, RefreshCw, Monitor, Moon, Sun, Info } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { config, saveConfig, clearConfig } = useConfigStore();
  const { syncFromRemote, lastSyncTime, clearProducts } = useProductStore();
  const { theme, setTheme } = useTheme();

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
        alert('请填写所有必填字段');
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

      alert('配置保存成功！');

      // If this is initial setup, redirect to inbound page
      if (!config.api_key) {
        navigate('/inbound');
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      alert('保存配置失败：' + (error as Error).message);
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
      alert('同步成功！');
    } catch (error) {
      console.error('Failed to sync:', error);
      alert('同步失败：' + (error as Error).message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearCache = async () => {
    if (!confirm('确定要清除本地缓存吗？这将删除所有本地货品数据。')) {
      return;
    }

    try {
      setIsClearing(true);
      await clearProducts();
      alert('缓存已清除');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      alert('清除缓存失败：' + (error as Error).message);
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearConfig = async () => {
    if (!confirm('确定要清除所有配置吗？这将退出登录。')) {
      return;
    }

    await clearConfig();
    navigate('/setup');
  };

  return (
    <TooltipProvider>
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">系统设置</h1>

      {/* Basic Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>基本配置</CardTitle>
          <CardDescription>配置云服务 API 连接信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">云服务 *</label>
            <Select value={formData.cloud_provider} onValueChange={handleProviderChange}>
              <SelectTrigger>
                <SelectValue placeholder="选择云服务提供者" />
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
            <label className="block text-sm font-medium mb-2">员工 *</label>
            <Input
              name="employee_name"
              value={formData.employee_name}
              onChange={handleChange}
              placeholder="请输入员工姓名"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">API Key *</label>
            <Input
              name="api_key"
              type="password"
              value={formData.api_key}
              onChange={handleChange}
              placeholder="请输入你的云服务 API Key"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Workspace ID *</label>
            <Input
              name="workspace_id"
              value={formData.workspace_id}
              onChange={handleChange}
              placeholder="spc..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">货品表 Datasheet ID (Products) *</label>
            <p className="text-xs text-muted-foreground mt-1">
              包含字段：SKU, Product Name, Category, Unit
            </p>
            <Input
              name="products_datasheet_id"
              value={formData.products_datasheet_id}
              onChange={handleChange}
              placeholder="dst..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">库存流水表 Datasheet ID (StockTransactions) *</label>
            <p className="text-xs text-muted-foreground mt-1">
              包含字段：ID, SKU, Type (in/out), Quantity, EmployeeID, Date
            </p>
            <Input
              name="transactions_datasheet_id"
              value={formData.transactions_datasheet_id}
              onChange={handleChange}
              placeholder="dst..."
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
          <CardTitle>主题设置</CardTitle>
          <CardDescription>选择应用程序的主题外观</CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <label className="block text-sm font-medium mb-2">主题模式</label>
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
                <span className="text-sm font-medium">浅色模式</span>
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
                <span className="text-sm font-medium">深色模式</span>
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
                <span className="text-sm font-medium">跟随系统</span>
              </button>
            </div>
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
