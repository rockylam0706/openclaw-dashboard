# Dashboard 问题解答

## 5. 当前任务模块的数据来源

**数据来源：** `/api/tasks` → `server/routes/tasks.js`

**获取方式：**
```bash
openclaw-cn task current --json
```

**为什么是空的？**
- OpenClaw 当前**没有运行中的任务**
- `openclaw-cn task current` 命令返回空或失败
- 这是正常状态，表示系统空闲

**任务什么时候会有？**
- 当你通过飞书发送任务请求时（如"帮我搜索 XXX"）
- 当你在 Dashboard 执行快捷命令时
- 当有子 agent 被 spawn 时

**修复方案（已实现）：**
- 显示"待命中..."友好提示
- 状态显示为"idle"（待命）
- 绿色状态标识，表示系统正常待命

---

## 6. ToDo 列表模块的数据来源

**当前实现：** 前端本地存储（localStorage）

**数据流：**
```
用户添加 ToDo → 保存到浏览器 localStorage → 刷新页面后从 localStorage 读取
```

**在 OpenClaw 中如何体现？**

目前 ToDo 列表**独立于 OpenClaw**，是纯前端功能。如果要在 OpenClaw 中体现，有几种方案：

### 方案 A：对接 OpenClaw 任务系统
```bash
# 保存 ToDo 到 OpenClaw
openclaw-cn task add "购买牛奶" --due "2026-03-08"

# 读取 OpenClaw 任务
openclaw-cn task list --status pending
```

**优点：** 任务统一管理，可在飞书中接收提醒
**缺点：** 需要 OpenClaw 支持任务管理命令

### 方案 B：对接飞书任务
```javascript
// 使用飞书 Task API
feishu_task create --summary "购买牛奶" --due "2026-03-08"
```

**优点：** 飞书原生体验，支持提醒和协作
**缺点：** 需要飞书 API 权限

### 方案 C：对接记忆系统
```bash
# 保存到待办记忆
echo "- [ ] 购买牛奶" >> memory/2026-03-07.md
```

**优点：** 简单，与记忆系统集成
**缺点：** 无提醒功能

**推荐方案：** 方案 B（飞书任务）- 最符合用户工作流

---

## 4. 运行时长的定义

**当前问题：**
- 之前显示的是 Dashboard 进程的运行时间（`process.uptime()`）
- 不是网关的真实运行时间

**修复方案（已实现）：**
- 通过 `ps -o etime= -p <PID>` 获取网关进程真实运行时间
- 解析格式：`[[DD-]hh:]mm:ss`
- 转换为秒数显示

**显示格式：**
- `< 1 小时`: `mm 分 ss 秒`
- `< 1 天`: `hh 小时 mm 分`
- `≥ 1 天`: `DD 天 hh 小时`

---

## 新增：各模块数据来源说明

| 模块 | 数据源 | API 路径 | 刷新频率 |
|------|--------|----------|----------|
| 系统状态 | `openclaw-cn gateway status` | `/api/status` | 5 秒 |
| 当前任务 | `openclaw-cn task current` | `/api/tasks` | 30 秒 |
| ToDo 列表 | localStorage（前端） | `/api/todo` | 手动 |
| 记忆管理 | 读取 `memory/` 文件夹 | `/api/memory` | 手动 |
| 元文档 | 读取 `*.md` 文件 | `/api/meta` | 手动 |
| Cron 任务 | `openclaw-cn cron list` | `/api/cron` | 手动 |
| 快捷命令 | 执行 `openclaw-cn` 命令 | `/api/command` | 手动 |
