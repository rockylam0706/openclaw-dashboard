# 贡献指南

## 🚫 禁止事项

### 模块顶层禁止执行的操作

**模块顶层**指函数外部的代码，这些代码在 Node.js 导入模块时立即执行。

```javascript
// ❌ 错误示例：顶层同步 I/O
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../config.json');

// 禁止！这会在模块导入时阻塞
if (!fs.existsSync(CONFIG_PATH)) {
  fs.writeFileSync(CONFIG_PATH, '{}');
}

const config = JSON.parse(fs.readFileSync(CONFIG_PATH));

module.exports = { config };
```

**为什么禁止？**

1. **阻塞事件循环**：同步 I/O 阻塞 Node.js 单线程
2. **启动变慢**：每次服务器重启都要执行
3. **PM2 重启循环**：阻塞导致健康检查超时，PM2 自动重启
4. **难以调试**：问题在导入时发生，堆栈信息不清晰

---

## ✅ 正确做法

### 1. 延迟初始化

```javascript
// ✅ 正确：封装为函数
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../config.json');

function getConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, '{}');
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH));
}

module.exports = { getConfig };
```

### 2. 使用异步 I/O

```javascript
// ✅ 正确：异步版本
const fs = require('fs').promises;

async function getConfig() {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    if (e.code === 'ENOENT') {
      await fs.writeFile(CONFIG_PATH, '{}');
      return {};
    }
    throw e;
  }
}
```

### 3. 懒加载（首次使用时初始化）

```javascript
// ✅ 正确：懒加载
let _config = null;

function getConfig() {
  if (_config === null) {
    _config = loadConfigSync(); // 首次使用时才加载
  }
  return _config;
}
```

### 4. 应用启动时显式初始化

```javascript
// ✅ 正确：在应用启动钩子中
const app = express();

app.on('start', async () => {
  await ensureBackupDir();
  await connectDatabase();
  await loadConfig();
});
```

---

## 📋 代码审查清单

提交代码前自查：

### 模块结构
- [ ] 模块顶层没有同步 I/O 操作？
- [ ] 模块顶层没有网络请求？
- [ ] 模块顶层没有耗时计算（>100ms）？
- [ ] 所有初始化都延迟到函数内部？
- [ ] 运行 `node scripts/check-sync-io.js` 通过检测？

### 自动化检测

项目提供自动检测脚本，在 CI 和本地开发时使用：

```bash
# 检查所有路由模块
node scripts/check-sync-io.js

# 输出示例：
# 🔍 检查模块级同步 I/O...
# ✅ status.js
# ❌ memory.js
#    第 16 行：fs.existsSync()
#    第 17 行：fs.mkdirSync()
# ❌ 发现 2 个问题
```

**CI 集成**：在 `.github/workflows/ci.yml` 中添加：

```yaml
- name: Check for module-level sync I/O
  run: node scripts/check-sync-io.js
```

### 错误处理
- [ ] 所有异步操作都有 `try/catch`？
- [ ] 文件操作检查权限和存在性？
- [ ] 网络请求有超时和重试？

### 性能
- [ ] 使用异步 I/O 而非同步？
- [ ] 大文件使用流式处理？
- [ ] 缓存重复计算结果？

### 日志
- [ ] 关键操作有日志记录？
- [ ] 错误有详细堆栈信息？
- [ ] 日志级别合理（info/warn/error）？

---

## 🔧 开发规范

### 文件组织

```
server/
├── index.js          # 入口文件
├── routes/           # 路由模块
│   ├── status.js     # ✅ 只导出 router，不在顶层执行 I/O
│   ├── backup.js     # ✅ 初始化延迟到路由处理
│   └── ...
└── middleware/       # 中间件
```

### 路由模块模板

```javascript
import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// ✅ 定义路径（不执行 I/O）
const DATA_DIR = path.join(__dirname, '../../data');

// ✅ 封装初始化逻辑
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// ✅ 在路由处理中调用
router.get('/list', (req, res) => {
  try {
    ensureDataDir(); // 需要时才检查
    const files = fs.readdirSync(DATA_DIR);
    res.json({ success: true, files });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

---

## 🚨 常见陷阱

### 陷阱 1：配置文件读取

```javascript
// ❌ 错误
const config = require('./config.json');

// ✅ 正确
function getConfig() {
  return require('./config.json');
}
```

### 陷阱 2：数据库连接

```javascript
// ❌ 错误
const db = sqlite3.openSync('db.sqlite');

// ✅ 正确
let _db = null;
function getDb() {
  if (!_db) {
    _db = sqlite3.openSync('db.sqlite');
  }
  return _db;
}
```

### 陷阱 3：目录检查

```javascript
// ❌ 错误
const UPLOAD_DIR = '/tmp/uploads';
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

// ✅ 正确
const UPLOAD_DIR = '/tmp/uploads';
function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR);
  }
}
```

---

## 📚 参考资料

- [Node.js 事件循环](https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/)
- [Express 性能最佳实践](https://expressjs.com/en/advanced/best-practice-performance.html)
- [Node.js 异步编程](https://nodejs.org/en/learn/asynchronous-work/overview)

---

*违反此规范的代码将在 Code Review 中被拒绝。*
