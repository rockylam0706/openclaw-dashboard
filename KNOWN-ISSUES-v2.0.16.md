# 已知问题 - v2.0.16

## 📋 问题描述

**飞书窗口用户消息显示问题**

- **版本**：v2.0.16 (2026-03-07)
- **状态**：⚠️ 已知问题，暂时接受
- **影响**：飞书窗口不显示用户发送的飞书消息

## 🔍 问题详情

### 当前行为
- ✅ 飞书窗口显示 AI 的飞书回复（约 249 条）
- ✅ 飞书窗口显示工具执行结果（约 242 条，已折叠）
- ❌ 飞书窗口**不显示**用户发送的飞书消息（约 10 条）

### 预期行为
飞书窗口应显示完整的对话历史，包括：
- 用户发送的飞书消息
- AI 的飞书回复
- 工具执行结果（折叠显示）

## 📊 数据统计

| 会话来源 | 消息总数 | 用户消息 | AI 消息 | 工具消息 |
|---------|---------|---------|--------|---------|
| 飞书会话 | 501 | 10 | 249 | 242 |
| WebUI 会话 (飞书过滤) | 22 | 22 | 0 | 0 |
| **合并后** | **523** | **32** | **249** | **242** |

### 消息分布（前 50 条）
- 用户消息：4 条（位置：0, 2, 6, 12）
- AI 消息：6 条
- 工具消息：40 条

## 🐛 根本原因

在尝试合并两个会话来源（飞书会话 + WebUI 会话）时，用户消息在处理后丢失。

**调试发现**：
- 日志显示 `messages.push()` 被执行了 4 次（用户消息）
- 但最终 `messages.length=6`，且全部是 AI 消息
- 怀疑是 JavaScript 作用域或异步处理问题

**技术细节**：
```javascript
// 问题代码模式
pagedLines.forEach((line) => {
  if (msg.role === 'user' && textContent.trim().length > 0) {
    console.log(`PUSH user, messages.length=${messages.length}`);
    messages.push({...});  // ✅ 执行了
  }
});
console.log(`Final: messages.length=${messages.length}`);  // ❌ 用户消息丢失
```

## 🔄 临时方案

### 方案 1（当前采用）✅
**接受现状**
- 飞书窗口显示 AI 回复和工具消息
- 用户消息在 WebUI 窗口查看
- 不影响核心功能使用

### 方案 2
**回退到 v2.0.15**
- 飞书窗口只显示飞书会话（501 条）
- 包含 10 条用户消息（需要"加载更多"才能看到后面的）
- 不包含 WebUI 会话中的飞书用户消息

### 方案 3（未来重构）
**彻底重写合并逻辑**
```javascript
// 建议的重构方案
async function fetchFeishuMessages() {
  // 1. 并行读取两个会话来源
  const [feishuSessionMessages, webuiFeishuMessages] = await Promise.all([
    readFeishuSessions(),
    readWebUISession()
  ]);
  
  // 2. 合并并排序
  const allMessages = [...feishuSessionMessages, ...webuiFeishuMessages];
  allMessages.sort((a, b) => a.timestamp - b.timestamp);
  
  // 3. 分页
  return allMessages.slice(offset, offset + limit);
}
```

## 📝 测试验证

### API 测试
```bash
# 测试飞书 API
curl -s "http://localhost:18790/api/chat/feishu-messages?offset=0&limit=50" | \
  jq '{total: .total, messagesCount: (.messages | length), userCount: ([.messages[] | select(.role == "user")] | length)}'

# 当前结果：total=523, messagesCount=6, userCount=0
# 预期结果：total=523, messagesCount=50, userCount=4
```

### 手动测试
```bash
# 验证数据源正确性
node -e "
const fs = require('fs');
// ... 读取并统计消息 ...
console.log('飞书会话用户消息：10 条');
console.log('WebUI 飞书用户消息：22 条');
console.log('合并后应显示：32 条');
"
```

## 📅 修复计划

- **优先级**：低（不影响核心功能）
- **计划版本**：v2.1.0 或更高
- **预计工作量**：2-3 小时（需要彻底重构）
- **依赖**：无

## 📚 相关文档

- [PLAN-A-IMPLEMENTATION.md](docs/PLAN-A-IMPLEMENTATION.md) - v2.0.15 实现报告
- [CHANGELOG-v2.0.16.md](CHANGELOG-v2.0.16.md) - v2.0.16 更新日志
- [docs/CHAT-FIX-2026-03-07.md](docs/CHAT-FIX-2026-03-07.md) - 聊天窗口修复记录

---

**最后更新**：2026-03-07 18:10  
**状态**：⚠️ 已知问题，暂时接受（方案 1）
