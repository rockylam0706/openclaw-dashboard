# 🚀 OpenClaw Dashboard 快速启动指南

## 一键启动

### 开发模式（推荐）
```bash
cd /Users/rockylam/.openclaw/workspace/projects/openclaw-dashboard
npm install
npm run dev
```

访问：http://localhost:18790

### 生产模式
```bash
cd /Users/rockylam/.openclaw/workspace/projects/openclaw-dashboard
npm install
npm run build
npm start
```

访问：http://localhost:18790

---

## 功能预览

### 1. 状态监控
- 网关运行状态实时显示
- 端口、PID、运行时长
- Dashboard 内存使用

### 2. 任务管理
- 当前任务卡片
- 实时计时器（5 分钟警告，10 分钟告警）
- 任务进度条

### 3. TODO 列表
- 添加/完成/删除任务
- 进度统计

### 4. 文档编辑
- 在线编辑 MD 文档
- 自动保存到 memory 目录

### 5. Cron 管理
- 可视化创建/编辑/删除
- 启用/禁用切换

### 6. 快捷命令
- 查看状态
- 重启网关（危险操作二次确认）
- 清理缓存
- 查看日志

---

## 项目结构

```
openclaw-dashboard/
├── server/              # 后端 Express 服务器
│   ├── index.js        # 主入口
│   └── routes/         # API 路由
├── src/                # 前端 React 源码
│   ├── components/     # React 组件
│   ├── styles/         # 样式文件
│   └── App.jsx         # 主组件
├── public/             # 静态资源
├── dist/               # 构建输出（生产环境）
└── package.json        # 项目配置
```

---

## API 文档

### REST API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/status` | GET | 获取网关状态 |
| `/api/tasks` | GET | 获取任务列表 |
| `/api/sessions` | GET | 获取会话列表 |
| `/api/memory` | GET | 获取 MD 文档 |
| `/api/memory` | PUT | 更新 MD 文档 |
| `/api/cron` | GET | 获取 Cron 任务 |
| `/api/cron` | POST | 创建 Cron 任务 |
| `/api/cron/:id` | PUT | 更新 Cron 任务 |
| `/api/cron/:id` | DELETE | 删除 Cron 任务 |
| `/api/command` | POST | 执行命令 |

### WebSocket

- 端点：`ws://localhost:18790/ws`
- 消息类型：`heartbeat`（每 5 秒）

---

## 常见问题

### Q: 端口被占用怎么办？
A: 修改 `server/index.js` 中的 `PORT` 变量和 `vite.config.js` 中的端口配置。

### Q: 如何对接真实数据？
A: 修改 `server/routes/` 下的对应路由文件，调用 `openclaw-cn` 命令获取真实数据。

### Q: 如何添加新命令？
A: 在 `server/routes/command.js` 的 `COMMANDS` 对象中添加新命令配置。

### Q: 如何自定义主题色？
A: 修改 `tailwind.config.js` 中的 `colors.brand` 配置。

---

## 技术支持

- 项目路径：`/Users/rockylam/.openclaw/workspace/projects/openclaw-dashboard/`
- 文档：`README.md`, `ACCEPTANCE-REPORT.md`
- PRD: `PRD-v1.0.md`

---

Made with ❤️ by OpenClaw Team 🦞
