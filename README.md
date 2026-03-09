# 🦞 OpenClaw Dashboard v2.0

实时监控 OpenClaw 状态的网页面板，基于 Node.js + React + Vite + Tailwind CSS 技术栈。

**v2.0 全新特性：** 现代化卡片式布局、Winston 日志、公网访问支持、自动刷新、元文档管理、增强记忆模块！

## ✨ 功能特性

### 后端 API
- `GET /api/status` - 网关状态监控（对接真实网关）
- `GET /api/tasks` - 当前任务状态（30 秒自动刷新）
- `GET /api/sessions` - 会话列表
- `GET /api/memory` - 获取记忆文档（支持长期/短期记忆）
- `GET /api/memory/list` - 获取记忆文件列表
- `PUT /api/memory` - 更新记忆文档
- `GET /api/cron` - Cron 任务列表（含模板和预设）
- `POST /api/cron` - 创建 Cron 任务
- `PUT /api/cron/:id` - 更新 Cron 任务
- `DELETE /api/cron/:id` - 删除 Cron 任务
- `GET /api/cron/templates` - 获取任务模板
- `GET /api/cron/presets` - 获取 Cron 预设
- `POST /api/command` - 执行 openclaw-cn 命令
- `GET /api/docs/list` - 获取元文档列表
- `GET /api/docs/:id` - 获取元文档内容
- `PUT /api/docs/:id` - 更新元文档

### WebSocket 实时推送
- 心跳信号（每 5 秒）
- 网关状态自动刷新
- 任务进度推送

### 前端组件
- **Header** - 标题 + 主题切换 + v2.0 标识
- **StatusBar** - 网关状态指示器（带刷新按钮）
- **TaskCard** - 任务卡片（带计时器 + 刷新按钮）
- **TodoList** - TODO 列表（localStorage 持久化）
- **MemoryManager** - 记忆管理器（长期/短期记忆 + 日期选择）
- **MDEditor** - 日常记忆编辑器
- **MetaDocs** - 元文档管理器（USER/SOUL/IDENTITY/TOOLS/HEARTBEAT）
- **CronManager** - Cron 任务管理（小白友好表单）
- **CommandPanel** - 快捷命令面板（小按钮 + 弹窗确认）

## 🚀 快速开始

### 安装依赖

```bash
cd /Users/rockylam/.openclaw/workspace/projects/openclaw-dashboard
npm install
```

### 开发模式

```bash
# 启动开发服务器（带热重载）
npm run dev
```

访问 http://localhost:18790

### 📱 局域网访问

在同一局域网内的其他设备（手机、平板等）可通过 IP + 端口访问：

```bash
# 1. 获取本机 IP 地址
# macOS:
ipconfig getifaddr en0

# 2. 在其他设备浏览器访问
http://<你的 IP 地址>:18790

# 示例：
# http://192.168.1.100:18790
```

**注意：** 确保防火墙允许 18790 端口入站连接

### 生产构建

```bash
# 构建生产版本
npm run build

# 启动生产服务器（PM2）
pm2 restart openclaw-dashboard
# 或
npm start
```

## 📋 快捷命令

| 命令 | 说明 | 危险等级 |
|------|------|----------|
| 查看状态 | 查看 OpenClaw 网关当前运行状态 | ✅ 安全 |
| 重启网关 | 重启 OpenClaw 网关服务 | ⚠️ 危险（需二次确认） |
| 清理缓存 | 清理系统缓存 | ✅ 安全 |
| 查看日志 | 查看最近 50 条系统日志 | ✅ 安全 |

## 🎨 UI 设计

- **配色方案：** 深色模式默认，小龙虾橙品牌色 (#FF6B35)
- **布局风格：** 现代化卡片式设计，清晰层次，合理留白
- **响应式设计：** 完美适配 PC + 移动端 (320px-1920px)
- **动画效果：** 流畅 60fps，悬停效果，脉冲动画
- **设计参考：** shadcn/ui, Tailwind UI

## 📁 项目结构

```
openclaw-dashboard/
├── server/
│   ├── index.js          # Express 服务器入口（Winston 日志 + 公网访问）
│   └── routes/
│       ├── status.js     # 状态 API（对接真实网关）
│       ├── tasks.js      # 任务 API
│       ├── sessions.js   # 会话 API
│       ├── memory.js     # 记忆 API（长期 + 短期）
│       ├── cron.js       # Cron API（模板 + 预设）
│       ├── command.js    # 命令 API
│       └── docs.js       # 元文档 API（新增）
├── src/
│   ├── main.jsx          # React 入口
│   ├── App.jsx           # 主组件（自动刷新机制）
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── StatusBar.jsx     # 带刷新按钮
│   │   ├── TaskCard.jsx      # 带刷新按钮
│   │   ├── TodoList.jsx
│   │   ├── MDEditor.jsx      # 日常记忆
│   │   ├── MemoryManager.jsx # 记忆管理（新增）
│   │   ├── MetaDocs.jsx      # 元文档（新增）
│   │   ├── CronManager.jsx   # 小白友好表单
│   │   └── CommandPanel.jsx  # 小按钮 + 弹窗
│   └── styles/
│       └── globals.css   # 全局样式
├── logs/                 # 日志目录（Winston）
│   ├── app.log
│   └── error.log
├── public/
│   └── vite.svg
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

## ⚙️ 配置说明

### 端口配置
- Dashboard 端口：18790（监听 0.0.0.0，支持公网访问）
- OpenClaw Gateway 端口：18789

### 环境变量
- `DASHBOARD_PORT` - 自定义 Dashboard 端口（默认 18790）
- `NODE_ENV` - 运行环境（development/production）

### 自动刷新机制
- **网关状态：** 5 秒自动刷新（WebSocket 心跳触发）
- **任务列表：** 30 秒自动刷新
- **其他模块：** 60 秒自动刷新
- **手动刷新：** 每个模块右上角 🔄 按钮

## 🧪 验收标准

### v1.0 已完成
- [x] 网关状态实时显示
- [x] 任务状态准确（工作/待命/卡死）
- [x] 任务计时器（5 分钟警告，10 分钟告警）
- [x] TODO 列表显示
- [x] MD 文档在线编辑
- [x] Cron 任务可视化管理
- [x] 快捷命令（带说明 + 二次确认）
- [x] PC+ 移动端适配
- [x] UI 美观现代

### v2.0 新增
- [x] 排版优化（卡片式、清晰层次、合理留白）
- [x] 快捷命令小按钮 + 二次确认弹窗
- [x] 网关状态对接真实网关
- [x] Winston 日志记录到 logs/ 目录
- [x] 公网访问支持（监听 0.0.0.0）
- [x] 每个模块刷新按钮
- [x] 自动刷新机制（5s/30s/60s）
- [x] 元文档模块（USER/SOUL/IDENTITY/TOOLS/HEARTBEAT）
- [x] 记忆模块修复（长期 + 短期，日期选择）
- [x] Cron 优化（小白友好表单）

## 📝 注意事项

1. **日志管理：** Winston 日志自动轮转（5MB/文件，保留 5 个文件）
2. **命令版本：** 使用 `openclaw-cn` 命令（不是 `openclaw`）
3. **响应式：** 已适配移动端（320px-1920px）
4. **公网访问：** 默认监听 0.0.0.0，注意防火墙配置
5. **内存优化：** 避免内存泄漏，长时间运行应<100MB

## 📊 更新日志

### v2.0.0 (2026-03-06)
- 🎨 全新现代化卡片式布局
- 📝 新增 Winston 日志系统
- 🌐 支持公网访问（0.0.0.0）
- 🔄 自动刷新机制（5s/30s/60s）
- 🧠 增强记忆模块（长期 + 短期）
- 📄 新增元文档管理
- ⚡ 优化 Cron 任务创建（小白友好）
- 🔘 优化快捷命令（小按钮 + 弹窗）
- 💾 TODO 列表持久化（localStorage）

### v1.0.0 (2026-03-06)
- 🎉 初始版本发布
- 基础监控功能
- WebSocket 实时推送
- 响应式设计

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

ISC

---

Made with ❤️ by OpenClaw Team | v2.0
