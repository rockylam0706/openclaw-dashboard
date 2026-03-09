# Plan A 实施报告 - 飞书会话独立读取

**版本**: v2.0.15  
**日期**: 2026-03-07 16:50  
**实施状态**: ✅ 完成

---

## 📋 问题背景

### 问题描述

飞书聊天窗口无法显示 AI 通过飞书通道发送的回复消息，只能显示用户发送给 AI 的消息。

### 根因分析

**飞书 API 读取了错误的会话！**

```javascript
// ❌ 错误代码（v2.0.14 及之前）
const mainSession = sessionsData['agent:main:main']; // 读取 WebUI 会话
```

这导致：
- ✅ 用户通过飞书发送的消息 → 转发到 WebUI 会话 → 飞书窗口**能显示**
- ❌ AI 通过飞书回复的消息 → 存储在飞书会话 → 飞书窗口**看不到**！

### 会话结构

OpenClaw 为不同通道创建独立的会话：

| 会话类型 | Session Key | JSONL 文件 | 存储内容 |
|----------|-------------|------------|----------|
| **WebUI** | `agent:main:main` | `5eae52c0-....jsonl` | WebUI 对话 + 工具调用 |
| **飞书** | `agent:main:feishu:group:oc_...` | `83e7a763-....jsonl` | 飞书对话 + AI 回复 |

---

## 🔧 解决方案

### 方案 A：修改飞书 API 读取飞书会话（已实施）✅

**核心思路**：
1. 查找所有包含 `feishu` 的会话（支持私聊 + 群聊）
2. 合并所有飞书会话的消息
3. 按时间排序后返回

**代码修改**：`server/routes/chat.js` 第 237+ 行

```javascript
// ✅ 方案 A：查找所有飞书会话（支持私聊 + 群聊）
const feishuSessionKeys = Object.keys(sessionsData).filter(key => 
  key.includes('feishu')
);

// ✅ 合并所有飞书会话的消息
const allFeishuLines = [];
for (const sessionKey of feishuSessionKeys) {
  const session = sessionsData[sessionKey];
  const jsonlFile = path.join(SESSIONS_DIR, `${session.sessionId}.jsonl`);
  const content = fs.readFileSync(jsonlFile, 'utf-8');
  const lines = content.trim().split('\n').filter(line => line.trim());
  allFeishuLines.push(...lines);
}

// ✅ 按时间戳排序（旧→新）
allFeishuLines.sort((a, b) => {
  const timeA = JSON.parse(a).timestamp;
  const timeB = JSON.parse(b).timestamp;
  return timeA - timeB;
});
```

### 消息分类逻辑

飞书会话中的消息按 `role` 字段分类：

```javascript
if (msg.role === 'user' && textContent.trim().length > 0) {
  // ✅ 飞书用户消息（显示在飞书窗口）
  messages.push({ role: 'user', sender: '用户', isFeishu: true });
} else if (msg.role === 'assistant' && textContent.trim().length > 0) {
  // ✅ AI 回复（显示在飞书窗口）
  messages.push({ role: 'assistant', sender: 'AI', isFeishu: false });
} else if (msg.role === 'toolResult' || hasExecInfo) {
  // 🔧 工具消息（飞书窗口不显示，存储在 toolMessages）
  toolMessages.push({ role: 'toolResult', ... });
}
```

---

## 📊 实施效果

### 验证结果

**飞书 API** (`/api/chat/feishu-messages`):
```bash
curl "http://localhost:18790/api/chat/feishu-messages?offset=485&limit=20"
```

返回：
```json
{
  "total": 505,
  "messagesCount": 8,
  "messages": [
    {"role": "user", "sender": "用户", "content": "System: [2026-03-06 16:38:13 GMT+8] Feishu..."},
    {"role": "assistant", "sender": "AI", "content": "收到！联调成功 🎉..."},
    {"role": "user", "sender": "用户", "content": "System: [2026-03-06 17:14:40 GMT+8] Feishu..."},
    {"role": "assistant", "sender": "AI", "content": "关于 MCP 联网搜索，我来解释一下..."}
  ]
}
```

**WebUI API** (`/api/chat/webui-messages`):
```bash
curl "http://localhost:18790/api/chat/webui-messages?offset=0&limit=5"
```

返回：
```json
{
  "total": 1698,
  "messagesCount": 2,
  "messages": [...]  // WebUI 独立消息
}
```

### 会话隔离验证

| 验证项 | 结果 |
|--------|------|
| 飞书 API 读取飞书会话 | ✅ 505 条消息 |
| WebUI API 读取 WebUI 会话 | ✅ 1698 条消息 |
| 飞书窗口显示用户消息 | ✅ `role: user` |
| 飞书窗口显示 AI 回复 | ✅ `role: assistant` |
| 工具消息分离存储 | ✅ `toolMessages[]` |
| 两个会话互不干扰 | ✅ 完全独立 |

---

## 🎯 优势

### 1. 符合 OpenClaw 设计
- ✅ 会话隔离：不同通道独立存储
- ✅ 职责清晰：飞书会话存储飞书对话

### 2. 消息完整性
- ✅ 用户消息：飞书 → AI
- ✅ AI 回复：AI → 飞书
- ✅ 双向对话完整显示

### 3. 扩展性
- ✅ 支持多个飞书会话（私聊 + 群聊）
- ✅ 自动发现所有 `feishu` 会话
- ✅ 无需硬编码 sessionKey

### 4. 性能优化
- ✅ 分页加载：`offset` + `limit`
- ✅ 按时间排序：旧→新
- ✅ 工具消息分离：减少飞书窗口 DOM 节点

---

## ⚠️ 注意事项

### 1. 消息内容提取

飞书会话中的消息可能包含多种类型：

```javascript
// assistant 消息 content 结构
{
  "content": [
    {"type": "thinking", "thinking": "..."},      // 思考过程（不显示）
    {"type": "text", "text": "..."},              // 实际回复（显示）
    {"type": "toolCall", "name": "..."}           // 工具调用（不显示）
  ]
}
```

**提取逻辑**：只提取 `type: text` 的内容

```javascript
let textContent = '';
if (Array.isArray(msg.content)) {
  msg.content.forEach(item => {
    if (item.type === 'text') textContent += item.text;
  });
}
```

### 2. 空消息过滤

如果 assistant 消息只有 `thinking` + `toolCall`，没有 `text`，则 `textContent` 为空，该消息不会显示。

**场景**：AI 正在执行工具调用，还没有生成最终回复。

**解决**：这是正常行为，用户会在工具执行完成后看到 AI 的回复。

### 3. 时间戳格式统一

飞书会话和 WebUI 会话的时间戳格式可能不同：

```javascript
// 统一转换为毫秒时间戳
timestamp: entry.timestamp 
  ? (typeof entry.timestamp === 'string' 
      ? new Date(entry.timestamp).getTime() 
      : entry.timestamp) 
  : Date.now()
```

---

## 📝 测试指南

### 1. 验证飞书消息加载

```bash
# 加载最新 20 条消息
curl "http://localhost:18790/api/chat/feishu-messages?offset=0&limit=20"

# 加载历史消息（第 2 页）
curl "http://localhost:18790/api/chat/feishu-messages?offset=20&limit=20"

# 验证返回结构
# - messages[]: 用户消息 + AI 回复
# - toolMessages[]: 工具执行结果（飞书窗口不显示）
```

### 2. 验证会话隔离

```bash
# 飞书 API 不应该返回 WebUI 消息
curl "http://localhost:18790/api/chat/feishu-messages" | jq '.messages[] | select(.channel == "webui")'
# 预期：空数组 []

# WebUI API 不应该返回飞书消息
curl "http://localhost:18790/api/chat/webui-messages" | jq '.messages[] | select(.isFeishu == true)'
# 预期：空数组 []
```

### 3. 前端测试

1. 打开 Dashboard: `http://localhost:18790`
2. 切换到「飞书」标签
3. 验证消息显示：
   - ✅ 用户消息（右侧，绿色背景）
   - ✅ AI 回复（左侧，白色背景）
   - ✅ 工具消息不显示（在 WebUI 标签查看）
4. 点击「📜 加载更多历史消息」
5. 验证历史消息正确加载

---

## 🔄 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| v2.0.14 | 2026-03-07 16:26 | 手动加载更多 |
| **v2.0.15** | **2026-03-07 16:50** | **✅ Plan A: 飞书会话独立读取** |

---

## 📚 相关文档

- [`docs/A2-SCHEME-IMPLEMENTATION.md`](./A2-SCHEME-IMPLEMENTATION.md) - A2 方案完整实现
- [`docs/PERF-OPTIMIZATION-2026-03-07.md`](./PERF-OPTIMIZATION-2026-03-07.md) - 分页性能优化
- [`docs/CHAT-FIX-2026-03-07.md`](./CHAT-FIX-2026-03-07.md) - 聊天通道分离修复
- [`server/routes/chat.js`](../server/routes/chat.js) - 聊天 API 实现（第 237+ 行）

---

## ✅ 总结

**Plan A 实施成功！** 🦞

- ✅ 飞书 API 现在读取飞书会话（不是 WebUI 会话）
- ✅ 飞书窗口显示完整的对话历史（用户消息 + AI 回复）
- ✅ WebUI 和飞书会话完全隔离，互不干扰
- ✅ 支持多个飞书会话（私聊 + 群聊自动发现）
- ✅ 符合 OpenClaw 的会话隔离设计原则

**下一步**：用户测试验证，确认飞书窗口显示符合预期。
