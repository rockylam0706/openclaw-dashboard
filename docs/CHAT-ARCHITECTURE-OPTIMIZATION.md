# 🏗️ 聊天窗口新架构优化

## 📅 优化日期
2026-03-07 12:50

---

## 🎯 优化目标

按**通讯工具**区分窗口，而不是按**存储位置**：
- ✅ WebUI 窗口：仅显示直接对话（排除飞书）
- ✅ 飞书窗口：显示所有飞书消息（私聊 + 群聊）
- ✅ 全部窗口：显示主会话所有消息

---

## ✅ 已完成的优化

### 1️⃣ 新架构实现

**后端 API 重构** (`server/routes/chat.js`)：

| API 端点 | 功能 | 消息数 |
|----------|------|--------|
| `GET /api/chat/webui-messages` | WebUI 消息（排除飞书） | 1450 条 |
| `GET /api/chat/feishu-messages` | 飞书消息（从主会话提取） | 23 条 |
| `GET /api/chat/sessions/:key/history` | 原始会话消息 | 1473 条 |

**飞书消息解析**：
```javascript
function parseFeishuMessage(text) {
  // 匹配：Feishu[default] DM from ou_xxx: 内容
  const dmMatch = text.match(/Feishu\[default\] DM from (\w+): ([\s\S]+)/);
  // 匹配：Feishu[default] group: 内容
  const groupMatch = text.match(/Feishu\[default\] group.*?: ([\s\S]+)/);
}
```

**前端频道配置**：
```javascript
const CHANNELS = [
  { 
    id: 'webui', 
    name: 'WebUI 会话', 
    apiEndpoint: '/api/chat/webui-messages' 
  },
  { 
    id: 'feishu', 
    name: '飞书', 
    apiEndpoint: '/api/chat/feishu-messages' 
  },
  { 
    id: 'all', 
    name: '全部', 
    apiEndpoint: '/api/chat/sessions/agent:main:main/history' 
  },
];
```

---

### 2️⃣ 首次加载自动滚动

**优化点**：
- ✅ 每次第一次打开聊天窗口时加载消息
- ✅ 加载完成后自动滚动到最新消息（最底部）
- ✅ 使用 `hasLoaded` 标志避免重复加载

**实现**：
```javascript
// 首次加载
useEffect(() => {
  if (!hasLoaded) {
    loadMessagesForChannel(selectedChannel, false);
    setHasLoaded(true);
  }
}, []);

// 自动滚动
useEffect(() => {
  if (messages.length > 0 && !loading) {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'end' 
      });
    }, 200);
    return () => clearTimeout(timer);
  }
}, [messages, loading]);
```

---

### 3️⃣ 长消息折叠显示

**优化点**：
- ✅ 代码/脚本/日志自动折叠（>500 字符或包含 `Error:`/`Exec`）
- ✅ 显示"查看详细内容"按钮
- ✅ 点击展开完整内容（带滚动条）
- ✅ 可收起折叠

**触发条件**：
```javascript
const shouldCollapse = (content) => {
  const longContent = content.length > 500;
  const hasCodeBlock = content.includes('```') || 
                       content.includes('Error:') || 
                       content.includes('exec');
  const hasSystemMessage = content.includes('System:') || 
                           content.includes('Exec');
  return longContent || (hasCodeBlock && hasSystemMessage);
};
```

**UI 效果**：
```
┌─────────────────────────────────┐
│ [AI] 执行结果：                 │
│ npm warn exec The following...  │
│ ... (截断)                      │
│ 📄 查看详细内容 (1234 字符)      │ ← 点击展开
└─────────────────────────────────┘

展开后：
┌─────────────────────────────────┐
│ [滚动区域 - max-h-96]           │
│ npm warn exec...               │
│ ...完整内容...                  │
│ 🔼 收起                         │
└─────────────────────────────────┘
```

---

### 4️⃣ 时间戳增强

**优化前**：
- `12:34`（仅时间）

**优化后**：
- **今天**：`12:34`
- **昨天**：`昨天 12:34`
- **其他**：`03-07 12:34`

**实现**：
```javascript
const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const timeStr = date.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  const dateStr = date.toLocaleDateString('zh-CN', { 
    month: '2-digit', 
    day: '2-digit' 
  });
  
  // 今天
  if (msgDate.getTime() === today.getTime()) {
    return timeStr;
  }
  // 昨天
  if (msgDate.getTime() === yesterday.getTime()) {
    return `昨天 ${timeStr}`;
  }
  // 其他
  return `${dateStr} ${timeStr}`;
};
```

---

## 📊 对比

| 功能 | 优化前 | 优化后 | 改进 |
|------|--------|--------|------|
| **架构** | 按存储位置 | 按通讯工具 | ✅ 符合直觉 |
| **飞书窗口** | 昨晚测试消息 | 所有飞书消息（23 条） | ✅ 实用 |
| **首次加载** | 手动滚动 | 自动到底部 | ✅ 便捷 |
| **长消息** | 完全显示 | 折叠 + 展开 | ✅ 清爽 |
| **时间戳** | 仅时分 | 日期 + 时分 | ✅ 清晰 |

---

## 🧪 测试验证

### 1. 飞书消息 API
```bash
curl -s "http://localhost:18790/api/chat/feishu-messages" | jq '.messages | length'
# 结果：23 条 ✅

# 最新 3 条
[私聊] ou_8bb527a3b143f3b099e58fb294b96e04 - 监控面板的移动端修复怎么样了
```

### 2. WebUI 消息 API
```bash
curl -s "http://localhost:18790/api/chat/webui-messages" | jq '.messages | length'
# 结果：1450 条（排除飞书）✅

# 最新 3 条
[AI] 测试新 API：
```

### 3. 消息总数验证
```
飞书消息 (23) + WebUI 消息 (1450) = 1473 条
主会话总消息 = 1473 条 ✅ 匹配
```

---

## 🎨 UI 变化

### 频道说明
```
┌─────────────────────────────────────────┐
│ [🌐 WebUI] [📱 飞书] [📋 全部]         │
│ 💻 显示你与 AI 的直接对话（排除飞书消息）│
│ 📱 显示所有飞书消息（私聊 + 群聊）       │
│ 📋 显示主会话的所有消息                 │
└─────────────────────────────────────────┘
```

### 长消息折叠
```
┌─────────────────────────────────┐
│ [AI] System: Exec completed...  │
│ added 332 packages...          │
│ ... (前 3 行)                    │
│ ─────────────────────────────   │
│ 📄 查看详细内容 (1234 字符)      │
└─────────────────────────────────┘
```

### 时间戳
```
今天：   12:34
昨天：   昨天 12:34
其他：   03-07 12:34
```

---

## 📝 文件变更

### 修改文件
1. `server/routes/chat.js` - 完全重写，添加飞书/WebUI 消息过滤
2. `src/components/ChatWindow.jsx` - 新架构 + 折叠组件 + 时间戳增强

### 新增文档
- `docs/CHAT-ARCHITECTURE-OPTIMIZATION.md` - 优化记录

---

## 🚀 使用说明

### WebUI 会话 🌐
- **显示**：你与 AI 的直接对话（排除飞书消息）
- **场景**：查看纯 WebUI 交互历史

### 飞书 📱
- **显示**：所有飞书消息（私聊 + 群聊）
- **场景**：查看飞书通信记录

### 全部 📋
- **显示**：主会话所有消息
- **场景**：完整历史记录

---

## 🔮 未来改进

### 短期
- [ ] 消息搜索功能
- [ ] 按日期筛选
- [ ] 导出聊天记录

### 中期
- [ ] 消息分页加载
- [ ] 图片/文件预览优化
- [ ] 更多折叠样式选项

### 长期
- [ ] 支持 Discord/Telegram 等更多通讯工具
- [ ] 消息分类标签
- [ ] 智能消息摘要

---

## ✅ 优化完成

- [x] 新架构：按通讯工具分类
- [x] 飞书窗口：显示所有飞书消息（23 条）
- [x] WebUI 窗口：排除飞书消息（1450 条）
- [x] 首次加载：自动滚动到底部
- [x] 长消息：折叠显示（代码/脚本/日志）
- [x] 时间戳：日期 + 时分
- [x] API 测试通过
- [x] 文档更新

**版本：** v2.0.5  
**状态：** ✅ 完成并测试通过
