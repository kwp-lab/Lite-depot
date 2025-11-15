import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { useConfigStore, useDeviceStore } from '@/store';
import { Device } from '@/types';
import { formatDate } from '@/lib/utils';
import { Loader2, CheckCircle, AlertCircle, Search } from 'lucide-react';

export const InboundPage: React.FC = () => {
  const { config } = useConfigStore();
  const { getDeviceByCode, updateDevice, loadDevicesFromDB } = useDeviceStore();
  
  const [scanCode, setScanCode] = useState('');
  const [currentDevice, setCurrentDevice] = useState<Device | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const scanBufferRef = useRef('');
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    loadDevicesFromDB();
  }, [loadDevicesFromDB]);

  const handleScan = useCallback((code: string) => {
    const trimmedCode = code.trim();
    if (!trimmedCode) return;

    setScanCode(trimmedCode);
    
    const device = getDeviceByCode(trimmedCode);
    if (device) {
      setCurrentDevice(device);
      setMessage(null);
    } else {
      setCurrentDevice(null);
      setMessage({ type: 'error', text: '找不到该设备' });
    }
  }, [getDeviceByCode]);

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
    if (!currentDevice) return;
    
    try {
      setIsProcessing(true);
      
      const fields: Record<string, string | number | boolean | null | undefined> = {
        [config.status_field || 'status']: '在库',
        [config.inbound_time_field || 'inbound_time']: new Date().toISOString(),
        operator: config.employee_id,
      };
      
      await updateDevice(currentDevice.id, fields);
      
      setMessage({ type: 'success', text: '入库成功！' });
      setCurrentDevice(null);
      setScanCode('');
      
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
            <h1 className="text-2xl font-bold">设备入库</h1>
            <p className="text-sm text-muted-foreground mt-1">
              当前时间: {formatDate(new Date())}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">操作员</p>
            <p className="font-medium">{config.employee_id || '未设置'}</p>
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
                  placeholder="扫描设备条码或手动输入..."
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

          {/* Device Details */}
          {currentDevice && (
            <Card>
              <CardHeader>
                <CardTitle>设备信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(currentDevice.fields).map(([key, value]: [string, unknown]) => (
                    <div key={key}>
                      <label className="text-sm text-muted-foreground">{key}</label>
                      <p className="font-medium">
                        {value != null ? String(value) : '-'}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t">
                  <Button
                    onClick={handleInbound}
                    disabled={isProcessing}
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
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          {!currentDevice && !message && (
            <Card className="bg-muted">
              <CardContent className="p-6 text-center text-muted-foreground">
                <p>请使用扫码枪扫描设备条码，或手动输入设备编号后点击查询</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
