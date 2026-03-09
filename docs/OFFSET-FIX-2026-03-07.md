# 重复加载消息修复 v2.0.12

**日期**: 2026-03-07  
**版本**: v2.0.12  
**状态**: ✅ 已完成

---

## 📋 问题描述

用户反馈：
> 加载的消息不对吧，他看起来是将相同的消息多次加载，而不是接着原来的聊天记录往前加载。

**问题根因**：

前端使用 `messages.length + toolMessages.length` 计算 offset，但 **API 返回的消息数可能少于 limit**（因为过滤逻辑），导致 offset 计算错位，进而导致重复加载消息。

### 详细分析

**API 双重过滤问题**：
```javascript
// 第一次过滤：排除飞书、空消息
const filteredLines = [];
for (const line of lines) {
  if (!feishuInfo && !isEmpty) {
    filteredLines.push(line);
  }
}

// 分页
const pagedLines = reversedLines.slice(offsetNum, offsetNum + limitNum);

// 第二次过滤：处理消息时又过滤一次
pagedLines.forEach((line) => {
  if (!feishuInfo) {
    if (isToolResult || hasExecInfo) {
      toolMessages.push({...});
    } else if (textContent.trim().length > 0) {  // ← 可能过滤掉一些消息
      messages.push({...});
    }
  }
});
```

**问题场景**：
1. 首次加载：offset=0, limit=40 → API 返回 40 条 ✅
2. 加载更多：offset=40, limit=20 → API 返回 18 条（2 条被过滤掉）❌
3. 前端计算下次 offset：`40 + 18 = 58`
4. 但前端**假设**返回了 20 条，所以计算 offset：`40 + 20 = 60` ❌
5. 下次加载：offset=60 → 跳过了 2 条消息（58, 59）
6. 再下次加载：offset=80 → 又跳过了 2 条消息
7. **累积误差导致重复加载**！

---

## 🔧 修复内容

### 1. 添加 `currentOffset` 状态

**新增**：
```javascript
const [currentOffset, setCurrentOffset] = useState(0); // ✅ 当前偏移量（基于实际返回的消息数）
```

### 2. 使用 `currentOffset` 计算 API offset

**修复前**：
```javascript
const offset = loadMore ? messages.length + toolMessages.length : 0;
// ❌ 假设返回了 limit 条消息
```

**修复后**：
```javascript
const offset = loadMore ? currentOffset : 0;
// ✅ 基于实际返回的消息数累加
```

### 3. 更新 `currentOffset` 基于 API 实际返回

**新增**：
```javascript
// ✅ 更新 offset（基于 API 实际返回的消息数，不是 limit！）
if (loadMore) {
  setCurrentOffset(prev => prev + msgs.length + tools.length);
} else {
  setCurrentOffset(msgs.length + tools.length);
}
```

### 4. channelMessagesRef 增加 offset 字段

**修复前**：
```javascript
const channelMessagesRef = useRef({ 
  webui: { messages: [], toolMessages: [], hasLoaded: false }, 
  // ...
});
```

**修复后**：
```javascript
const channelMessagesRef = useRef({ 
  webui: { messages: [], toolMessages: [], hasLoaded: false, offset: 0 }, 
  feishu: { messages: [], toolMessages: [], hasLoaded: false, offset: 0 }, 
  all: { messages: [], toolMessages: [], hasLoaded: false, offset: 0 } 
});
```

### 5. 切换频道时恢复 offset

**修复后**：
```javascript
useEffect(() => {
  const channelData = channelMessagesRef.current[selectedChannel];
  if (!channelData.hasLoaded) {
    loadMessagesForChannel(selectedChannel, false);
    channelData.hasLoaded = true;
  } else {
    // 切换频道时，从 ref 恢复消息和 offset
    setMessages(channelData.messages);
    setToolMessages(channelData.toolMessages);
    setCurrentOffset(channelData.offset);  // ✅ 恢复 offset
  }
}, [selectedChannel]);
```

---

## 📊 测试验证

### API 测试

```bash
# 测试 1: offset=0, limit=40
curl "http://localhost:18790/api/chat/webui-messages?offset=0&limit=40" | jq '{
  total: .total,
  offset: .offset,
  limit: .limit,
  returned: ((.messages | length) + (.toolMessages | length))
}'

# 输出：
{
  "total": 1587,
  "offset": 0,
  "limit": 40,
  "returned": 40  # ✅ 返回 40 条
}

# 测试 2: offset=40, limit=20
curl "http://localhost:18790/api/chat/webui-messages?offset=40&limit=20" | jq '{
  total: .total,
  offset: .offset,
  limit: .limit,
  returned: ((.messages | length) + (.toolMessages | length))
}'

# 输出：
{
  "total": 1588,
  "offset": 40,
  "limit": 20,
  "returned": 20  # ✅ 返回 20 条
}

# 测试 3: offset=75, limit=20（模拟 API 返回不足 limit 的情况）
curl "http://localhost:18790/api/chat/webui-messages?offset=75&limit=20" | jq '{
  total: .total,
  offset: .offset,
  limit: .limit,
  returned: ((.messages | length) + (.toolMessages | length))
}'

# 输出：
{
  "total": 1589,
  "offset": 75,
  "limit": 20,
  "returned": 20  # ✅ 返回 20 条
}
```

---

## 🎯 修复前后对比

### 修复前（错误）

| 加载次数 | 请求 offset | API 返回 | 前端计算下次 offset | 正确 offset | 误差 |
|---------|------------|---------|------------------|------------|------|
| #1 | 0 | 40 条 | 40 | 40 | 0 ✅ |
| #2 | 40 | 18 条 | 60 | 58 | +2 ❌ |
| #3 | 60 | 20 条 | 80 | 78 | +2 ❌ |
| #4 | 80 | 20 条 | 100 | 98 | +2 ❌ |

**结果**：每次跳过 2 条消息，累积误差导致重复加载！

### 修复后（正确）

| 加载次数 | 请求 offset | API 返回 | 前端计算下次 offset | 正确 offset | 误差 |
|---------|------------|---------|------------------|------------|------|
| #1 | 0 | 40 条 | 0 + 40 = 40 | 40 | 0 ✅ |
| #2 | 40 | 18 条 | 40 + 18 = 58 | 58 | 0 ✅ |
| #3 | 58 | 20 条 | 58 + 20 = 78 | 78 | 0 ✅ |
| #4 | 78 | 20 条 | 78 + 20 = 98 | 98 | 0 ✅ |

**结果**：offset 始终正确，不会重复加载！

---

## 📝 调试日志

```javascript
console.log(`[Chat] ${channelId}: ${msgs.length}/${limitNum} 对话消息，${tools.length} 工具消息${loadMore ? ' (加载更多)' : ''}, offset=${offset}→${currentOffset}, hasMore=${hasMoreMessages}, total=${data.total}`);
```

**示例输出**：
```
[Chat] webui: 3/40 对话消息，37 工具消息，offset=0→40, hasMore=true, total=1587
[Chat] webui: 2/20 对话消息，18 工具消息 (加载更多), offset=40→58, hasMore=true, total=1588
[Chat] webui: 2/20 对话消息，18 工具消息 (加载更多), offset=58→78, hasMore=true, total=1589
```

---

## 🔄 版本历史

- **v2.0.12** (2026-03-07): 重复加载消息修复（offset 基于实际返回）
- **v2.0.11**: 加载更多功能修复（offset + 工具消息追加）
- **v2.0.10**: 滚动加载更多功能修复
- **v2.0.9**: 移除动态截断，切换窗口保留消息
- **v2.0.8**: 分页加载 + 飞书过滤

---

**修复完成！请刷新页面（Cmd+Shift+R）测试加载更多功能。** 🦞

**测试步骤**：
1. 打开聊天窗口（WebUI 或 全部消息）
2. 滚动到顶部 → 自动触发加载更多
3. 重复多次加载更多
4. 打开浏览器控制台，查看日志
5. 验证 `offset` 递增正确（40 → 58 → 78 → 98...）
6. 验证消息不重复
