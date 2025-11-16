import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { useConfigStore, useProductStore, useOutboundStore } from '@/store';
import { formatDate } from '@/lib/utils';
import { CheckCircle, AlertCircle, Trash2, Package, Plus, Loader2 } from 'lucide-react';
import { toast } from "sonner"
import { ProviderFactory, CloudProviderType } from '../api';

export const OutboundPage: React.FC = () => {
  const { config } = useConfigStore();
  const { getProductByCode, loadProductsFromDB } = useProductStore();
  const { items, addProduct, removeProduct, updateQuantity, clear } = useOutboundStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanCode, setScanCode] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const scanBufferRef = useRef('');
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const provider = ProviderFactory.getProvider(config.cloud_provider as CloudProviderType);
  provider.initialize({
      apiKey: config.api_key,
      spaceId: config.workspace_id,
      datasheetId: config.transactions_datasheet_id,
  });

  useEffect(() => {
    loadProductsFromDB();
  }, [loadProductsFromDB]);

  const handleScan = useCallback((code: string) => {
    const trimmedCode = code.trim();
    if (!trimmedCode) return;

    setScanCode(trimmedCode);
    
    const product = getProductByCode(trimmedCode);
    if (!product) {
      setMessage({ type: 'error', text: '找不到该货品' });
      setTimeout(() => setMessage(null), 2000);
      return;
    }

    // Check if already in list
    if (items.some((item) => item.product.id === product.id)) {
      setMessage({ type: 'error', text: '该货品已在出库列表中' });
      setTimeout(() => setMessage(null), 2000);
      return;
    }

    addProduct(product);
    setMessage({ type: 'success', text: '添加成功' });
    setScanCode('');
    inputRef.current?.focus();
    setTimeout(() => setMessage(null), 1500);
  }, [getProductByCode, items, addProduct]);

  useEffect(() => {
    inputRef.current?.focus();

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement && e.target !== inputRef.current) {
        return;
      }

      if (e.key === 'Enter') {
        if (scanBufferRef.current) {
          handleScan(scanBufferRef.current);
          scanBufferRef.current = '';
        }
      } else if (e.key.length === 1) {
        scanBufferRef.current += e.key;
        
        if (scanTimeoutRef.current) {
          clearTimeout(scanTimeoutRef.current);
        }
        scanTimeoutRef.current = setTimeout(() => {
          scanBufferRef.current = '';
        }, 100) as ReturnType<typeof setTimeout>;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [handleScan]);

  const handleManualScan = (e: React.FormEvent) => {
    e.preventDefault();
    handleScan(scanCode);
  };

  const handleSubmit = async () => {
    try {
      setIsProcessing(true);
      
      const outboundTime = new Date().toISOString();
      
      // 构建批量更新记录
      const records = items.map(item => ({
        fields: {
          [config.sku_field || 'SKU']: item.product.product_id,
          [config.type_field || 'Type']: 'out',
          [config.quantity_field || 'Quantity']: item.quantity + '',
          [config.time_field || 'Date']: outboundTime,
          [config.operator_field || 'Employee']: config.employee_name || '未知',
        },
      }));
      
      await provider.batchCreate(records);

      toast.success("出库成功！")
      setTimeout(() => {
        setMessage(null);
        inputRef.current?.focus();
      }, 2000);
    } catch (error) {
      console.error('Outbound failed:', error);
      setMessage({ type: 'error', text: (error as Error).message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    if (confirm('确定要清空出库列表吗？')) {
      clear();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">货品出库</h1>
            <p className="text-sm text-muted-foreground mt-1">
              当前时间: {formatDate(new Date())}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">操作员</p>
            <p className="font-medium">{config.employee_name || '未设置'}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 gap-6">
            {/* Left: Scan Area */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>扫码区</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleManualScan} className="flex space-x-2">
                    <Input
                      ref={inputRef}
                      value={scanCode}
                      onChange={(e) => setScanCode(e.target.value)}
                      placeholder="扫描货品条码..."
                      className="text-lg"
                      autoFocus
                    />
                    <Button type="submit"><Plus className="w-4 h-4" /></Button>
                  </form>
                </CardContent>
              </Card>

              {/* Message */}
              {message && (
                <div
                  className={`flex items-center space-x-2 p-4 rounded-md ${
                    message.type === 'success'
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {message.type === 'success' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                  <span className="font-medium">{message.text}</span>
                </div>
              )}

              <Card className="bg-muted">
                <CardContent className="p-6 text-center text-muted-foreground">
                  <p>扫描货品条码将其添加到右侧出库列表</p>
                  <p className="text-sm mt-2">支持批量扫码</p>
                </CardContent>
              </Card>
            </div>

            {/* Right: Outbound List */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <Package className="w-5 h-5 mr-2" />
                      出库列表 ({items.length})
                    </CardTitle>
                    {items.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={handleClear}>
                        <Trash2 className="w-4 h-4 mr-1" />
                        清空
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {items.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      暂无待出库货品
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-auto">
                      {items.map((item, index) => (
                        <div
                          key={item.product.id}
                          className="flex items-start justify-between p-3 bg-muted rounded-md space-x-3"
                        >
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-muted-foreground">
                                #{index + 1}
                              </span>
                              <span className="font-medium">
                                {item.product.product_id}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {Object.entries(item.product.fields)
                                .slice(0, 2)
                                .map(([key, value]: [string, unknown]) => (
                                  <div key={key}>
                                    {key}: {value != null ? String(value) : '-'}
                                  </div>
                                ))}
                            </div>
                            <div className="pt-1">
                              <label className="text-xs text-muted-foreground mb-1 block">出库数量</label>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 1)}
                                className="w-24"
                              />
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProduct(item.product.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Borrower Input and Submit */}
              <Card>
                <CardContent className="pt-6 space-y-4">

                  <Button
                    onClick={handleSubmit}
                    disabled={items.length === 0 || isProcessing}
                    className="w-full"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        处理中...
                      </>
                    ) : (
                      `提交出库 (${items.length})`
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
