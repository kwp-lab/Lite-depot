# 快速开始指南

本指南帮助开发者快速了解 IndexedDB 数据存储的使用方式。

## 1. 基本概念

### IndexedDB 数据库

- **数据库名称**: `inventory_client_db`
- **表**: `products` (货物列表), `system_config` (系统配置)

### Store 模块

- **configStore**: 系统配置管理
- **productStore**: 货物数据管理
- **outboundStore**: 出库篮管理
- **inventoryStore**: 盘点状态管理

## 2. 使用配置存储

### 在组件中读取配置

```typescript
import { useConfigStore } from '@/store';

function MyComponent() {
  const { config, isConfigured } = useConfigStore();
  
  // 使用配置
  const employeeId = config.employee_id;
  const apiKey = config.api_key;
  
  if (!isConfigured) {
    return <div>请先完成初始配置</div>;
  }
  
  return <div>欢迎，工号: {employeeId}</div>;
}
```

### 保存配置

```typescript
import { useConfigStore } from '@/store';

function SetupPage() {
  const { saveConfig } = useConfigStore();
  
  const handleSubmit = async (formData) => {
    await saveConfig({
      employee_id: formData.employee_id,
      api_key: formData.api_key,
      workspace_id: formData.workspace_id,
      datasheet_id: formData.datasheet_id,
      // ... 其他配置
    });
    
    // 配置已自动保存到 IndexedDB
    navigate('/inbound');
  };
}
```

### 应用启动时加载配置

```typescript
// App.tsx
import { useConfigStore } from '@/store';

function App() {
  const { loadConfig, isConfigured } = useConfigStore();
  
  useEffect(() => {
    // 从 IndexedDB 加载配置
    loadConfig();
  }, [loadConfig]);
  
  if (!isConfigured) {
    return <Navigate to="/setup" />;
  }
  
  return <MainApp />;
}
```

## 3. 使用货物数据

### 从本地加载货物列表

```typescript
import { useProductStore } from '@/store';

function InboundPage() {
  const { products, loadProductsFromDB } = useProductStore();
  
  useEffect(() => {
    // 从 IndexedDB 加载货物列表
    loadProductsFromDB();
  }, [loadProductsFromDB]);
  
  return (
    <div>
      <h1>货物总数: {products.length}</h1>
      {products.map(product => (
        <div key={product.id}>{product.product_id}</div>
      ))}
    </div>
  );
}
```

### 从云端同步货物

```typescript
import { useProductStore, useConfigStore } from '@/store';

function SyncButton() {
  const { syncFromRemote } = useProductStore();
  const { config } = useConfigStore();
  const [isSyncing, setIsSyncing] = useState(false);
  
  const handleSync = async () => {
    try {
      setIsSyncing(true);
      await syncFromRemote(config.view_id);
      alert('同步成功！');
    } catch (error) {
      alert('同步失败: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  };
  
  return (
    <button onClick={handleSync} disabled={isSyncing}>
      {isSyncing ? '同步中...' : '同步货物列表'}
    </button>
  );
}
```

### 扫码查找货物

```typescript
import { useProductStore } from '@/store';

function ScanHandler() {
  const { getProductByCode } = useProductStore();
  const [buffer, setBuffer] = useState('');
  
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        // 扫码完成
        const product = getProductByCode(buffer);
        if (product) {
          console.log('找到货物:', product);
          // 显示货物详情
        } else {
          console.log('未找到货物');
        }
        setBuffer('');
      } else {
        // 累积输入
        setBuffer(prev => prev + e.key);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [buffer, getProductByCode]);
  
  return null;
}
```

## 4. 使用出库篮

### 添加货物到出库篮

```typescript
import { useOutboundStore, useProductStore } from '@/store';

function OutboundPage() {
  const { items, addProduct, removeProduct } = useOutboundStore();
  const { getProductByCode } = useProductStore();
  
  const handleScan = (code: string) => {
    const product = getProductByCode(code);
    if (product) {
      addProduct(product);
    }
  };
  
  return (
    <div>
      <h1>出库篮 ({items.length})</h1>
      {items.map(item => (
        <div key={item.product.id}>
          {item.product.product_id}
          <button onClick={() => removeProduct(item.product.id)}>
            移除
          </button>
        </div>
      ))}
    </div>
  );
}
```

### 提交出库

```typescript
import { useOutboundStore, useConfigStore } from '@/store';

function OutboundSubmit() {
  const { items, borrowerName, setBorrowerName, submit } = useOutboundStore();
  const { config } = useConfigStore();
  
  const handleSubmit = async () => {
    try {
      await submit(
        config.employee_id!,
        config.status_field!,
        config.borrower_field!,
        config.outbound_time_field!
      );
      alert('出库成功！');
    } catch (error) {
      alert('出库失败: ' + error.message);
    }
  };
  
  return (
    <div>
      <input
        type="text"
        placeholder="借用人姓名"
        value={borrowerName}
        onChange={(e) => setBorrowerName(e.target.value)}
      />
      <button onClick={handleSubmit} disabled={items.length === 0}>
        提交出库 ({items.length})
      </button>
    </div>
  );
}
```

## 5. 使用盘点功能

### 开始盘点

```typescript
import { useInventoryStore } from '@/store';

function InventoryPage() {
  const { isActive, scannedToday, startInventory, markScanned, endInventory } = useInventoryStore();
  
  const handleStart = () => {
    startInventory();
  };
  
  const handleScan = (code: string) => {
    markScanned(code);
    // 同时更新云端的 last_checked_at
  };
  
  const handleEnd = () => {
    const scanned = endInventory();
    console.log('已盘点货物:', scanned);
  };
  
  return (
    <div>
      {!isActive ? (
        <button onClick={handleStart}>开始盘点</button>
      ) : (
        <>
          <div>已扫描: {scannedToday.size}</div>
          <button onClick={handleEnd}>结束盘点</button>
        </>
      )}
    </div>
  );
}
```

## 6. 常见场景

### 场景 1: 应用首次启动

```typescript
// App.tsx
useEffect(() => {
  loadConfig(); // 尝试加载配置
}, []);

// 如果 isConfigured = false，自动跳转到 /setup
// 用户填写配置后，saveConfig() 会保存到 IndexedDB
// 下次启动时，isConfigured = true，直接进入主界面
```

### 场景 2: 修改配置

```typescript
// SettingsPage.tsx
const handleSave = async () => {
  await saveConfig(formData); // 更新 IndexedDB
  alert('配置已保存');
};
```

### 场景 3: 离线使用

```typescript
// 1. 先在线同步货物列表
await syncFromRemote();

// 2. 断网后仍可查询货物
const product = getProductByCode('DEVICE001'); // 从本地 IndexedDB 查询
```

### 场景 4: 扫码入库

```typescript
const handleScan = async (code: string) => {
  // 1. 查找货物
  const product = getProductByCode(code);
  
  if (!product) {
    alert('未找到货物');
    return;
  }
  
  // 2. 更新货物状态
  await updateProduct(product.id, {
    [config.status_field!]: '在库',
    [config.inbound_time_field!]: new Date().toISOString(),
  });
  
  alert('入库成功');
};
```

## 7. 调试技巧

### 查看 IndexedDB 数据

在 Chrome DevTools 中：
1. 打开 Application 标签
2. 左侧选择 IndexedDB → inventory_client_db
3. 查看 products 和 system_config 表

### 清空数据

```typescript
import { db } from '@/db';

// 清空所有数据
await db.products.clear();
await db.system_config.clear();

// 或使用 Store 方法
await clearConfig();
await clearProducts();
```

### 查看配置

```typescript
import { db } from '@/db';

// 查看所有配置
const configs = await db.system_config.toArray();
console.log(configs);

// 查看货物数量
const productCount = await db.products.count();
console.log('货物总数:', productCount);
```

## 8. 性能优化

### 使用选择器避免不必要的重渲染

```typescript
// ❌ 不好: 订阅整个 store
const store = useConfigStore();

// ✅ 好: 只订阅需要的状态
const employeeId = useConfigStore(state => state.config.employee_id);
const isConfigured = useConfigStore(state => state.isConfigured);
```

### 批量操作

```typescript
// ❌ 不好: 循环单次操作
for (const product of products) {
  await db.products.put(product);
}

// ✅ 好: 批量操作
await db.products.bulkPut(products);
```

## 9. 错误处理

```typescript
try {
  await syncFromRemote(viewId);
  alert('同步成功');
} catch (error) {
  console.error('同步失败:', error);
  alert('同步失败: ' + (error as Error).message);
  
  // 可选: 记录到主进程日志
  window.electron?.logError('Sync failed: ' + error.message);
}
```

## 10. 下一步

- 查看 [完整实现文档](./IndexedDB-Implementation.md)
- 查看 [Database 文档](../src/db/README.md)
- 查看 [Store 文档](../src/store/README.md)
- 查看 [Technical Specification](../spec/Technical%20Specification.md)

## 常见问题

### Q: 配置没有保存？
A: 检查是否调用了 `saveConfig()`，确保没有抛出异常。

### Q: 货物列表为空？
A: 先调用 `syncFromRemote()` 从云端同步货物。

### Q: 扫码找不到货物？
A: 确保已同步货物列表，检查货物编号是否匹配。

### Q: 应用重启后配置丢失？
A: 检查 IndexedDB 是否被清空，确保 `loadConfig()` 在应用启动时被调用。
