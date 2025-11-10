# 技术规格说明文档（Technical Specification）
## 通用设备入库 / 出库 / 盘点客户端  
Electron + React + shadcn-UI + Zustand + IndexedDB  
版本：V1  
适配：Windows（优先）  
最后更新：2025-11-10

---

# 1. 系统架构概述（System Architecture）

本应用采用 **Electron 单窗口架构**，主进程负责系统级能力和 IPC 通讯，渲染进程负责 UI 与业务逻辑。

```
┌─────────────────────────────────────────┐
│ Electron 主进程 │
│ ────────────────┬───────────────────────│
│ - 创建 BrowserWindow │
│ - IPC 主通道 │
│ - 日志写入（error.log） │
│ - 本地文件系统访问 │
│ - IndexedDB 不在主进程 │
│ │
└───────────────▲──────────────────────────┘
│IPC
┌───────────────┴──────────────────────────┐
│ 渲染进程（React + TS） │
│ - UI：shadcn-UI + Tailwind │
│ - 状态管理：Zustand │
│ - 数据服务层：统一 API SDK │
│ - IndexedDB：缓存 devices / system_config│
│ - 扫码输入监听（Keyboard Input） │
│ - 页面路由：入库 / 出库 / 盘点 / 设置 │
└───────────────────────────────────────────┘
```

> ✅ 以 **渲染进程为主业务端** 的轻量架构  
> ✅ 主进程仅负责系统级功能（日志、IPC、窗口）

# 2. 技术栈（Tech Stack）

| 模块                | 技术                         |
|---------------------|------------------------------|
| 桌面端              | Electron（单窗口）           |
| UI 框架            | React + Typescript           |
| UI 组件库           | shadcn-UI（TailwindCSS）     |
| 状态管理            | Zustand                      |
| 本地缓存            | IndexedDB（基于 Dexie.js）   |
| API 通信            | 自定义统一服务层（支持可扩展） |
| 日志记录            | 主进程写入本地 error.log      |
| 构建工具            | Vite                         |

# 3. 页面结构（UI Architecture）

采用 **左右结构布局**：

```
┌──────────────────────────────────────────┐
│ Sidebar（左侧导航 + 用户信息） │
│ - 入库 │
│ - 出库 │
│ - 盘点 │
│ - 设置 │
│------------- Sidebar Footer --------------│
│ 用户卡片（工号 + BaseID + 退出） │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ MainContent（右侧页面） │
│ 动态路由： │
│ - /inbound │
│ - /outbound │
│ - /inventory │
│ - /settings │
└──────────────────────────────────────────┘
```

# 4. 模块划分（Modules）

## 4.1 Core Modules
| 模块 | 说明 |
|------|------|
| `api` | AITable 通信层统一封装 |
| `db` | IndexedDB 本地数据缓存 |
| `store` | Zustand 全局状态存储 |
| `hooks` | 扫码、同步、设备操作相关 hooks |
| `components` | 公共 UI 组件 |
| `pages` | 4 大功能页：入库/出库/盘点/设置 |
| `ipc` | 与主进程通信（日志写入） |

---

# 5. 数据存储设计（IndexedDB Schema）

使用 **Dexie.js** 简化 API。

## 5.1 数据库：`inventory_client_db`

### 表结构：

### ✅ 5.1.1 devices 表  
从云端同步的设备列表（以远端为准）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 设备唯一 ID（记录 ID） |
| device_id | string | 设备编号（二维码） |
| fields | object | AITable 返回的字段内容，动态结构 |
| updated_at | number | 本地缓存更新时间戳 |

**索引：**  
- `device_id`（用于扫码快速查找）

---

### ✅ 5.1.2 system_config 表  

| 字段 | 类型 | 说明 |
|------|------|------|
| key | string | 配置项（主键） |
| value | any | 配置值 |

存储内容包括：
- 工号（employee_id）
- API Key（base64）
- Base ID / Table ID / View ID
- 状态字段名（user-defined）
- 扫码配置（是否以 Enter 结束）
- UI 配置（全屏模式）

---

# 6. AITable API 服务层设计（可替换为 Notion）

## 6.1 API 结构
采用统一 SDK 风格：

```
api/
index.ts
aitables.ts // 当前后端服务
types.ts
http.ts
```

## 6.2 导出 API 方法

### ✅ Schema 读取  
```ts
aiTable.getSchema(baseId, tableId)
```

### 拉取设备列表（手动同步）
```ts
aiTable.getRecords({ baseId, tableId, viewId })
```

### 单条更新

```ts
aiTable.updateRecord(id, fields)
```

### 批量更新（最多 10 条/次）
```
aiTable.batchUpdate(records: Array<{id, fields}>)
```

所有 API 统一走 http.ts，方便未来切换成 Notion、Airtable 等。

# 7. 状态管理（Zustand）
Store Modules
```
store/
  configStore.ts      # 系统配置
  deviceStore.ts      # 设备数据
  outboundStore.ts    # 出库篮
  inventoryStore.ts   # 盘点状态
```

## 7.1 configStore（系统配置）

存储：

- AITable 相关配置
- 扫码设置
- 工号
- 状态字段名（用户定义）

## 7.2 deviceStore（设备列表）

提供方法：

loadDevicesFromDB()

syncFromRemote()

getDeviceByScanCode()

同步规则：
✅ 始终以远端为准（覆盖本地）

## 7.3 outboundStore（批量出库篮）

方法：

- addDevice(device)
- removeDevice(id)
- submit(borrowerName)

一次提交调用 batchUpdate，如 >10 条则拆分为多批。

## 7.4 inventoryStore（盘点）

属性：

- scannedToday: {device_id: timestamp}

方法：

- markScanned(device)
- endInventory() → 返回未盘点列表

# 8. 扫码逻辑设计（核心）
## 8.1 扫码方式

- 扫码枪模拟键盘输入
- 输入结束以 `Enter` 判断（可在设置开启/关闭）

8.2 技术方案

在入库/出库/盘点页面监听：
```ts
window.addEventListener("keydown", handleKeyPress)
```

使用缓冲区：
```ts
let buffer = ''
if (key !== 'Enter') buffer += key
else {
   onScan(buffer)
   buffer = ''
}
```

# 9. 业务流程（Logic Flow）
## 9.1 入库流程（Inbound）
```
扫码 → buffer 收到编号 → 查询 IndexedDB
→ 找到？ → 显示详情
            → 点击"入库"
            → 调用 updateRecord()
→ 找不到？ → 显示 “未找到设备”
```

9.2 出库流程（Outbound）
```
出库模式 → 扫码 → 查找设备
→ 在库状态？ → 加入出库篮
→ 不在库？ → 提示“设备已出库”
→ 输入借用人姓名 → 提交
→ 调用 batchUpdate（最多 10 条/次）
```

9.3 盘点流程（Inventory）
```
进入盘点模式
→ 扫码 → 查找对应设备
→ 成功 → 更新 last_checked_at
→ 本地标记 scannedToday
→ 结束 → 比较 devices - scannedToday → 未盘点列表
```

# 10. 同步机制（手动）

## 10.1 手动同步流程：
```
用户点击“同步设备列表”
→ 调用 aiTable.getRecords()
→ 覆盖 deviceStore + IndexedDB
→ 显示同步数量
```
无自动同步。
无双向同步，远端为准。

# 11. 日志系统（Main Process）

主进程提供 IPC 方法：

渲染进程调用：
```
ipcRenderer.invoke('log-error', errorMessage)
```

主进程写入：
```
%APPDATA%/inventory-client/logs/error.log
```

12. 部署形式

✅ 绿色免安装（portable）
目录格式：
```
inventory-client/
  inventory.exe
  resources/
  data/ (自动创建 IndexedDB)
  logs/
```
无需 AutoUpdater。

# 13. 安全策略

API Key 以 base64 存储在 IndexedDB 中

不提供加密（因是 demo open source）
