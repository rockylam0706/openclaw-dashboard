# OpenClaw WebUI vs Dashboard 消息处理差异分析

**日期**: 2026-03-07  
**目的**: 找出 Dashboard 与 OpenClaw WebUI 的消息处理差异，实现相同体验

---

## 🔍 核心差异

### OpenClaw WebUI 设计

**数据结构**：
```javascript
// 两个独立的消息数组
chatMessages: []        // 普通对话消息（用户/AI）
chatToolMessages: []    // 工具调用消息（单独管理）

// 工具流管理
toolStreamById: Map     // toolCallId → toolMessage
toolStreamOrder: []     // 工具调用顺序
```

**消息分离逻辑**：
```javascript
// 普通消息
{
  role: "user" | "assistant",
  content: [
    { type: "text", text: "..." }
  ],
  timestamp: 1234567890
}

// 工具调用消息（单独存储）
{
  toolCallId: "call_xxx",
  name: "read",
  args: { path: "~/.openclaw/MEMORY.md" },
  output: "文件内容...",
  startedAt: 1234567890,
  updatedAt: 1234567895
}
```

**渲染逻辑**：
```jsx
// 分别渲染
{chatMessages.map(msg => (
  <ChatMessage msg={msg} />  // 完整显示，不压缩
))}

{chatToolMessages.map(toolMsg => (
  <ToolMessage toolMsg={toolMsg} />  // 结构化折叠显示
))}
```

---

### Dashboard 当前设计

**数据结构**：
```javascript
// 单一消息数组（混合所有类型）
messages: [
  {
    id: "webui_123",
    role: "assistant" | "toolResult",
    content: "...",  // 混合了文本 + 工具结果
    messageType: "conversation" | "feishu",
    toolInfo: null   // 尝试提取但失败
  }
]
```

**问题**：
1. ❌ **工具结果被当作普通消息** - `role: "toolResult"` 但 `messageType: "conversation"`
2. ❌ **工具信息提取失败** - `toolInfo: null`（因为内容已经是纯文本）
3. ❌ **无法区分对话和工具** - 所有内容都在一个 `content` 字段

---

## 📊 数据对比

### 同一条消息的两种处理

**场景**：AI 调用 `read` 工具读取文件

#### OpenClaw WebUI

```json
// chatMessages 数组
{
  "role": "assistant",
  "content": [
    { "type": "text", "text": "让我读取文件..." }
  ]
}

// chatToolMessages 数组（单独）
{
  "toolCallId": "call_xxx",
  "name": "read",
  "args": { "path": "~/.openclaw/MEMORY.md" },
  "output": "文件内容...",
  "status": "completed"
}

// 渲染：
// - 第一条：完整显示（AI 说的话）
// - 第二条：折叠显示（工具执行结果）
```

#### Dashboard

```json
// messages 数组（混合）
{
  "role": "toolResult",
  "content": "文件内容...",  // 只有纯文本
  "messageType": "conversation",  // ❌ 错误标记
  "toolInfo": null  // ❌ 无法提取
}

// 渲染：
// - 当作普通对话处理 → 完整显示（应该折叠）
```

---

## 🎯 关键发现

### 1. 消息分离是核心

**OpenClaw WebUI 成功的关键**：
- ✅ 工具调用在**工具事件流**中处理（WebSocket 实时推送）
- ✅ 普通对话在**chatMessages** 数组中
- ✅ 两个数组独立管理、独立渲染

**Dashboard 的问题**：
- ❌ 从 JSONL 文件读取时，工具结果已经是**纯文本**
- ❌ 丢失了工具调用的结构化信息（toolCallId, name, args）
- ❌ 无法区分"AI 说的话"和"工具执行结果"

### 2. 后端 API 差异

**OpenClaw WebUI 使用的 API**：
```
GET /api/chat.history
→ { messages: [...], toolMessages: [...] }  // 两个数组
```

**Dashboard 使用的 API**：
```
GET /api/chat/webui-messages
→ { messages: [...] }  // 一个数组，混合所有
```

### 3. 工具信息丢失

**JSONL 文件存储格式**：
```json
// 原始数据（有结构）
{
  "type": "message",
  "message": {
    "role": "toolResult",
    "toolCallId": "call_xxx",
    "toolName": "read",
    "content": [{"type": "text", "text": "文件内容..."}]
  }
}

// Dashboard 读取后（丢失结构）
{
  "role": "toolResult",
  "content": "文件内容..."  // 只提取了文本
}
```

---

## 💡 解决方案

### 方案 A2：完全学习 OpenClaw（推荐）

**步骤 1：修改后端 API**
```javascript
// server/routes/chat.js
router.get('/webui-messages', async (req, res) => {
  const messages = [];
  const toolMessages = [];
  
  lines.forEach((line) => {
    const entry = JSON.parse(line);
    if (entry.type === 'message') {
      const msg = entry.message;
      
      // ✅ 区分普通消息和工具消息
      if (msg.role === 'toolResult') {
        toolMessages.push({
          toolCallId: msg.toolCallId,
          name: msg.toolName,
          output: extractText(msg.content),
          timestamp: entry.timestamp
        });
      } else {
        messages.push({
          role: msg.role,
          content: extractText(msg.content),
          timestamp: entry.timestamp
        });
      }
    }
  });
  
  res.json({ 
    success: true,
    messages: messages,       // 普通对话
    toolMessages: toolMessages // 工具调用
  });
});
```

**步骤 2：修改前端数据结构**
```javascript
// src/components/ChatWindow.jsx
const [messages, setMessages] = useState([]);
const [toolMessages, setToolMessages] = useState([]);  // 新增

// 加载消息
const loadMessages = async () => {
  const res = await fetch('/api/chat/webui-messages');
  const data = await res.json();
  setMessages(data.messages || []);
  setToolMessages(data.toolMessages || []);  // 分离存储
};
```

**步骤 3：分别渲染**
```jsx
// 渲染消息
{messages.map(msg => (
  <ConversationMessage content={msg.content} />  // 完整显示
))}

{toolMessages.map(tool => (
  <ExecResultMessage 
    toolInfo={{ tool: tool.name, status: 'completed' }}
    content={tool.output}
  />  // 折叠显示
))}
```

---

### 方案 B：增强标记（备选）

如果不想大规模重构，可以增强 `toolInfo` 提取：

```javascript
// 后端：提取工具信息
function extractToolInfo(entry) {
  // 如果是 toolResult 角色
  if (entry.message.role === 'toolResult') {
    return {
      type: 'exec',
      tool: entry.message.toolName,
      status: 'completed',
      toolCallId: entry.message.toolCallId
    };
  }
  
  // 如果内容包含 Exec completed
  const execMatch = text.match(/Exec (completed|failed)/);
  if (execMatch) {
    return { type: 'exec', status: execMatch[1] };
  }
  
  return null;
}

// 前端：根据 toolInfo 渲染
{messages.map(msg => {
  if (msg.role === 'toolResult' || msg.toolInfo?.type === 'exec') {
    return <ExecResultMessage {...msg} />;  // 折叠
  }
  return <ConversationMessage {...msg} />;  // 完整
})}
```

---

## 📋 实施建议

### 推荐方案 A2（彻底解决）

**优点**：
- ✅ 完全符合 OpenClaw WebUI 设计
- ✅ 结构清晰，易于维护
- ✅ 可以独立管理工具消息（折叠/展开/过滤）
- ✅ 未来可以添加更多工具相关功能（重试、取消等）

**缺点**：
- ⚠️ 需要修改后端 API（返回两个数组）
- ⚠️ 需要修改前端数据结构和渲染逻辑
- ⚠️ 工作量较大（约 2-3 小时）

### 备选方案 B（快速修复）

**优点**：
- ✅ 改动小（只需增强 `extractToolInfo`）
- ✅ 快速见效（约 30 分钟）

**缺点**：
- ⚠️ 工具信息可能提取不完整
- ⚠️ 仍然混合在一个数组中
- ⚠️ 未来扩展性差

---

## 🎯 我的建议

**采用方案 A2**（完全学习 OpenClaw），理由：

1. ✅ **用户体验一致** - 与 OpenClaw WebUI 完全相同
2. ✅ **架构清晰** - 对话和工具分离是正确的设计
3. ✅ **可扩展** - 未来可以添加更多工具管理功能
4. ✅ **避免技术债务** - 方案 B 只是权宜之计

**实施步骤**：
1. 修改 `server/routes/chat.js` - 返回 `messages` + `toolMessages`
2. 修改 `src/components/ChatWindow.jsx` - 分离存储和渲染
3. 测试验证 - 确保工具消息正确折叠

---

## 📝 待用户决策

**请选择方案**：
- **A2**：完全学习 OpenClaw（推荐，彻底解决）
- **B**：增强标记（快速，但不彻底）

**或者你有其他想法？** 🦞
