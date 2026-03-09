# CHANGELOG - OpenClaw Dashboard

## v2.0.7 (2026-03-07 13:45) - A2 方案实施 🎉

### ✨ 重大更新

**完全学习 OpenClaw WebUI 的消息处理设计**

#### 📦 消息分离架构 (A2 方案)

- ✅ **后端 API 重构**: 所有聊天 API 返回两个独立数组
  - `messages[]`: 普通对话消息
  - `toolMessages[]`: 工具调用消息
- ✅ **前端组件重构**: 6 个新组件实现分离渲染
  - `CopyButton`: 复制按钮（悬停显示）
  - `MarkdownContent`: Markdown 渲染（marked + DOMPurify）
  - `ConversationMessage`: 普通对话（完整显示）
  - `ExecResultMessage`: 工具结果（折叠显示）
  - `FeishuMessage`: 飞书消息（带标识）
  - `MessageRenderer`: 消息渲染器（类型判断）
- ✅ **时间排序**: 合并显示时按时间戳排序，保持 chronological 顺序

#### 🎨 UI/UX 增强

- ✅ **Markdown 渲染**: 支持完整的 GitHub Flavored Markdown
  - 标题（h1-h4）、粗体、斜体、下划线
  - 代码块（等宽字体 + 背景色）
  - 表格（边框 + 交替行背景）
  - 引用块（左侧标识线）
  - 链接（可点击 + 安全过滤）
  - 图片（最大宽度 100%）
  - 列表（有序 + 无序）
- ✅ **复制功能**: 学习 OpenClaw WebUI 设计
  - 鼠标悬停显示复制按钮
  - 复制成功/失败状态反馈
  - 动画效果（缩放 + 颜色变化）
- ✅ **工具消息折叠**: 结构化显示
  - 默认显示摘要（工具名 + 状态 + 退出码）
  - 点击展开查看完整输出
  - 状态颜色（绿色成功/红色失败）
- ✅ **飞书消息标识**: 左侧蓝色标识线 + 类型标记

#### 🔒 安全增强

- ✅ **XSS 防护**: DOMPurify 过滤所有 HTML
  - 白名单机制（只允许安全标签）
  - 禁止所有事件处理器
  - 链接自动添加 `rel="noreferrer noopener"`

#### 📦 依赖更新

```json
{
  "marked": "^15.0.6",      // Markdown 解析
  "dompurify": "^3.2.4"     // XSS 过滤
}
```

#### 📝 文档更新

- ✅ `docs/A2-SCHEME-IMPLEMENTATION.md`: A2 方案实施报告
- ✅ `docs/OPENCLAW-WEBUGI-ANALYSIS.md`: OpenClaw WebUI 分析报告

---

### 📊 性能影响

| 指标 | v2.0.6 | v2.0.7 | 变化 |
|------|--------|--------|------|
| JS 包大小 | 133 KB | 133 KB | ➖ |
| CSS 包大小 | 28 KB | 31 KB | ⬆️ +3 KB |
| 首次渲染 | ~100ms | ~120ms | ⬆️ +20ms |
| 空闲内存 | 65 MB | 67 MB | ⬆️ +2 MB |

**结论**: 性能影响可接受，用户体验提升显著。

---

### 🧪 测试验证

- ✅ 消息分离正确（WebUI/飞书/全部频道）
- ✅ Markdown 渲染正确（所有格式支持）
- ✅ 复制功能正常（悬停显示 + 反馈）
- ✅ 工具消息折叠正常（展开/收起）
- ✅ XSS 过滤正常（危险标签被移除）

---

### 🎯 用户体验提升

| 方面 | v2.0.6 | v2.0.7 | 提升 |
|------|--------|--------|------|
| 消息显示 | 纯文本 | Markdown 富文本 | ⬆️⬆️⬆️ |
| 代码块 | 普通文本 | 等宽字体 + 背景 | ⬆️⬆️ |
| 工具消息 | 混合显示 | 结构化折叠 | ⬆️⬆️⬆️ |
| 复制功能 | 无 | 悬停复制按钮 | ⬆️⬆️ |
| 表格 | 不支持 | 完整支持 | ⬆️⬆️ |
| 链接 | 纯文本 | 可点击链接 | ⬆️⬆️ |

---

## v2.0.6 (2026-03-07 13:06) - 消息类型标记

### ✨ 新增功能

- ✅ 后端 `extractToolInfo()` 函数：提取工具调用信息
- ✅ 后端 `getMessageType()` 函数：判断消息类型
- ✅ 前端 `ConversationMessage` 组件：普通对话（不压缩）
- ✅ 前端 `ExecResultMessage` 组件：工具结果（折叠）
- ✅ 前端 `SystemMessage` 组件：系统消息（简化）
- ✅ 前端 `FeishuMessage` 组件：飞书消息（带标识）

### 🐛 Bug 修复

- ✅ 修复 AI 回复被错误压缩的问题
- ✅ 修复飞书长消息（含工具调用）未折叠的问题

### 📝 文档

- ✅ `docs/MESSAGE-TYPE-FIX-2026-03-07.md`: 消息类型修复详情

---

## v2.0.5-fix (2026-03-07 12:55) - 消息顺序回归修复

### 🐛 紧急修复

- ✅ 修复 v2.0.5 引入的消息顺序回归
- ✅ 移除 `server/routes/chat.js` 第 181 行的 `.reverse()`
- ✅ 移除 `server/routes/chat.js` 第 241 行的 `.reverse()`

### 📝 文档

- ✅ `docs/MESSAGE-ORDER-FIX-v2.0.5.md`: 回归修复详情

---

## v2.0.5 (2026-03-07 12:32) - 聊天窗口优化

### ✨ 新增功能

- ✅ 聊天窗口容器高度增加（760px）
- ✅ WebSocket 实时监控增强（文件大小/mtime 变化检测）

### 🐛 Bug 修复

- ✅ 修复聊天频道分离问题（WebUI/飞书显示独立消息）
- ✅ 修复消息顺序问题（移除 `.reverse()`，chronological 显示）

### 📝 文档

- ✅ `docs/CHAT-FIX-2026-03-07.md`: 频道分离修复
- ✅ `docs/CHAT-REALTIME-FIX-2026-03-07.md`: 实时性修复

---

## v2.0.4 (2026-03-07 12:07) - 布局优化

### ✨ 布局重构

- ✅ 4 行网格布局（Task+TODO, Memory+Cron, Backup+MetaDocs, Commands）
- ✅ 无空白间隙，视觉流畅

### 🐛 Bug 修复

- ✅ 修复版本号不一致（Header/Footer 都显示 v2.0.4）
- ✅ 修复 HTML 缓存问题（设置 no-cache）

---

## v2.0.3 (2026-03-07 10:15) - 移动端优化

### ✨ 新增功能

- ✅ 移动端响应式设计（@media max-width: 768px）
- ✅ 按钮点击区域 ≥44px（移动交互标准）
- ✅ 输入框字体 16px（防止 iOS 自动缩放）
- ✅ 详细错误捕获（stack trace + 设备信息）

### 🐛 Bug 修复

- ✅ 修复 `CronManager.jsx` 初始化顺序（loadTasks 函数前置）
- ✅ 修复网关状态检测（15s timeout + PID 提取）
- ✅ 修复 React 19 兼容性问题（降级到 React 18.3.1）
- ✅ 修复 Vite 配置（minify: false, inlineDynamicImports: true）

### 📝 文档

- ✅ `CHANGELOG-v2.0.3.md`: 完整更新日志
- ✅ `TEST-CHECKLIST-v2.0.3.md`: 测试清单

---

## v2.0.2 (2026-03-07 09:00) - 性能优化

### ✨ 性能提升

- ✅ 修复 `memory.js` 同步 I/O（3.5-7s → 17ms）
- ✅ 优化网关状态 API（3.5s → 1-2ms，3000x 提升）
- ✅ 添加 10 秒缓存 + 异步执行

### 🛠️ 工具

- ✅ 创建 `scripts/check-sync-io.js`：自动化同步 I/O 检测
- ✅ 添加 `npm run check:sync-io` 脚本

### 📝 文档

- ✅ `INCIDENT-2026-03-07.md`: 两个事故报告
- ✅ `CONTRIBUTING.md`: 开发指南（禁止顶层同步 I/O）
- ✅ `PERFORMANCE-TEST-2026-03-07.md`: 性能测试报告

---

## v2.0.1 (2026-03-07 08:00) - 初始发布

### ✨ 核心功能

- ✅ 任务管理（Task Card）
- ✅ TODO 列表
- ✅ 内存管理（Memory Manager）
- ✅ Cron 管理器
- ✅ 备份管理器
- ✅ 文档管理（MetaDocs）
- ✅ 命令面板
- ✅ 聊天窗口（基础版）

### 🎨 UI/UX

- ✅ 深色主题
- ✅ 卡片式设计
- ✅ 响应式布局
- ✅ 动画效果

---

**当前版本**: v2.0.7  
**总版本数**: 10 (v2.0.1 → v2.0.7 + 3 个修复版本)  
**开发周期**: 1 天 (2026-03-07)
