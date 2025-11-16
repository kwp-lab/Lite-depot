import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { useConfigStore, useProductStore } from '@/store';
import { Product } from '@/types';
import { formatDate } from '@/lib/utils';
import { Loader2, CheckCircle, AlertCircle, Search, LogIn } from 'lucide-react';
import { ProviderFactory, CloudProviderType } from '../api';
import { toast } from "sonner"

export const InboundPage: React.FC = () => {
  const { config } = useConfigStore();
  const { getProductByCode, loadProductsFromDB } = useProductStore();
  
  const [scanCode, setScanCode] = useState('');
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [isProcessing, setIsProcessing] = useState(false);
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
    if (product) {
      setCurrentProduct(product);
      setQuantity('1');
      setMessage(null);
    } else {
      setCurrentProduct(null);
      setMessage({ type: 'error', text: '找不到该货品' });
    }
  }, [getProductByCode]);

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();

    // Listen for keyboard input for scanner
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
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
        
        // Clear buffer after 100ms of no input
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

  const handleInbound = async () => {
    if (!currentProduct) return;
    
    try {
      setIsProcessing(true);

      if (!provider.isInitialized()) {
        throw new Error('系统未配置完整，无法进行入库操作');
      }

      const fields: Record<string, string | number | boolean | null | undefined> = {
        [config.sku_field || 'SKU']: currentProduct.product_id,
        [config.type_field || 'Type']: 'in',
        [config.quantity_field || 'Quantity']: quantity,
        [config.operator_field || 'Employee']: config.employee_name || '未知',
        [config.time_field || 'Date']: new Date().toISOString(),
      };

      console.log('Creating record with fields:', fields);
      await provider.createRecord(fields);
      
      toast.success("入库成功！")
      setCurrentProduct(null);
      setScanCode('');
      setQuantity('1');
      
      // Auto-clear success message
      setTimeout(() => {
        setMessage(null);
        inputRef.current?.focus();
      }, 2000);
    } catch (error) {
      console.error('Inbound failed:', error);
      setMessage({ type: 'error', text: '入库失败：' + (error as Error).message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">货品入库</h1>
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
      <div className="flex-1 p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Scan Input */}
          <Card>
            <CardHeader>
              <CardTitle>扫码区</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualScan} className="grid grid-cols-12 gap-2">
                <Input
                  ref={inputRef}
                  value={scanCode}
                  onChange={(e) => setScanCode(e.target.value)}
                  placeholder="扫描货品条码或手动输入..."
                  className="text-lg col-span-10"
                  autoFocus
                />
                <Button type="submit" className="col-span-2">
                  <Search className="w-4 h-4 mr-1" />
                  查询
                </Button>
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

          {/* Product Details */}
          {currentProduct && (
            <Card>
              <CardHeader>
                <CardTitle>
                  货品信息
                  <span className="text-sm text-muted-foreground mt-1 ml-2">
                    ({currentProduct.id})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(currentProduct.fields).map(([key, value]: [string, unknown]) => (
                    <div key={key}>
                      <label className="text-sm text-muted-foreground">{key}</label>
                      <p className="font-medium">
                        {value != null ? String(value) : '-'}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">入库数量</label>
                    <Input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="请输入入库数量"
                      className="text-lg"
                    />
                  </div>

                  <Button
                    onClick={handleInbound}
                    disabled={isProcessing || !quantity || parseInt(quantity) <= 0}
                    className="w-full"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        处理中...
                      </>
                    ) : (
                      '确认入库'
                    )}
                    <LogIn className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          {!currentProduct && !message && (
            <Card className="bg-muted">
              <CardContent className="p-6 text-center text-muted-foreground">
                <p>请使用扫码枪扫描货品条码，或手动输入货品编号后点击查询</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
