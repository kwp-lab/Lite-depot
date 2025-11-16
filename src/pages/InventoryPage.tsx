import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { useConfigStore, useProductStore, useInventoryStore } from '@/store';
import { formatDate } from '@/lib/utils';
import { CheckCircle, AlertCircle, ClipboardCheck, FileText } from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const { config } = useConfigStore();
  const { products, getProductByCode, updateProduct, loadProductsFromDB } = useProductStore();
  const { scannedToday, isActive, startInventory, markScanned, endInventory, clear } = useInventoryStore();
  
  const [scanCode, setScanCode] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [scannedList, setScannedList] = useState<Array<{ productId: string; time: number }>>([]);
  const [showUnscanned, setShowUnscanned] = useState(false);
  const [unscannedProducts, setUnscannedProducts] = useState<string[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const scanBufferRef = useRef('');
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    loadProductsFromDB();
  }, [loadProductsFromDB]);

  const handleStart = () => {
    startInventory();
    setScannedList([]);
    setShowUnscanned(false);
    inputRef.current?.focus();
  };

  const handleScan = useCallback(async (code: string) => {
    const trimmedCode = code.trim();
    if (!trimmedCode) return;

    setScanCode(trimmedCode);
    
    const product = getProductByCode(trimmedCode);
    if (!product) {
      setMessage({ type: 'error', text: '找不到该货品' });
      setTimeout(() => setMessage(null), 2000);
      return;
    }

    // Check if already scanned
    if (scannedToday.has(product.product_id)) {
      setMessage({ type: 'error', text: '该货品今日已盘点' });
      setTimeout(() => setMessage(null), 2000);
      return;
    }

    try {
      // // Update in AITable
      // const fields: Record<string, string | number | boolean | null | undefined> = {
      //   [config.checked_time_field || 'last_checked_at']: new Date().toISOString(),
      // };
      // await updateProduct(product.id, fields);

      // Mark as scanned locally
      markScanned(product.product_id);
      
      // Add to scanned list
      setScannedList(prev => [{
        productId: product.product_id,
        time: Date.now()
      }, ...prev].slice(0, 20));

      setMessage({ type: 'success', text: '盘点成功' });
      setScanCode('');
      inputRef.current?.focus();
      setTimeout(() => setMessage(null), 1500);
    } catch (error) {
      console.error('Inventory check failed:', error);
      setMessage({ type: 'error', text: '盘点失败：' + (error as Error).message });
    }
  }, [getProductByCode, scannedToday, updateProduct, markScanned]);

  useEffect(() => {
    inputRef.current?.focus();

    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isActive) return;
      
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
  }, [isActive, handleScan]);

  const handleManualScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (isActive) {
      handleScan(scanCode);
    }
  };

  const handleEnd = () => {
    const records = endInventory();
    
    // Calculate unscanned products
    const scannedIds = new Set(records.map((r) => r.product_id));
    const unscanned = products
      .filter((d) => !scannedIds.has(d.product_id))
      .map((d) => d.product_id);
    
    setUnscannedProducts(unscanned);
    setShowUnscanned(true);
  };

  const handleReset = () => {
    if (confirm('确定要重置盘点状态吗？')) {
      clear();
      setScannedList([]);
      setShowUnscanned(false);
      setUnscannedProducts([]);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">货品盘点</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {`已同步货品数: ${products.length}`}
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
              {/* Control Buttons */}
              <Card>
                <CardContent className="pt-6">
                  {!isActive ? (
                    <Button onClick={handleStart} className="w-full" size="lg">
                      <ClipboardCheck className="w-5 h-5 mr-2" />
                      开始盘点
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Button onClick={handleEnd} variant="outline" className="w-full">
                        结束盘点
                      </Button>
                      <Button onClick={handleReset} variant="ghost" className="w-full">
                        重置
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Scan Input */}
              {isActive && (
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
                        placeholder="扫描货品条码..."
                        className="text-lg col-span-10"
                        autoFocus
                      />
                      <Button type="submit" className="col-span-2">盘点</Button>
                    </form>
                  </CardContent>
                </Card>
              )}

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

              {/* Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>盘点统计</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted rounded-md">
                      <div className="text-3xl font-bold text-primary">
                        {scannedToday.size}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        已盘点
                      </div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-md">
                      <div className="text-3xl font-bold">
                        {products.length}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        总货品数
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Scanned List or Unscanned Report */}
            <div>
              {!showUnscanned ? (
                <Card>
                  <CardHeader>
                    <CardTitle>今日已盘点 ({scannedList.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {scannedList.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        暂无盘点记录
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[600px] overflow-auto">
                        {scannedList.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-muted rounded-md"
                          >
                            <div className="flex items-center space-x-3">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="font-medium">{item.productId}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {new Date(item.time).toLocaleTimeString('zh-CN')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center">
                        <FileText className="w-5 h-5 mr-2" />
                        未盘点货品 ({unscannedProducts.length})
                      </CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => setShowUnscanned(false)}>
                        返回
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {unscannedProducts.length === 0 ? (
                      <div className="text-center text-green-600 py-8">
                        <CheckCircle className="w-12 h-12 mx-auto mb-2" />
                        <p className="font-medium">所有货品已盘点完成！</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[600px] overflow-auto">
                        {unscannedProducts.map((productId, index) => (
                          <div
                            key={index}
                            className="p-3 bg-yellow-50 border border-yellow-200 rounded-md"
                          >
                            <span className="font-medium text-yellow-800">{productId}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
