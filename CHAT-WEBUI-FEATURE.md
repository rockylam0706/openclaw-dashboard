# 💬 聊天窗口 WebUI 功能实现

## 📅 实现日期
2026-03-07

## 🎯 目标
让 Dashboard 的聊天页签像 OpenClaw WebUI 一样工作，实现实时聊天对话功能。

---

## ✅ 已实现功能

### 1. WebSocket 实时通信

**功能**：
- ✅ 页面加载时自动建立 WebSocket 连接
- ✅ 实时接收新消息推送
- ✅ 断线自动重连（3 秒间隔）
- ✅ 连接状态显示（实时/断开）

**技术实现**：
```javascript
// 前端 WebSocket 连接
const ws = new WebSocket(`ws://${window.location.host}/ws`);
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'new_message') {
    loadSessionMessages(selectedSession.sessionKey);
  }
};
```

**后端监控**：
```javascript
// 监控 JSONL 文件变化
fs.watch(filePath, (eventType) => {
  if (eventType === 'change') {
    const stats = fs.statSync(filePath);
    if (stats.size > lastSize) {
      broadcastToClients({
        type: 'new_message',
        sessionId: sessionId
      });
    }
  }
});
```

---

### 2. 会话管理

**功能**：
- ✅ 显示所有 OpenClaw 会话列表
- ✅ 下拉菜单切换不同会话
- ✅ 自动选择最新会话
- ✅ 会话变更实时通知

**API 端点**：
- `GET /api/chat/sessions` - 获取会话列表
- 返回格式：
```json
{
  "success": true,
  "sessions": [
    {
      "sessionKey": "agent:main:main",
      "kind": "direct",
      "updatedAt": 1772856770855
    }
  ]
}
```

---

### 3. 消息历史加载

**功能**：
- ✅ 读取 JSONL 会话文件
- ✅ 解析用户/AI 消息
- ✅ 按时间倒序显示
- ✅ 支持工具调用记录

**API 端点**：
- `GET /api/chat/sessions/:sessionKey/history`
- 返回格式：
```json
{
  "success": true,
  "messages": [
    {
      "id": "msg_1375",
      "channel": "webui",
      "sender": "用户",
      "content": "你好",
      "timestamp": 1772856770000,
      "isSelf": true,
      "role": "user"
    }
  ]
}
```

**JSONL 解析逻辑**：
```javascript
// 读取 sessions.json 获取 sessionId
const session = sessionsData[sessionKey];
const jsonlFile = `${SESSIONS_DIR}/${sessionId}.jsonl`;

// 解析 JSONL 文件
lines.forEach(line => {
  const entry = JSON.parse(line);
  if (entry.type === 'message') {
    // 提取文本内容
    messages.push({...});
  }
});
```

---

### 4. 消息发送

**功能**：
- ✅ 输入框输入消息
- ✅ Enter 键发送
- ✅ 发送按钮点击发送
- ✅ 发送后自动刷新消息列表
- ✅ WebSocket 实时推送给其他客户端

**API 端点**：
- `POST /api/chat/sessions/send`
- 请求体：
```json
{
  "sessionKey": "agent:main:main",
  "message": "你好"
}
```

**执行流程**：
1. 前端发送 POST 请求
2. 后端调用 `openclaw-cn sessions send`
3. 消息追加到 JSONL 文件
4. 文件监控检测到变化
5. WebSocket 广播给所有客户端
6. 前端接收并刷新消息列表

---

### 5. LocalStorage 缓存

**功能**：
- ✅ 刷新页面后消息不丢失
- ✅ 每个会话独立缓存
- ✅ 自动保存/恢复
- ✅ 容量限制内无限存储

**实现**：
```javascript
// 保存
localStorage.setItem(`chat-messages-${sessionKey}`, JSON.stringify(msgs));

// 恢复
const cached = localStorage.getItem(`chat-messages-${sessionKey}`);
if (cached) {
  setMessages(JSON.parse(cached));
}
```

**优势**：
- 页面刷新后立即显示消息（无需等待 API）
- 离线也能查看历史消息
- 减少服务器请求

---

### 6. 用户体验优化

**功能**：
- ✅ WebSocket 连接状态指示器（绿色=实时，红色=断开）
- ✅ 消息自动滚动到底部
- ✅ 时间格式化（今天显示时间，昨天显示"昨天"）
- ✅ 用户/AI 消息不同样式
- ✅ 加载中动画
- ✅ 错误提示 Toast
- ✅ 禁用状态管理（未连接时禁用发送）

**UI 特性**：
```jsx
{/* 连接状态 */}
<span className={wsConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
  {wsConnected ? '● 实时' : '● 断开'}
</span>

{/* 消息气泡 */}
<div className={msg.isSelf ? 'bg-brand text-white' : 'bg-dark-card'}>
  {msg.content}
</div>
```

---

## 📊 性能对比

| 功能 | 实现前 | 实现后 | 改进 |
|------|--------|--------|------|
| 消息加载 | 轮询（10 秒） | WebSocket 实时 | 即时 |
| 刷新保留 | ❌ 消失 | ✅ LocalStorage | 永久 |
| 多设备同步 | ❌ 不支持 | ✅ WebSocket 广播 | 支持 |
| 断线重连 | ❌ 手动刷新 | ✅ 自动 3 秒重连 | 自动 |
| 连接状态 | ❌ 无显示 | ✅ 实时指示器 | 可见 |

---

## 🔧 技术架构

```
┌─────────────────────────────────────────────────────────┐
│  Dashboard 前端 (React)                                  │
├─────────────────────────────────────────────────────────┤
│  ChatWindow.jsx                                         │
│  ├── WebSocket 连接 (ws://localhost:18790/ws)          │
│  ├── LocalStorage 缓存                                  │
│  ├── 会话选择器                                         │
│  └── 消息渲染                                           │
└─────────────────────────────────────────────────────────┘
                          ↕ HTTP + WebSocket
┌─────────────────────────────────────────────────────────┐
│  Dashboard 后端 (Node.js + Express)                     │
├─────────────────────────────────────────────────────────┤
│  server/index.js                                        │
│  ├── WebSocket Server (ws)                              │
│  └── 路由分发                                           │
│                                                         │
│  server/routes/chat.js                                  │
│  ├── GET /sessions - 会话列表                           │
│  ├── GET /sessions/:key/history - 历史消息              │
│  ├── POST /sessions/send - 发送消息                     │
│  └── fs.watch 监控 JSONL 文件变化                        │
└─────────────────────────────────────────────────────────┘
                          ↕ 文件系统
┌─────────────────────────────────────────────────────────┐
│  OpenClaw 会话存储                                       │
├─────────────────────────────────────────────────────────┤
│  ~/.openclaw/agents/main/sessions/                      │
│  ├── sessions.json - 会话元数据                         │
│  ├── 5eae52c0-....jsonl - 主会话消息                    │
│  └── 83e7a763-....jsonl - 飞书群聊消息                  │
└─────────────────────────────────────────────────────────┘
```

---

## 🧪 测试结果

### 功能测试

| 测试项 | 结果 | 备注 |
|--------|------|------|
| 加载会话列表 | ✅ 通过 | 显示 2 个会话 |
| 加载历史消息 | ✅ 通过 | 1375 条消息 |
| 发送消息 | ✅ 通过 | 成功追加到 JSONL |
| WebSocket 连接 | ✅ 通过 | 连接成功 |
| 实时推送 | ✅ 通过 | 新消息即时显示 |
| 断线重连 | ✅ 通过 | 3 秒自动重连 |
| LocalStorage | ✅ 通过 | 刷新后消息保留 |
| 状态显示 | ✅ 通过 | 绿色/红色指示器 |

### 性能测试

```bash
# 加载 1375 条消息
curl -s "http://localhost:18790/api/chat/sessions/agent:main:main/history" | jq '.messages | length'
# 结果：1375

# 发送消息
curl -X POST http://localhost:18790/api/chat/sessions/send \
  -H "Content-Type: application/json" \
  -d '{"sessionKey":"agent:main:main","message":"测试"}'
# 结果：{"success":true}
```

---

## 📝 文件变更

### 新增文件
- `server/routes/chat.js` - 聊天 API 路由（完整重写）
- `src/components/ChatWindow.jsx` - 聊天窗口组件（完整重写）

### 修改文件
- `server/index.js` - 添加 WebSocket 实例传递

---

## 🚀 使用方法

### 1. 访问 Dashboard
打开浏览器访问 `http://localhost:18790` 或 `http://<IP>:18790`

### 2. 切换到聊天页签
点击右上角"💬 聊天"页签

### 3. 选择会话
- 默认显示"WebUI 会话"
- 下拉菜单选择不同会话
- 🦞 主会话 / 💬 群聊

### 4. 发送消息
- 输入框输入消息
- 按 Enter 或点击"发送"按钮
- 消息立即显示在聊天窗口

### 5. 实时接收
- WebSocket 自动推送新消息
- 绿色"实时"指示器表示已连接
- 红色"断开"表示未连接（自动重连中）

---

## 🎨 UI 特性

### 连接状态
- 🟢 **绿色"实时"** - WebSocket 已连接，消息实时推送
- 🔴 **红色"断开"** - WebSocket 未连接，3 秒后自动重连

### 消息样式
- **用户消息** - 右侧，橙色背景
- **AI 消息** - 左侧，深色卡片背景

### 时间显示
- **今天** - 显示时间（12:34）
- **昨天** - 显示"昨天"
- **其他** - 显示日期（03/07）

---

## 🔮 未来改进

### 短期
- [ ] 消息搜索功能
- [ ] 消息分页加载（避免一次加载太多）
- [ ] 图片/文件上传支持
- [ ] Markdown 渲染优化

### 中期
- [ ] 多会话同时监控
- [ ] 消息已读/未读标记
- [ ] 会话重命名
- [ ] 导出聊天记录

### 长期
- [ ] 语音消息支持
- [ ] 视频通话集成
- [ ] AI 回复建议
- [ ] 消息翻译

---

## 📚 相关文档

- [OpenClaw 会话管理](https://docs.openclaw.ai/sessions)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [LocalStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)

---

**版本：** v2.0.4  
**实现者：** OpenClaw Assistant  
**状态：** ✅ 完成并测试通过
