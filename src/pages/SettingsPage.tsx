import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { useConfigStore, useDeviceStore } from '@/store';
import { aiTableService } from '@/api';
import { Loader2, Save, Trash2, RefreshCw } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { config, saveConfig, clearConfig } = useConfigStore();
  const { syncFromRemote, lastSyncTime, clearDevices } = useDeviceStore();
  
  const [formData, setFormData] = useState({
    employee_id: '',
    api_key: '',
    base_id: '',
    table_id: '',
    view_id: '',
    status_field: 'status',
    borrower_field: 'borrower',
    inbound_time_field: 'inbound_time',
    outbound_time_field: 'outbound_time',
    checked_time_field: 'last_checked_at',
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

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Validate required fields
      if (!formData.employee_id || !formData.api_key || !formData.base_id || !formData.table_id) {
        alert('请填写所有必填字段');
        return;
      }
      
      await saveConfig(formData);
      
      // Initialize AITable service
      aiTableService.initialize(formData.api_key, formData.base_id, formData.table_id);
      
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
      
      if (!aiTableService.isInitialized()) {
        alert('请先保存配置');
        return;
      }
      
      await syncFromRemote(formData.view_id);
      alert('同步成功！');
    } catch (error) {
      console.error('Failed to sync:', error);
      alert('同步失败：' + (error as Error).message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearCache = async () => {
    if (!confirm('确定要清除本地缓存吗？这将删除所有本地设备数据。')) {
      return;
    }
    
    try {
      setIsClearing(true);
      await clearDevices();
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
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">系统设置</h1>
      
      {/* Basic Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>基本配置</CardTitle>
          <CardDescription>配置 AITable API 连接信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">工号 *</label>
            <Input
              name="employee_id"
              value={formData.employee_id}
              onChange={handleChange}
              placeholder="请输入工号"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">API Key *</label>
            <Input
              name="api_key"
              type="password"
              value={formData.api_key}
              onChange={handleChange}
              placeholder="请输入 AITable API Key"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Base ID *</label>
              <Input
                name="base_id"
                value={formData.base_id}
                onChange={handleChange}
                placeholder="app..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Table ID *</label>
              <Input
                name="table_id"
                value={formData.table_id}
                onChange={handleChange}
                placeholder="tbl..."
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">View ID (可选)</label>
            <Input
              name="view_id"
              value={formData.view_id}
              onChange={handleChange}
              placeholder="viw..."
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
              <label className="block text-sm font-medium mb-2">状态字段</label>
              <Input
                name="status_field"
                value={formData.status_field}
                onChange={handleChange}
                placeholder="status"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">借用人字段</label>
              <Input
                name="borrower_field"
                value={formData.borrower_field}
                onChange={handleChange}
                placeholder="borrower"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">入库时间字段</label>
              <Input
                name="inbound_time_field"
                value={formData.inbound_time_field}
                onChange={handleChange}
                placeholder="inbound_time"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">出库时间字段</label>
              <Input
                name="outbound_time_field"
                value={formData.outbound_time_field}
                onChange={handleChange}
                placeholder="outbound_time"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">盘点时间字段</label>
              <Input
                name="checked_time_field"
                value={formData.checked_time_field}
                onChange={handleChange}
                placeholder="last_checked_at"
              />
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
                  同步设备列表
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
                  清除本地缓存
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
  );
};
