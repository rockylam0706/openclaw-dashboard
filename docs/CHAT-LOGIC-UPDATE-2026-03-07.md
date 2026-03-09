# 聊天窗口逻辑更新 v2.0.9

**日期**: 2026-03-07  
**版本**: v2.0.9  
**状态**: ✅ 已完成

---

## 📋 更新内容

根据用户要求，优化聊天窗口消息加载逻辑：

### 新逻辑

1. **首次加载**：只加载最近 40 条消息
2. **持续聊天**：新消息持续追加，**不截断**
3. **切换窗口**：不重新加载，保持聊天记录
4. **刷新按钮**：只滚动到底部，不重新加载
5. **页面刷新**：只有刷新整个面板页面才重新加载 40 条消息

### 旧逻辑（已废弃）

- ❌ 持续聊天时动态截断保持 40 条
- ❌ 切换窗口时重新加载
- ❌ 刷新按钮重新加载消息

---

## 🔧 技术实现

### 1. 移除动态截断逻辑

**删除**：
```javascript
// ❌ 已移除
const MAX_VISIBLE_COUNT = 40;

useEffect(() => {
  if (messages.length > MAX_VISIBLE_COUNT && !loadingMore) {
    setMessages(prev => prev.slice(-MAX_VISIBLE_COUNT));
    setToolMessages(prev => prev.slice(-Math.floor(prev.length * MAX_VISIBLE_COUNT / messages.length)));
  }
}, [messages.length, loadingMore]);
```

### 2. 按频道存储消息（切换保留）

**新增**：
```javascript
// ✅ 按频道存储消息（切换频道时保留聊天记录）
const channelMessagesRef = useRef({
  webui: { messages: [], toolMessages: [], hasLoaded: false },
  feishu: { messages: [], toolMessages: [], hasLoaded: false },
  all: { messages: [], toolMessages: [], hasLoaded: false }
});
```

### 3. 切换频道逻辑

**修改后**：
```javascript
// ✅ 首次加载消息（仅首次，切换频道不重新加载）
useEffect(() => {
  const channelData = channelMessagesRef.current[selectedChannel];
  if (!channelData.hasLoaded) {
    loadMessagesForChannel(selectedChannel, false);
    channelData.hasLoaded = true;
  } else {
    // 切换频道时，从 ref 恢复消息
    setMessages(channelData.messages);
    setToolMessages(channelData.toolMessages);
  }
}, [selectedChannel]);
```

### 4. 刷新按钮功能

**修改前**：
```javascript
<button onClick={() => loadMessagesForChannel(selectedChannel, true)}>
  🔄
</button>
```

**修改后**：
```javascript
<button onClick={() => setShouldScrollToBottom(true)}>
  ⬇️
</button>
```

### 5. 消息保存到 Ref

**新增**：
```javascript
// ✅ 保存到 channelMessagesRef（切换频道时保留）
const currentMsgs = loadMore ? [...msgs, ...messages] : msgs;
const currentTools = loadMore ? [...tools, ...toolMessages] : tools;
channelMessagesRef.current[channelId] = {
  messages: currentMsgs,
  toolMessages: currentTools,
  hasLoaded: true
};
```

---

## 📊 用户体验对比

| 场景 | 旧逻辑 | 新逻辑 |
|------|--------|--------|
| 首次打开 | 40 条 | 40 条 ✅ |
| 收到新消息 | 追加 + 截断 | 追加 ✅ |
| 切换窗口 | 重新加载 40 条 | 保持聊天记录 ✅ |
| 点击刷新 | 重新加载 | 滚动到底部 ✅ |
| 刷新页面 | 40 条 | 40 条 ✅ |
| 加载更多 | 20 条 | 20 条 ✅ |

---

## 🎯 测试建议

### 测试 1：首次加载
1. 打开聊天窗口
2. 验证显示 40 条消息
3. 滚动到顶部，点击"📜 加载更多"
4. 验证加载 20 条历史消息

### 测试 2：切换窗口
1. WebUI 窗口查看消息
2. 切换到飞书窗口
3. 切换回 WebUI 窗口
4. 验证消息保持不变（不重新加载）

### 测试 3：刷新按钮
1. 滚动到消息列表中间
2. 点击 ⬇️ 按钮
3. 验证滚动到底部（不重新加载）

### 测试 4：持续聊天
1. 保持窗口打开
2. 通过飞书发送 10 条消息
3. 验证消息持续追加（不截断）

### 测试 5：页面刷新
1. 刷新浏览器（Cmd+R）
2. 验证重新加载 40 条消息

---

## 📝 注意事项

1. **内存管理**：消息不截断，长期运行可能积累大量消息
   - 建议：定期刷新页面清理
   - 未来优化：可考虑虚拟滚动

2. **LocalStorage**：消息仍会缓存到 LocalStorage
   - 清除缓存：删除 `chat-messages-*` 和 `chat-toolMessages-*`

3. **WebSocket**：实时消息仍然通过 WebSocket 推送
   - 新消息自动追加到列表
   - 不触发重新加载

---

## 🔄 版本历史

- **v2.0.9** (2026-03-07): 移除动态截断，切换窗口保留消息
- **v2.0.8**: 分页加载 + 飞书过滤
- **v2.0.7**: A2 方案（消息分离）
- **v2.0.6**: 消息类型标记

---

**更新完成！请刷新页面测试新逻辑。** 🦞
