import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useConfigStore } from '@/store';
import { ProviderFactory } from '@/api';
import { Loader2 } from 'lucide-react';

export const SetupPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { saveConfig } = useConfigStore();
  
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
  
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProviderChange = (value: string) => {
    setFormData(prev => ({ ...prev, cloud_provider: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      
      // Validate required fields
      if (!formData.employee_name || !formData.api_key || !formData.workspace_id || !formData.products_datasheet_id || !formData.transactions_datasheet_id) {
        alert(t('setup.fillAllFields'));
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
        throw new Error(t('setup.connectionError'));
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
      alert(t('setup.setupFailed') + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-3xl">{t('setup.title')}</CardTitle>
          <CardDescription>
            {t('setup.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t('setup.cloudProviderLabel')} {t('common.required')}</label>
              <Select value={formData.cloud_provider} onValueChange={handleProviderChange}>
                <SelectTrigger className="h-auto min-h-[2.5rem] py-2">
                  <SelectValue placeholder={t('setup.cloudProviderPlaceholder')}>
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
              <label className="block text-sm font-medium mb-2">{t('setup.employeeLabel')} {t('common.required')}</label>
              <Input
                name="employee_name"
                value={formData.employee_name}
                onChange={handleChange}
                placeholder={t('setup.employeePlaceholder')}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">{t('setup.apiKeyLabel')} {t('common.required')}</label>
              <Input
                name="api_key"
                type="password"
                value={formData.api_key}
                onChange={handleChange}
                placeholder={t('setup.apiKeyPlaceholder')}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('setup.apiKeyHint')}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">{t('setup.workspaceLabel')} {t('common.required')}</label>
              <Input
                name="workspace_id"
                value={formData.workspace_id}
                onChange={handleChange}
                placeholder={t('setup.workspacePlaceholder')}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">{t('setup.productsDatasheetLabel')} {t('common.required')}</label>
              <Input
                name="products_datasheet_id"
                value={formData.products_datasheet_id}
                onChange={handleChange}
                placeholder={t('setup.productsDatasheetPlaceholder')}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('setup.productsDatasheetHint')}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">{t('setup.transactionsDatasheetLabel')} {t('common.required')}</label>
              <Input
                name="transactions_datasheet_id"
                value={formData.transactions_datasheet_id}
                onChange={handleChange}
                placeholder={t('setup.productsDatasheetPlaceholder')}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('setup.transactionsDatasheetHint')}
              </p>
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('setup.connecting')}
                </>
              ) : (
                <>{t('setup.startButton')}</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
