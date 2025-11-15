# Store 状态管理实现

基于 **Technical Specification 第 7 章** 的状态管理设计实现。

## 技术栈

- **Zustand**: 轻量级 React 状态管理库
- **架构**: 模块化 Store，按功能划分

## Store 模块

### 1. configStore（系统配置）

**文件**: `configStore.ts`

**状态**:
- `config`: 当前配置对象
- `isConfigured`: 是否已完成初始配置
- `isLoading`: 加载状态

**方法**:
- `loadConfig()`: 从 IndexedDB 加载配置
- `saveConfig(config)`: 保存配置到 IndexedDB
- `updateConfig(key, value)`: 更新单个配置项
- `clearConfig()`: 清除所有配置

**使用场景**:
```typescript
import { useConfigStore } from '@/store';

function MyComponent() {
  const { config, isConfigured, loadConfig, saveConfig } = useConfigStore();
  
  useEffect(() => {
    loadConfig(); // 应用启动时加载配置
  }, []);
  
  const handleSave = async () => {
    await saveConfig({
      employee_id: 'EMP001',
      api_key: 'xxx',
    });
  };
}
```

**持久化**:
- ✅ 所有配置保存到 IndexedDB 的 `system_config` 表
- ✅ 应用重启后自动恢复配置
- ✅ 支持 SetupPage 和 SettingsPage 修改

---

### 2. productStore（货品数据）

**文件**: `productStore.ts`

**状态**:
- `products`: 货品列表
- `isLoading`: 加载状态
- `lastSyncTime`: 上次同步时间
- `cloudProvider`: 云服务提供者类型

**方法**:
- `loadProductsFromDB()`: 从本地 IndexedDB 加载
- `syncFromRemote(viewId?)`: 从云端同步
- `getProductByCode(code)`: 根据编号查找（扫码场景）
- `updateProduct(id, fields)`: 更新货品
- `setCloudProvider(provider)`: 设置云服务类型
- `clearProducts()`: 清空本地货品缓存

**使用场景**:
```typescript
import { useProductStore } from '@/store';

function InboundPage() {
  const { products, getProductByCode, syncFromRemote } = useProductStore();
  
  const handleScan = (code: string) => {
    const product = getProductByCode(code);
    if (product) {
      // 找到货品，显示详情
    } else {
      // 未找到货品
    }
  };
  
  const handleSync = async () => {
    await syncFromRemote(viewId);
  };
}
```

**同步规则**:
- ✅ 始终以远端为准（覆盖本地）
- ✅ 手动同步，无自动同步
- ✅ 使用 ProviderFactory 支持多云服务

---

### 3. outboundStore（批量出库篮）

**文件**: `outboundStore.ts`

**状态**:
- `items`: 出库货品列表
- `borrowerName`: 借用人姓名
- `isSubmitting`: 提交状态
- `cloudProvider`: 云服务提供者类型

**方法**:
- `addProduct(product)`: 添加货品到出库篮
- `removeProduct(id)`: 移除货品
- `setBorrowerName(name)`: 设置借用人姓名
- `submit(...)`: 提交出库（批量更新）
- `setCloudProvider(provider)`: 设置云服务类型
- `clear()`: 清空出库篮

**使用场景**:
```typescript
import { useOutboundStore } from '@/store';

function OutboundPage() {
  const { items, borrowerName, addProduct, setBorrowerName, submit } = useOutboundStore();
  const { config } = useConfigStore();
  
  const handleScan = (code: string) => {
    const product = getProductByCode(code);
    if (product && product.fields[config.status_field] === '在库') {
      addProduct(product);
    }
  };
  
  const handleSubmit = async () => {
    await submit(
      config.employee_id!,
      config.status_field!,
      config.borrower_field!,
      config.outbound_time_field!
    );
  };
}
```

**业务逻辑**:
- ✅ 一次提交调用 Provider 的 `batchUpdate`
- ✅ 如 >10 条则自动拆分为多批（Provider 内部处理）
- ✅ 提交成功后自动清空出库篮

---

### 4. inventoryStore（盘点状态）

**文件**: `inventoryStore.ts`

**状态**:
- `scannedToday`: Map<product_id, timestamp> - 今日已扫描
- `isActive`: 是否正在盘点

**方法**:
- `startInventory()`: 开始盘点
- `markScanned(productId)`: 标记货品已扫描
- `endInventory()`: 结束盘点，返回已扫描列表
- `clear()`: 清空盘点记录

**使用场景**:
```typescript
import { useInventoryStore } from '@/store';

function InventoryPage() {
  const { isActive, scannedToday, startInventory, markScanned, endInventory } = useInventoryStore();
  const { products } = useProductStore();
  
  const handleStart = () => {
    startInventory();
  };
  
  const handleScan = (code: string) => {
    markScanned(code);
    // 同时更新云端的 last_checked_at 字段
  };
  
  const handleEnd = () => {
    const scanned = endInventory();
    // 计算未盘点列表
    const unscanned = products.filter(d => !scannedToday.has(d.product_id));
  };
}
```

**业务流程**（参考 Technical Specification 9.3）:
```
进入盘点模式
  ↓
扫码 → 查找对应货品
  ↓
成功 → 更新 last_checked_at（云端）
  ↓
本地标记 scannedToday
  ↓
结束 → 比较 products - scannedToday → 未盘点列表
```

---

## Store 最佳实践

### 1. 在组件中使用 Store

```typescript
import { useConfigStore, useProductStore } from '@/store';

function MyComponent() {
  // ✅ 只订阅需要的状态
  const config = useConfigStore(state => state.config);
  const products = useProductStore(state => state.products);
  
  // ❌ 避免订阅整个 store（会导致不必要的重渲染）
  const store = useConfigStore();
}
```

### 2. 异步操作错误处理

```typescript
const handleSync = async () => {
  try {
    await syncFromRemote(viewId);
    alert('同步成功！');
  } catch (error) {
    console.error('同步失败:', error);
    alert('同步失败：' + (error as Error).message);
  }
};
```

### 3. Store 之间的协作

```typescript
// App.tsx - 应用启动时初始化
useEffect(() => {
  const init = async () => {
    // 1. 加载配置
    await loadConfig();
    
    // 2. 根据配置初始化 Provider
    if (isConfigured && config.api_key) {
      const provider = ProviderFactory.getProvider(config.cloud_provider);
      provider.initialize({
        apiKey: config.api_key,
        baseId: config.workspace_id,
        tableId: config.datasheet_id,
      });
      
      // 3. 设置各 Store 的 cloudProvider
      setCloudProvider(config.cloud_provider);
      setOutboundCloudProvider(config.cloud_provider);
      
      // 4. 加载本地货品缓存
      await loadProductsFromDB();
    }
  };
  
  init();
}, []);
```

### 4. 持久化配置模式

```typescript
// SetupPage - 初始配置
const handleSubmit = async (formData) => {
  await saveConfig(formData); // 保存到 IndexedDB
  navigate('/inbound'); // 导航到主界面
};

// SettingsPage - 修改配置
const handleSave = async (formData) => {
  await saveConfig(formData); // 更新 IndexedDB
  // 重新初始化 Provider
  const provider = ProviderFactory.getProvider(formData.cloud_provider);
  provider.initialize({...});
};

// App.tsx - 应用启动
useEffect(() => {
  loadConfig(); // 从 IndexedDB 恢复配置
}, []);
```

## 状态流转图

```
┌─────────────────────────────────────────────────────────┐
│                      应用启动                            │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
          ┌───────────────┐
          │ loadConfig()  │ ← 从 IndexedDB 加载配置
          └───────┬───────┘
                  │
         ┌────────┴────────┐
         │                 │
    isConfigured?      未配置
         │                 │
      已配置               ▼
         │         ┌──────────────┐
         │         │ SetupPage    │ ← 用户填写配置
         │         └──────┬───────┘
         │                │
         │         saveConfig()
         │                │
         └────────┬───────┘
                  │
                  ▼
     ┌─────────────────────────┐
     │ 初始化 Provider          │
     │ - setCloudProvider()    │
     │ - provider.initialize() │
     └─────────┬───────────────┘
               │
               ▼
     ┌─────────────────────┐
     │ loadProductsFromDB() │ ← 加载本地货品缓存
     └─────────┬───────────┘
               │
               ▼
     ┌─────────────────────┐
     │   进入主界面         │
     │ - InboundPage       │
     │ - OutboundPage      │
     │ - InventoryPage     │
     └─────────────────────┘
```

## 相关文档

- [Technical Specification - Section 7](../../spec/Technical%20Specification.md#7-状态管理zustand)
- [IndexedDB 实现文档](../db/README.md)
- [Zustand 官方文档](https://github.com/pmndrs/zustand)
