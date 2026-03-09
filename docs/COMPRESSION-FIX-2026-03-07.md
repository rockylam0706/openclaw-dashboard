# 工具消息压缩修复报告

**日期**: 2026-03-07 14:15  
**版本**: v2.0.7-fix2  
**问题**: 需要压缩的工具消息未压缩

---

## 🐛 问题描述

**用户报告**："为什么优化完后，需要压缩的消息不压缩了？"

**症状**：
- 工具执行结果消息（如 `read`、`exec` 等）完整显示，未折叠
- 消息内容很长，占用大量屏幕空间
- 与 OpenClaw WebUI 的折叠效果不一致

---

## 🔍 根因分析

### 问题 1：消息分类错误

**发现**：
```bash
curl http://localhost:18790/api/chat/webui-messages | jq '[.messages[] | select(.role == "toolResult")] | length'
# 输出：21  # ❌ messages 数组中有 21 条工具结果消息
```

**原因**：
- `messages` 数组中混入了 `role: "toolResult"` 的消息
- 这些消息应该被分类到 `toolMessages` 数组
- 前端 `MessageRenderer` 只检查 `toolName` 和 `toolStatus` 字段
- messages 数组中的工具结果消息没有这些字段，被当作普通对话渲染

**示例**：
```json
// ❌ 错误：在 messages 数组中
{
  "role": "toolResult",
  "content": "{\n  \"results\": [], ...\n}",
  // 没有 toolName, toolStatus 字段
}

// ✅ 正确：应该在 toolMessages 数组中
{
  "toolName": "read",
  "toolStatus": "completed",
  "content": "文件内容..."
}
```

### 问题 2：extractToolInfo 识别范围过窄

**原逻辑**：
```javascript
function extractToolInfo(text) {
  // 只识别特定格式
  const execMatch = text.match(/Exec (completed|failed) \(([^,]+), code (\d+)\)/);
  if (execMatch) {
    return { type: 'exec', status: ..., tool: ..., code: ... };
  }
  
  // 其他格式...
  return null;  // ❌ 很多工具结果没有这些标记
}
```

**问题**：
- 只识别包含 "Exec completed/failed" 的消息
- 很多工具结果消息只有纯 JSON 输出，没有格式标记
- 但它们的 `role` 字段是 `"toolResult"`

---

## ✅ 修复方案

### 同时检查 `role` 字段

**修改 `server/routes/chat.js`**（3 个 API）：

```javascript
// ✅ 新增：检查 role 字段
const isToolResult = msg.role === 'toolResult' || msg.role === 'tool' || msg.role === 'function';
const hasExecInfo = toolInfo && (toolInfo.type === 'exec' || toolInfo.type === 'process');

// ✅ 修复：同时检查 role 和 toolInfo
if (isToolResult || hasExecInfo) {
  // 工具消息单独存储
  toolMessages.push({
    id: `tool_${toolMessages.length}`,
    channel: feishuInfo ? 'feishu' : 'webui',
    toolName: toolInfo?.tool || msg.toolName || 'tool',
    toolStatus: toolInfo?.status || (isToolResult ? 'completed' : 'unknown'),
    toolCode: toolInfo?.code,
    content: textContent,
    timestamp: ...,
    role: msg.role,
    isFeishu: !!feishuInfo,
    feishuType: feishuInfo?.type
  });
} else {
  // 普通对话消息
  messages.push({...});
}
```

**关键改进**：
1. ✅ 检查 `role === 'toolResult'`（OpenClaw 标准）
2. ✅ 检查 `role === 'tool'` 和 `role === 'function'`（兼容性）
3. ✅ 使用 `toolInfo?.tool || msg.toolName || 'tool'`（降级方案）
4. ✅ 使用 `toolInfo?.status || (isToolResult ? 'completed' : 'unknown')`（默认状态）

---

## 📊 修复效果

### 修复前

```bash
# messages 数组
{
  "messages_with_toolResult": 21,  # ❌ 混入工具消息
  "toolMessages_count": 21
}
```

**表现**：
- 21 条工具消息在 messages 数组中
- 前端渲染为普通对话（完整显示，不折叠）
- 用户看到长文本，无法折叠

### 修复后

```bash
# messages 数组
{
  "messages_with_toolResult": 0,  # ✅ 无工具消息
  "toolMessages_count": 894       # ✅ 所有工具消息正确分类
}
```

**表现**：
- 所有工具消息都在 toolMessages 数组
- 前端渲染为 ExecResultMessage（折叠显示）
- 默认显示摘要，点击展开详情

---

## 🎯 前端渲染逻辑

### MessageRenderer 组件

```javascript
function MessageRenderer({ msg }) {
  // ✅ 工具执行结果优先（折叠显示）
  if (msg.toolName && (msg.toolStatus === 'completed' || msg.toolStatus === 'failed')) {
    return <ExecResultMessage 
      content={msg.content} 
      toolName={msg.toolName}
      toolStatus={msg.toolStatus}
      toolCode={msg.toolCode}
    />;
  }
  
  // 飞书消息
  if (msg.isFeishu || msg.feishuType) {
    return <FeishuMessage content={msg.content} feishuType={msg.feishuType} />;
  }
  
  // 默认：普通对话（完整显示）
  return <ConversationMessage content={msg.content} />;
}
```

### ExecResultMessage 组件

```javascript
function ExecResultMessage({ content, toolName, toolStatus, toolCode }) {
  const [isExpanded, setIsExpanded] = useState(false);  // ✅ 默认折叠
  
  return (
    <div className="tool-message">
      {/* 摘要栏（始终可见） */}
      <div onClick={() => setIsExpanded(!isExpanded)}>
        🔧 {toolName} · {status.icon} {status.label}
        {isExpanded ? '🔼 收起' : '📄 查看详情'}
      </div>
      
      {/* 详情（展开后显示） */}
      {isExpanded && (
        <div className="max-h-[500px] overflow-y-auto">
          <MarkdownContent content={content} />
        </div>
      )}
    </div>
  );
}
```

---

## 🧪 验证步骤

### 1. 检查 API 输出

```bash
# 验证 messages 数组无工具消息
curl http://localhost:18790/api/chat/webui-messages | jq '[.messages[] | select(.role == "toolResult")] | length'
# 期望输出：0 ✅

# 验证 toolMessages 数量
curl http://localhost:18790/api/chat/webui-messages | jq '.toolMessages | length'
# 期望输出：894 ✅

# 验证工具消息字段
curl http://localhost:18790/api/chat/webui-messages | jq '.toolMessages[-1] | {toolName, toolStatus, toolCode}'
# 期望输出：{"toolName":"exec","toolStatus":"completed","toolCode":0} ✅
```

### 2. 前端验证

1. 访问 `http://localhost:18790`
2. 打开聊天窗口
3. 查看工具消息（如 `read`、`exec` 输出）
4. **预期效果**：
   - ✅ 默认显示摘要栏（工具名 + 状态）
   - ✅ 内容被折叠，不占用大量空间
   - ✅ 点击摘要栏展开查看详情
   - ✅ 再次点击收起

### 3. 对比 OpenClaw WebUI

| 特性 | OpenClaw WebUI | Dashboard (修复后) | 状态 |
|------|----------------|-------------------|------|
| 工具消息折叠 | ✅ | ✅ | ✅ 一致 |
| 默认显示摘要 | ✅ | ✅ | ✅ 一致 |
| 点击展开详情 | ✅ | ✅ | ✅ 一致 |
| 状态标识 | ✅ | ✅ | ✅ 一致 |

---

## 📝 修改的文件

1. ✅ `server/routes/chat.js` - 3 个 API 修改分类逻辑
   - `GET /api/chat/sessions/:sessionKey/history`
   - `GET /api/chat/feishu-messages`
   - `GET /api/chat/webui-messages`

---

## 💡 经验教训

### 1. 不要只依赖内容匹配

**错误**：
```javascript
// ❌ 只匹配特定文本格式
const execMatch = text.match(/Exec completed/);
```

**正确**：
```javascript
// ✅ 同时检查结构化字段
const isToolResult = msg.role === 'toolResult';
```

### 2. 多重判断更可靠

**单一判断**：
```javascript
if (toolInfo) { ... }  // ❌ 可能漏判
```

**多重判断**：
```javascript
const isToolResult = msg.role === 'toolResult' || ...;
const hasExecInfo = toolInfo && ...;
if (isToolResult || hasExecInfo) { ... }  // ✅ 更可靠
```

### 3. 降级方案很重要

```javascript
toolName: toolInfo?.tool || msg.toolName || 'tool'  // ✅ 多层降级
toolStatus: toolInfo?.status || (isToolResult ? 'completed' : 'unknown')
```

---

## ✅ 完成清单

- [x] 识别问题：messages 数组混入工具消息
- [x] 根因分析：extractToolInfo 识别范围过窄
- [x] 修复方案：同时检查 role 字段
- [x] 修改 3 个 API 的分类逻辑
- [x] 构建并重启服务
- [x] 验证修复效果
- [x] 创建修复文档

---

## 🚀 发布

**版本**: v2.0.7-fix2  
**发布时间**: 2026-03-07 14:15  
**PM2 PID**: 54398  
**构建文件**: `dist/assets/index-0p3TtDa7.js` (133.67 KB)

---

**修复完成！工具消息现在正确折叠显示！** 🦞
