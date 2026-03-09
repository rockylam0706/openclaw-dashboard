# Changelog - v2.0.16 (2026-03-07)

## 🚀 新增功能

### 飞书消息合并（实验性）
- 修改 `/api/chat/feishu-messages` API 同时读取两个会话来源：
  - 飞书会话（AI 的飞书回复）
  - WebUI 主会话中过滤出 `Feishu[default]` 的用户消息
- 基于消息时间戳排序（旧→新）
- 支持分页加载（offset/limit）

## 🐛 Bug 修复

### 核心修复
- 修复飞书会话读取时包含非 message 类型条目（session/model_change 元数据）
- 修复时间戳解析问题（统一处理字符串/数字格式）
- 修复变量初始化顺序错误

### 代码优化
- 移除调试日志（保持代码整洁）
- 优化消息过滤逻辑
- 改进错误处理

## ⚠️ 已知问题

### 飞书窗口用户消息显示问题
- **问题**：飞书窗口不显示用户发送的飞书消息
- **影响**：用户只能看到 AI 回复，看不到自己的消息
- **状态**：暂时接受，计划未来版本修复
- **详见**：[KNOWN-ISSUES-v2.0.16.md](KNOWN-ISSUES-v2.0.16.md)

## 📊 统计信息

| 指标 | 数值 |
|-----|------|
| 飞书会话消息 | 501 条 |
| WebUI 飞书消息 | 22 条 |
| 合并后总数 | 523 条 |
| 当前显示 | 6 条（仅 AI 消息） |
| 缺失消息 | 32 条用户消息 |

## 📝 技术细节

### 修改文件
- `server/routes/chat.js` - 飞书 API 重构
- `package.json` - 版本号更新

### 代码变更
```javascript
// 步骤 1：读取飞书会话（AI 回复）
const feishuSessionKeys = Object.keys(sessionsData).filter(key => 
  key.includes('feishu')
);

// 步骤 2：读取 WebUI 会话，过滤飞书用户消息
const mainSession = sessionsData['agent:main:main'];
// 过滤条件：type='message' + role='user' + content 包含 'Feishu['

// 步骤 3：合并并排序
allFeishuLines.sort((a, b) => timestampA - timestampB);
```

## 🔄 版本历史

- **v2.0.15** - Plan A 实现（只读取飞书会话）
- **v2.0.16** - 尝试合并两个会话（当前版本，有已知问题）
- **v2.0.17 (计划)** - 彻底重构合并逻辑

## 📅 发布说明

**发布时间**：2026-03-07 18:10  
**发布状态**：⚠️ 实验性功能，有已知问题  
**建议**：生产环境谨慎使用

---

**备注**：此版本主要尝试解决飞书消息碎片化问题，但由于技术复杂性，用户消息显示功能未能完全实现。计划在未来版本中彻底重构。
