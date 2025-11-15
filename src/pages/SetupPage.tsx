import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { useConfigStore } from '@/store';
import { ProviderFactory } from '@/api';
import { Loader2 } from 'lucide-react';

export const SetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { saveConfig } = useConfigStore();
  
  const [formData, setFormData] = useState({
    cloud_provider: 'aitable',
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
  });
  
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      
      // Validate required fields
      if (!formData.employee_id || !formData.api_key || !formData.base_id || !formData.table_id) {
        alert('请填写所有必填字段');
        return;
      }
      
      // Initialize Provider
      const provider = ProviderFactory.getProvider(formData.cloud_provider as any);
      provider.initialize({
        apiKey: formData.api_key,
        baseId: formData.base_id,
        tableId: formData.table_id,
      });
      
      // Test connection by trying to fetch schema
      try {
        await provider.getSchema();
      } catch {
        throw new Error('连接 AITable 失败，请检查 API Key 和 ID 是否正确');
      }
      
      // Save configuration
      await saveConfig({
        ...formData,
        fullscreen_mode: false,
        offline_enabled: true,
      });
      
      // Navigate to inbound page
      navigate('/inbound');
    } catch (error) {
      console.error('Setup failed:', error);
      alert('配置失败：' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-3xl">欢迎使用 LiteDepot</CardTitle>
          <CardDescription>
            轻量级进出库管理软件 - 请先配置 AITable 连接信息
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">工号 *</label>
              <Input
                name="employee_id"
                value={formData.employee_id}
                onChange={handleChange}
                placeholder="请输入您的工号"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">AITable API Key *</label>
              <Input
                name="api_key"
                type="password"
                value={formData.api_key}
                onChange={handleChange}
                placeholder="key..."
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                在 AITable 个人设置中获取 API Key
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Base ID *</label>
                <Input
                  name="base_id"
                  value={formData.base_id}
                  onChange={handleChange}
                  placeholder="app..."
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Table ID *</label>
                <Input
                  name="table_id"
                  value={formData.table_id}
                  onChange={handleChange}
                  placeholder="tbl..."
                  required
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
              <p className="text-xs text-muted-foreground mt-1">
                留空表示使用默认视图
              </p>
            </div>
            
            <div className="pt-4">
              <h3 className="text-sm font-medium mb-3">字段配置（可选，使用默认值）</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">状态字段名</label>
                  <Input
                    name="status_field"
                    value={formData.status_field}
                    onChange={handleChange}
                    placeholder="status"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">借用人字段名</label>
                  <Input
                    name="borrower_field"
                    value={formData.borrower_field}
                    onChange={handleChange}
                    placeholder="borrower"
                  />
                </div>
              </div>
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  连接中...
                </>
              ) : (
                '开始使用'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
