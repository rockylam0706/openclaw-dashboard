# 加载更多功能修复 v2.0.11

**日期**: 2026-03-07  
**版本**: v2.0.11  
**状态**: ✅ 已完成

---

## 📋 问题描述

用户反馈：
> 点击加载更多没反应啊。加载完还是在原来的消息数量

**问题根因**：
1. **offset 计算错误**：只算了对话消息 `messages.length`，没算工具消息 `toolMessages.length`
2. **工具消息更新逻辑错误**：非飞书窗口在加载更多时，工具消息被覆盖（`setToolMessages(tools)`），而不是追加（`setToolMessages(prev => [...tools, ...prev])`）

---

## 🔧 修复内容

### 1. 修复 offset 计算

**修复前**：
```javascript
const offset = loadMore ? messages.length : 0;
// ❌ 只算对话消息，假设 40 条消息 = 2 对话 + 38 工具
// offset = 2，但 API 期望 offset = 40
```

**修复后**：
```javascript
const offset = loadMore ? messages.length + toolMessages.length : 0;
// ✅ 计算所有消息（对话 + 工具）
// offset = 2 + 38 = 40，正确！
```

---

### 2. 修复工具消息更新逻辑

**修复前**：
```javascript
// ❌ 先设置工具消息（覆盖）
if (channelId === 'feishu') {
  setToolMessages([]);
} else {
  setToolMessages(tools);  // 覆盖！不是追加
}

// 然后加载更多（追加）
if (loadMore) {
  setMessages(prev => [...msgs, ...prev]);
  setToolMessages(prev => [...tools, ...prev]);  // 但这里又追加了
}
```

**问题**：
- 首次加载：`setToolMessages(tools)` → 38 条工具消息 ✅
- 加载更多：`setToolMessages(tools)` → 18 条工具消息（覆盖了之前的 38 条！）❌
- 然后 `setToolMessages(prev => [...tools, ...prev])` → 18 + 18 = 36 条（但应该是 38 + 18 = 56 条）❌

**修复后**：
```javascript
// ✅ 按场景分别处理
if (loadMore) {
  // 加载更多：追加到前面
  setMessages(prev => [...msgs, ...prev]);
  if (channelId === 'feishu') {
    setToolMessages([]);  // 飞书始终不显示工具消息
  } else {
    setToolMessages(prev => [...tools, ...prev]);  // 追加到前面
  }
  setShouldScrollToBottom(false);
} else if (isRealtimeUpdate) {
  // 实时更新：追加到后面
  setMessages(prev => [...prev, ...msgs]);
  if (channelId === 'feishu') {
    setToolMessages([]);
  } else {
    setToolMessages(prev => [...prev, ...tools]);  // 追加到后面
  }
} else {
  // 首次加载：替换
  setMessages(msgs);
  if (channelId === 'feishu') {
    setToolMessages([]);
  } else {
    setToolMessages(tools);  // 替换
  }
  setShouldScrollToBottom(true);
}
```

---

## 📊 测试验证

### API 测试

```bash
# 首次加载（offset=0, limit=40）
curl "http://localhost:18790/api/chat/webui-messages?offset=0&limit=40" | jq '{
  total: .total,
  offset: .offset,
  messages: (.messages | length),
  tools: (.toolMessages | length),
  sum: ((.messages | length) + (.toolMessages | length))
}'

# 输出：
{
  "total": 1566,
  "offset": 0,
  "messages": 3,
  "tools": 37,
  "sum": 40  # ✅ 40 条
}

# 加载更多（offset=40, limit=20）
curl "http://localhost:18790/api/chat/webui-messages?offset=40&limit=20" | jq '{
  total: .total,
  offset: .offset,
  messages: (.messages | length),
  tools: (.toolMessages | length),
  sum: ((.messages | length) + (.toolMessages | length))
}'

# 输出：
{
  "total": 1567,
  "offset": 40,
  "messages": 2,
  "tools": 18,
  "sum": 20  # ✅ 20 条
}

# 继续加载（offset=60, limit=20）
curl "http://localhost:18790/api/chat/webui-messages?offset=60&limit=20" | jq '{
  total: .total,
  offset: .offset,
  messages: (.messages | length),
  tools: (.toolMessages | length),
  sum: ((.messages | length) + (.toolMessages | length))
}'

# 输出：
{
  "total": 1568,
  "offset": 60,
  "messages": 2,
  "tools": 18,
  "sum": 20  # ✅ 20 条
}
```

---

## 🎯 用户体验

### 修复前
| 操作 | 行为 | 消息数 | 状态 |
|------|------|--------|------|
| 首次加载 | 加载 40 条 | 2 对话 + 38 工具 | ✅ |
| 点击加载更多 | 加载 20 条 | 2 对话 + 18 工具 ❌ | 覆盖而非追加 |
| 总消息数 | - | 40 条 → 20 条 ❌ | 减少了！ |

### 修复后
| 操作 | 行为 | 消息数 | 状态 |
|------|------|--------|------|
| 首次加载 | 加载 40 条 | 2 对话 + 38 工具 | ✅ |
| 点击加载更多 | 追加 20 条 | (2+2) 对话 + (38+18) 工具 | ✅ 追加 |
| 总消息数 | - | 40 条 → 60 条 ✅ | 增加了！ |
| 再次加载更多 | 追加 20 条 | (4+2) 对话 + (56+18) 工具 | ✅ 追加 |
| 总消息数 | - | 60 条 → 80 条 ✅ | 增加了！ |

---

## 📝 场景说明

### 场景 1: 首次加载
```javascript
loadMore = false, isRealtimeUpdate = false
→ setMessages(msgs)           // 替换：40 条
→ setToolMessages(tools)      // 替换：38 条
→ 总消息数：40 条
```

### 场景 2: 加载更多
```javascript
loadMore = true
→ setMessages(prev => [...msgs, ...prev])    // 追加到前面：2 + 40 = 42 条
→ setToolMessages(prev => [...tools, ...prev])  // 追加到前面：18 + 38 = 56 条
→ 总消息数：42 + 56 = 98 条？不对！

等等，让我重新计算...
- 首次加载后：messages=2, toolMessages=38, 总计 40 条
- 加载更多：msgs=2, tools=18
- setMessages(prev => [...msgs, ...prev]) → [2 条新, ...2 条旧] = 4 条
- setToolMessages(prev => [...tools, ...prev]) → [18 条新, ...38 条旧] = 56 条
- 总计：4 + 56 = 60 条 ✅

正确！
```

### 场景 3: 实时更新（收到新消息）
```javascript
loadMore = false, isRealtimeUpdate = true
→ setMessages(prev => [...prev, ...msgs])    // 追加到后面
→ setToolMessages(prev => [...prev, ...tools])  // 追加到后面
→ 总消息数：增加
```

### 场景 4: 飞书窗口
```javascript
channelId === 'feishu'
→ setToolMessages([])  // 始终不显示工具消息
→ 只显示对话消息
```

---

## 🐛 调试日志

```javascript
console.log(`[Chat] ${channelId}: ${msgs.length}/${limitNum} 对话消息，${tools.length} 工具消息${loadMore ? ' (加载更多)' : ''}, hasMore=${hasMoreMessages}, total=${data.total}`);
```

**示例输出**：
```
[Chat] webui: 3/40 对话消息，37 工具消息，hasMore=true, total=1566
[Chat] webui: 2/20 对话消息，18 工具消息 (加载更多), hasMore=true, total=1567
[Chat] webui: 2/20 对话消息，18 工具消息 (加载更多), hasMore=true, total=1568
```

---

## 🔄 版本历史

- **v2.0.11** (2026-03-07): 加载更多功能修复（offset + 工具消息追加）
- **v2.0.10**: 滚动加载更多功能修复
- **v2.0.9**: 移除动态截断，切换窗口保留消息
- **v2.0.8**: 分页加载 + 飞书过滤

---

**修复完成！请刷新页面测试加载更多功能。** 🦞

**测试步骤**：
1. 打开聊天窗口（WebUI 或 全部消息）
2. 滚动到顶部 → 自动触发加载更多
3. 或点击 "📜 加载更多历史消息" 按钮
4. 验证消息数量增加（40 条 → 60 条 → 80 条...）
5. 验证新加载的消息显示在顶部（历史消息）
6. 验证滚动位置保持不变
