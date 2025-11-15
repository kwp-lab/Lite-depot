# IndexedDB 数据存储实现

基于 **Technical Specification 第 5 章** 的数据存储设计实现。

## 技术栈

- **Dexie.js**: IndexedDB 的简化 API 封装库
- **数据库名称**: `inventory_client_db`
- **版本**: 1

## 数据库结构

### 1. devices 表

从云端同步的设备列表（以远端为准）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 设备唯一 ID（记录 ID，主键） |
| device_id | string | 设备编号（二维码内容，索引） |
| fields | object | AITable 返回的字段内容，动态结构 |
| updated_at | number | 本地缓存更新时间戳（索引） |

**索引**:
- `id` (主键)
- `device_id` (用于扫码快速查找)
- `updated_at` (用于同步时间追踪)

**用途**:
- 缓存从云端同步的设备数据
- 支持离线查询和扫码查找
- 同步规则：始终以远端为准（覆盖本地）

### 2. system_config 表

系统配置存储

| 字段 | 类型 | 说明 |
|------|------|------|
| key | string | 配置项名称（主键） |
| value | any | 配置值（支持任意类型） |

**索引**:
- `key` (主键)

**存储内容**:
- **云服务提供者** (`cloud_provider`): 'aitable' | 'notion' | ...
- **工号** (`employee_id`): 用户工号
- **API Key** (`api_key`): 云服务 API 密钥
- **Base ID** (`base_id`): 数据库 ID
- **Table ID** (`table_id`): 表 ID
- **View ID** (`view_id`): 视图 ID（可选）
- **状态字段名** (`status_field`): 用户定义的状态字段
- **借用人字段名** (`borrower_field`): 借用人字段
- **入库时间字段** (`inbound_time_field`): 入库时间字段
- **出库时间字段** (`outbound_time_field`): 出库时间字段
- **盘点时间字段** (`checked_time_field`): 盘点时间字段
- **UI 配置** (`fullscreen_mode`, `offline_enabled`): 界面设置

## 使用方式

### 基本用法

```typescript
import { db, dbHelpers } from '@/db';

// 保存配置
await dbHelpers.setConfig('employee_id', 'EMP001');

// 获取配置
const employeeId = await dbHelpers.getConfig('employee_id');

// 批量保存配置
await dbHelpers.setConfigs({
  cloud_provider: 'aitable',
  api_key: 'xxx',
  base_id: 'appxxx',
});

// 获取所有配置
const allConfig = await dbHelpers.getAllConfigs();

// 根据设备编号查找设备（扫码场景）
const device = await dbHelpers.findDeviceByCode('DEVICE001');

// 批量更新设备
await dbHelpers.bulkUpdateDevices(devices);
```

### 在 Store 中使用

配置存储已通过 Zustand Store 进行封装，建议使用 Store 而不是直接操作数据库：

```typescript
import { useConfigStore } from '@/store';

const { config, loadConfig, saveConfig } = useConfigStore();

// 加载配置
await loadConfig();

// 保存配置
await saveConfig({
  employee_id: 'EMP001',
  api_key: 'xxx',
});
```

## 配置持久化流程

### 初始配置（SetupPage）

1. 用户在 SetupPage 填写配置信息
2. 点击"开始使用"
3. 配置通过 `configStore.saveConfig()` 保存到 IndexedDB
4. 应用导航到主界面

### 配置修改（SettingsPage）

1. 用户在 SettingsPage 修改配置
2. 点击"保存配置"
3. 配置通过 `configStore.saveConfig()` 更新到 IndexedDB
4. 应用重新初始化 Provider

### 应用启动

1. App.tsx 在 useEffect 中调用 `configStore.loadConfig()`
2. 从 IndexedDB 读取所有配置项
3. 检查 `isConfigured` 状态（必需字段是否完整）
4. 根据配置状态决定显示 SetupPage 或主界面

## 数据同步机制

### 手动同步流程

```
用户点击"同步设备列表"
  ↓
调用 deviceStore.syncFromRemote()
  ↓
使用 ProviderFactory 获取云服务 Provider
  ↓
调用 provider.getRecords() 获取远端数据
  ↓
清空 devices 表（以远端为准）
  ↓
批量写入新数据到 devices 表
  ↓
更新 lastSyncTime
  ↓
显示同步结果
```

**同步规则**:
- ✅ 无自动同步
- ✅ 无双向同步
- ✅ 远端为准（覆盖本地）

## 数据库操作最佳实践

### 1. 使用 Store 而不是直接操作数据库

❌ 不推荐:
```typescript
import { db } from '@/db';
await db.system_config.put({ key: 'employee_id', value: 'EMP001' });
```

✅ 推荐:
```typescript
import { useConfigStore } from '@/store';
const { saveConfig } = useConfigStore();
await saveConfig({ employee_id: 'EMP001' });
```

### 2. 批量操作优于单条操作

❌ 不推荐:
```typescript
for (const device of devices) {
  await db.devices.put(device);
}
```

✅ 推荐:
```typescript
await db.devices.bulkPut(devices);
```

### 3. 使用事务处理关联操作

```typescript
await db.transaction('rw', [db.devices, db.system_config], async () => {
  await db.devices.clear();
  await db.devices.bulkPut(newDevices);
  await db.system_config.put({ key: 'lastSyncTime', value: Date.now() });
});
```

### 4. 错误处理

```typescript
try {
  await db.devices.bulkPut(devices);
} catch (error) {
  console.error('Database operation failed:', error);
  // 记录错误到主进程日志
  window.electron?.logError('Database error: ' + error.message);
  throw error;
}
```

## 性能优化建议

1. **使用索引**: 已对 `device_id` 建立索引，扫码查找性能优异
2. **批量操作**: 使用 `bulkPut` 代替循环 `put`
3. **避免频繁读取**: 使用 Store 缓存数据，减少数据库访问
4. **定期清理**: 提供清除缓存功能，避免数据库膨胀

## 安全性说明

根据 Technical Specification 第 13 章：

- API Key 以 base64 存储在 IndexedDB 中
- **不提供加密**（因是 demo open source）
- IndexedDB 数据存储在用户本地，受操作系统权限保护
- 建议用户妥善保管设备，避免未授权访问

## 相关文档

- [Technical Specification - Section 5](../../spec/Technical%20Specification.md#5-数据存储设计indexeddb-schema)
- [Dexie.js 官方文档](https://dexie.org/)
- [Store 实现文档](../store/README.md)
