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
    employee_name: '',
    api_key: '',
    workspace_id: '',
    products_datasheet_id: '',
    transactions_datasheet_id: '',
    // view_id: '',
    status_field: 'status',
    operator_field: 'borrower',
    time_field: 'inbound_time',
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
      if (!formData.employee_name || !formData.api_key || !formData.workspace_id || !formData.products_datasheet_id || !formData.transactions_datasheet_id) {
        alert('请填写所有必填字段');
        return;
      }
      
      // Initialize Provider
      const provider = ProviderFactory.getProvider(formData.cloud_provider as any);
      provider.initialize({
        apiKey: formData.api_key,
        spaceId: formData.workspace_id,
        datasheetId: formData.products_datasheet_id,
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
              <label className="block text-sm font-medium mb-2">员工 *</label>
              <Input
                name="employee_name"
                value={formData.employee_name}
                onChange={handleChange}
                placeholder="请输入员工姓名"
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
            
            <div>
              <label className="block text-sm font-medium mb-2">Workspace ID *</label>
              <Input
                name="workspace_id"
                value={formData.workspace_id}
                onChange={handleChange}
                placeholder="spc..."
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">货品表 Datasheet ID (Products) *</label>
              <Input
                name="products_datasheet_id"
                value={formData.products_datasheet_id}
                onChange={handleChange}
                placeholder="dst..."
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                包含字段：SKU, Product Name, Category, Unit
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">库存流水表 Datasheet ID (StockTransactions) *</label>
              <Input
                name="transactions_datasheet_id"
                value={formData.transactions_datasheet_id}
                onChange={handleChange}
                placeholder="dst..."
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                包含字段：ID, SKU, Type (in/out), Quantity, EmployeeID, Date
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
                    name="operator_field"
                    value={formData.operator_field}
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
