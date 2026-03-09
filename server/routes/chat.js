import express from 'express';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// 会话文件路径
const SESSIONS_DIR = path.join(process.env.HOME || '', '.openclaw', 'agents', 'main', 'sessions');
const SESSIONS_FILE = path.join(SESSIONS_DIR, 'sessions.json');

// WebSocket 客户端集合
let wssInstance = null;

// 导出设置 WSS 实例的方法
export function setWssInstance(wss) {
  wssInstance = wss;
}

// 广播消息给所有连接的客户端
function broadcastToClients(data) {
  if (!wssInstance) return;
  
  const message = JSON.stringify(data);
  wssInstance.clients.forEach(client => {
    if (client.readyState === 1) {

// ✅ 时间戳解析辅助函数（处理字符串和数字格式）
function parseTimestamp(ts) {
  if (!ts) return null;
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'string') {
    const parsed = new Date(ts).getTime();
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}
      client.send(message);
    }
  });
}

// 解析飞书消息内容
function parseFeishuMessage(text) {
  if (!text) return null;
  
  // ✅ 修复：飞书消息必须有 System: [timestamp] 前缀
  // 格式：System: [2026-03-07 08:46:36 GMT+8] Feishu[default] DM from ou_xxx: 消息内容
  // ✅ 防止代码片段中的 Feishu[default] 被误判
  const dmMatch = text.match(/^System: \[[\d\-\: GMT+]+\] Feishu\[default\] DM from ([\w-]+): ([\s\S]+)/);
  const groupMatch = text.match(/^System: \[[\d\-\: GMT+]+\] Feishu\[default\] group.*?: ([\s\S]+)/);
  
  if (dmMatch) {
    return {
      isFeishu: true,
      type: '私聊',
      sender: dmMatch[1],
      content: dmMatch[2].trim()
    };
  }
  if (groupMatch) {
    return {
      isFeishu: true,
      type: '群聊',
      sender: '群聊',
      content: groupMatch[1].trim()
    };
  }
  return null;
}

// 提取工具调用信息（学习 OpenClaw WebUI 设计）
function extractToolInfo(text) {
  if (!text) return null;
  
  // 匹配 Exec 命令执行结果
  // 格式：Exec completed (read, code 0) 或 Exec failed (write, code 1)
  const execMatch = text.match(/Exec (completed|failed) \(([^,]+), code (\d+)\)/);
  if (execMatch) {
    return {
      type: 'exec',
      status: execMatch[1], // 'completed' or 'failed'
      tool: execMatch[2],   // tool name like 'read', 'write', 'exec'
      code: parseInt(execMatch[3], 10)
    };
  }
  
  // 匹配工具调用开始
  // 格式：[tool:read] 或 Calling tool: read
  const toolCallMatch = text.match(/\[tool:(\w+)\]|Calling tool: (\w+)/);
  if (toolCallMatch) {
    return {
      type: 'tool-call',
      tool: toolCallMatch[1] || toolCallMatch[2]
    };
  }
  
  // 匹配进程输出
  // 格式：Process output: ... 或 [process:xxx]
  const processMatch = text.match(/Process output:|^\[process:/);
  if (processMatch) {
    return {
      type: 'process',
      tool: 'process'
    };
  }
  
  // 匹配浏览器操作
  // 格式：Browser: ... 或 [browser:xxx]
  const browserMatch = text.match(/^Browser:|^\[browser:/);
  if (browserMatch) {
    return {
      type: 'browser',
      tool: 'browser'
    };
  }
  
  return null;
}

// 判断消息类型（学习 OpenClaw WebUI 设计）
// 返回值：'conversation' | 'exec-result' | 'tool-call' | 'system' | 'feishu'
function getMessageType(text, role, feishuInfo) {
  // 飞书消息优先
  if (feishuInfo) {
    return 'feishu';
  }
  
  // 工具执行结果
  const toolInfo = extractToolInfo(text);
  if (toolInfo && (toolInfo.type === 'exec' || toolInfo.type === 'process')) {
    return 'exec-result';
  }
  
  // 工具调用中
  if (toolInfo && toolInfo.type === 'tool-call') {
    return 'tool-call';
  }
  
  // 系统消息
  if (text && (text.startsWith('System:') || text.startsWith('[System]'))) {
    return 'system';
  }
  
  // 默认：普通对话（不压缩）
  return 'conversation';
}

// 获取主会话消息（包含所有消息）- A2 方案：分离普通消息和工具消息
router.get('/sessions/:sessionKey/history', (req, res) => {
  const { sessionKey } = req.params;
  
  try {
    if (!fs.existsSync(SESSIONS_FILE)) {
      return res.json({ success: false, error: '会话文件不存在', messages: [], toolMessages: [] });
    }
    
    const sessionsData = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
    const session = sessionsData[sessionKey];
    
    if (!session) {
      return res.json({ success: false, error: '会话不存在', messages: [], toolMessages: [] });
    }
    
    const sessionId = session.sessionId;
    const jsonlFile = path.join(SESSIONS_DIR, `${sessionId}.jsonl`);
    
    if (!fs.existsSync(jsonlFile)) {
      return res.json({ success: false, error: '会话消息文件不存在', messages: [], toolMessages: [] });
    }
    
    const content = fs.readFileSync(jsonlFile, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    
    const messages = [];        // 普通对话消息
    const toolMessages = [];    // 工具调用消息（A2 方案核心）
    
    pagedLines.forEach((line, index) => {
      try {
        const entry = JSON.parse(line);
        if (entry.type === 'message') {
          const msg = entry.message;
          if (msg && msg.content) {
            let textContent = '';
            if (Array.isArray(msg.content)) {
              msg.content.forEach(item => {
                if (item.type === 'text') textContent += item.text;
              });
            } else if (typeof msg.content === 'string') {
              textContent = msg.content;
            }
            
            const feishuInfo = parseFeishuMessage(textContent);
            const toolInfo = extractToolInfo(textContent);
            
            // ✅ A2 方案：区分普通消息和工具消息（同时检查 role 字段）
            const isToolResult = msg.role === 'toolResult' || msg.role === 'tool' || msg.role === 'function';
            const hasExecInfo = toolInfo && (toolInfo.type === 'exec' || toolInfo.type === 'process');
            
            if (isToolResult || hasExecInfo) {
              // 工具消息单独存储
              toolMessages.push({
                id: `tool_${toolMessages.length}`,
                channel: feishuInfo ? 'feishu' : 'webui',
                toolName: toolInfo?.tool || msg.toolName || 'tool',
                toolStatus: toolInfo?.status || (isToolResult ? 'completed' : 'unknown'),
                toolCode: toolInfo?.code,
                content: textContent,
                // ✅ 统一时间戳格式为数字（毫秒）
                timestamp: parseTimestamp(entry.timestamp) || parseTimestamp(msg.timestamp) || Date.now(),
                role: msg.role,
                isFeishu: !!feishuInfo,
                feishuType: feishuInfo?.type
              });
            } else {
              // 普通对话消息
              messages.push({
                id: `msg_${messages.length}`,
                channel: feishuInfo ? 'feishu' : 'webui',
                sender: feishuInfo ? `[飞书${feishuInfo.type}] ${feishuInfo.sender}` : (msg.role === 'user' ? '用户' : 'AI'),
                content: feishuInfo ? feishuInfo.content : textContent,
                // ✅ 统一时间戳格式为数字（毫秒）
                timestamp: parseTimestamp(entry.timestamp) || parseTimestamp(msg.timestamp) || Date.now(),
                isSelf: msg.role === 'user',
                role: msg.role,
                isFeishu: !!feishuInfo,
                feishuType: feishuInfo?.type
              });
            }
          }
        }
      } catch (e) {}
    });
    
    // ✅ A2 方案：返回两个独立数组
    res.json({ success: true, messages: messages, toolMessages: toolMessages, total: total, offset: offsetNum, limit: limitNum });
  } catch (e) {
    console.error('读取会话历史失败:', e.message);
    res.json({ success: false, error: e.message, messages: [], toolMessages: [] });
  }
});

// 获取飞书消息（同时读取飞书会话 + WebUI 会话中的飞书消息）- A2 方案 + 分页支持
router.get('/feishu-messages', async (req, res) => {
  try {
    const { offset = '0', limit = '40' } = req.query;
    const offsetNum = parseInt(offset, 10);
    const limitNum = parseInt(limit, 10);
    
    const sessionsData = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
    
    const allFeishuLines = [];
    
    // ✅ 步骤 1：读取飞书会话（AI 的飞书回复）- 只读取 message 类型的行
    const feishuSessionKeys = Object.keys(sessionsData).filter(key => 
      key.includes('feishu')
    );
    
    for (const sessionKey of feishuSessionKeys) {
      const session = sessionsData[sessionKey];
      if (!session) continue;
      
      const jsonlFile = path.join(SESSIONS_DIR, `${session.sessionId}.jsonl`);
      if (!fs.existsSync(jsonlFile)) continue;
      
      const content = fs.readFileSync(jsonlFile, 'utf-8');
      const lines = content.trim().split('\n').filter(line => {
        try {
          const entry = JSON.parse(line);
          return entry.type === 'message';  // ✅ 只保留 message 类型的行
        } catch {
          return false;
        }
      });
      allFeishuLines.push(...lines);
    }
    
    // ✅ 步骤 2：读取 WebUI 会话，过滤出飞书用户消息（Feishu[default]）
    const mainSession = sessionsData['agent:main:main'];
    if (mainSession) {
      const jsonlFile = path.join(SESSIONS_DIR, `${mainSession.sessionId}.jsonl`);
      if (fs.existsSync(jsonlFile)) {
        const content = fs.readFileSync(jsonlFile, 'utf-8');
        const lines = content.trim().split('\n').filter(line => {
          try {
            const entry = JSON.parse(line);
            // ✅ 只保留 message 类型 + user role + Feishu 标识
            if (entry.type !== 'message' || entry.message?.role !== 'user') return false;
            const textContent = Array.isArray(entry.message.content) 
              ? entry.message.content.map(item => item.text || '').join('')
              : (entry.message.content || '');
            return textContent.includes('Feishu[');
          } catch {
            return false;
          }
        });
        allFeishuLines.push(...lines);
      }
    }
    
    // ✅ 按时间戳排序（旧→新）
    allFeishuLines.sort((a, b) => {
      try {
        const entryA = JSON.parse(a);
        const entryB = JSON.parse(b);
        const timeA = entryA.timestamp ? (typeof entryA.timestamp === 'string' ? new Date(entryA.timestamp).getTime() : entryA.timestamp) : 0;
        const timeB = entryB.timestamp ? (typeof entryB.timestamp === 'string' ? new Date(entryB.timestamp).getTime() : entryB.timestamp) : 0;
        return timeA - timeB;
      } catch {
        return 0;
      }
    });
    
    // ✅ 不去重：飞书会话和 WebUI 会话来源不同，即使 ID 相同也应保留
    const dedupedLines = allFeishuLines;
    
    // ✅ 分页：保持旧→新顺序（offset=0 取最旧的消息）
    const total = dedupedLines.length;  // ✅ 飞书相关消息总数（去重后）
    const pagedLines = dedupedLines.slice(offsetNum, offsetNum + limitNum);
    
    const messages = [];        // 飞书消息 + AI 回复
    const toolMessages = [];    // 工具消息（飞书窗口不显示）
    
    pagedLines.forEach((line) => {
      try {
        const entry = JSON.parse(line);
        if (entry.type === 'message') {
          const msg = entry.message;
          if (msg && msg.content) {
            let textContent = '';
            if (Array.isArray(msg.content)) {
              msg.content.forEach(item => {
                if (item.type === 'text') textContent += item.text;
              });
            } else if (typeof msg.content === 'string') {
              textContent = msg.content;
            }
            
            const toolInfo = extractToolInfo(textContent);
            
            // ✅ A2 方案：区分普通消息和工具消息（同时检查 role 字段）
            const isToolResult = msg.role === 'toolResult' || msg.role === 'tool' || msg.role === 'function';
            const hasExecInfo = toolInfo && (toolInfo.type === 'exec' || toolInfo.type === 'process');
            
            // ✅ 方案 A：读取飞书会话，按 role 区分消息类型
            if (msg.role === 'user' && textContent.trim().length > 0) {
              // ✅ 飞书用户消息
              messages.push({
                id: `feishu_${messages.length}`,
                channel: 'feishu',
                sender: '用户',
                content: textContent,
                // ✅ 统一时间戳格式为数字（毫秒）
                timestamp: parseTimestamp(entry.timestamp) || parseTimestamp(msg.timestamp) || Date.now(),
                isSelf: true,
                role: msg.role,
                isFeishu: true,
                feishuType: 'user'
              });
            } else if (msg.role === 'assistant' && textContent.trim().length > 0) {
              // ✅ AI 回复（飞书窗口显示）
              messages.push({
                id: `feishu_${messages.length}`,
                channel: 'feishu',
                sender: 'AI',
                content: textContent,
                timestamp: entry.timestamp ? (typeof entry.timestamp === 'string' ? new Date(entry.timestamp).getTime() : entry.timestamp) : Date.now(),
                isSelf: false,
                role: msg.role,
                isFeishu: false  // 不是飞书用户消息，但是 AI 回复
              });
            } else if (isToolResult || hasExecInfo) {
              // 工具消息单独存储（飞书窗口不显示）
              toolMessages.push({
                id: `tool_${toolMessages.length}`,
                channel: 'webui',
                toolName: toolInfo?.tool || msg.toolName || 'tool',
                toolStatus: toolInfo?.status || (isToolResult ? 'completed' : 'unknown'),
                toolCode: toolInfo?.code,
                content: textContent,
                // ✅ 统一时间戳格式为数字（毫秒）
                timestamp: parseTimestamp(entry.timestamp) || parseTimestamp(msg.timestamp) || Date.now(),
                role: msg.role,
                isFeishu: false
              });
            }
          }
        }
      } catch (e) {}
    });
    
    // ✅ A2 方案 + 分页：返回两个独立数组 + 总数
    res.json({ 
      success: true, 
      messages: messages,
      toolMessages: toolMessages,
      total: total,  // ✅ JSONL 总行数
      offset: offsetNum,
      limit: limitNum
    });
  } catch (e) {
    console.error('读取飞书消息失败:', e.message);
    res.json({ success: false, error: e.message, messages: [], toolMessages: [] });
  }
});

// 测试端点：诊断 WebUI 消息过滤
router.get('/webui-debug', async (req, res) => {
  try {
    const sessionsData = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
    const mainSession = sessionsData['agent:main:main'];
    const jsonlFile = path.join(SESSIONS_DIR, mainSession.sessionId + '.jsonl');
    const content = fs.readFileSync(jsonlFile, 'utf-8');
    const lines = content.trim().split('\n');
    
    const filtered = [];
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.type !== 'message' || !entry.message?.content) continue;
        let text = '';
        if (Array.isArray(entry.message.content)) {
          text = entry.message.content.map(i => i.text || '').join('');
        } else {
          text = entry.message.content || '';
        }
        const feishu = parseFeishuMessage(text);
        const empty = text.trim().length === 0;
        if (!feishu && !empty) filtered.push({ role: entry.message.role, len: text.length });
      } catch (e) {}
    }
    
    const reversed = [...filtered].reverse();
    res.json({ total: filtered.length, first10: reversed.slice(0, 10) });
  } catch (e) {
    res.json({ error: e.message });
  }
});

// 获取 WebUI 消息（排除飞书）- A2 方案：分离普通消息和工具消息 + 分页支持
router.get('/webui-messages', async (req, res) => {
  try {
    const { offset = '0', limit = '40' } = req.query;
    const offsetNum = parseInt(offset, 10);
    const limitNum = parseInt(limit, 10);
    
    const sessionsData = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
    const mainSession = sessionsData['agent:main:main'];
    
    if (!mainSession) {
      return res.json({ success: false, error: '主会话不存在', messages: [], toolMessages: [], total: 0 });
    }
    
    const jsonlFile = path.join(SESSIONS_DIR, `${mainSession.sessionId}.jsonl`);
    if (!fs.existsSync(jsonlFile)) {
      return res.json({ success: false, error: '会话文件不存在', messages: [], toolMessages: [], total: 0 });
    }
    
    const content = fs.readFileSync(jsonlFile, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l.trim());
    
    const filteredLines = [];
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.type !== 'message' || !entry.message?.content) continue;
        let text = '';
        if (Array.isArray(entry.message.content)) {
          text = entry.message.content.map(i => i.text || '').join('');
        } else {
          text = entry.message.content || '';
        }
        const feishu = parseFeishuMessage(text);
        const empty = text.trim().length === 0;
        if (!feishu && !empty) filteredLines.push(line);
      } catch (e) {}
    }
    
    const reversed = [...filteredLines].reverse();
    const paged = reversed.slice(offsetNum, offsetNum + limitNum);
    
    const messages = [];
    const toolMessages = [];
    
    for (const line of paged) {
      const entry = JSON.parse(line);
      const msg = entry.message;
      let text = '';
      if (Array.isArray(msg.content)) {
        text = msg.content.map(i => i.text || '').join('');
      } else {
        text = msg.content || '';
      }
      
      const feishu = parseFeishuMessage(text);
      const toolInfo = extractToolInfo(text);
      const isToolResult = msg.role === 'toolResult';
      const hasExecInfo = toolInfo && toolInfo.type === 'exec';
      
      if (!feishu) {
        if (isToolResult || hasExecInfo) {
          toolMessages.push({
            id: `tool_${toolMessages.length}`,
            channel: 'webui',
            toolName: toolInfo?.tool || msg.toolName || 'tool',
            toolStatus: toolInfo?.status || (isToolResult ? 'completed' : 'unknown'),
            toolCode: toolInfo?.code,
            content: text,
            timestamp: entry.timestamp || msg.timestamp || Date.now(),
            role: msg.role,
            isFeishu: false
          });
        } else if (text.trim().length > 0) {
          messages.push({
            id: `webui_${messages.length}`,
            channel: 'webui',
            sender: msg.role === 'user' ? '用户' : 'AI',
            content: text,
            timestamp: entry.timestamp || msg.timestamp || Date.now(),
            isSelf: msg.role === 'user',
            role: msg.role,
            isFeishu: false
          });
        }
      }
    }
    
    res.json({ success: true, messages, toolMessages, total: filteredLines.length, offset: offsetNum, limit: limitNum });
  } catch (e) {
    console.error('读取 WebUI 消息失败:', e.message);
    res.json({ success: false, error: e.message, messages: [], toolMessages: [], total: 0 });
  }
});

// 发送消息到指定会话
// ✅ 全部消息 API（主会话所有消息）
router.get('/all-messages', async (req, res) => {
  try {
    const sessionKey = 'agent:main:main';
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 40;
    
    if (!fs.existsSync(SESSIONS_FILE)) {
      return res.json({ success: false, error: '会话文件不存在', messages: [], toolMessages: [], total: 0, offset, limit });
    }
    
    const sessionsData = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
    const session = sessionsData[sessionKey];
    
    if (!session) {
      return res.json({ success: false, error: '会话不存在', messages: [], toolMessages: [], total: 0, offset, limit });
    }
    
    const sessionId = session.sessionId;
    const jsonlFile = path.join(SESSIONS_DIR, `${sessionId}.jsonl`);
    
    if (!fs.existsSync(jsonlFile)) {
      return res.json({ success: false, error: '会话消息文件不存在', messages: [], toolMessages: [], total: 0, offset, limit });
    }
    
    const content = fs.readFileSync(jsonlFile, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    
    // ✅ 先过滤所有消息（排除空消息），再分页
    const filteredLines = [];
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.type !== 'message' || !entry.message?.content) continue;
        
        let textContent = '';
        if (Array.isArray(entry.message.content)) {
          entry.message.content.forEach(item => {
            if (item.type === 'text') textContent += item.text;
          });
        } else if (typeof entry.message.content === 'string') {
          textContent = entry.message.content;
        }
        
        const isEmpty = textContent.trim().length === 0;
        
        // ✅ 排除空消息
        if (!isEmpty) {
          filteredLines.push(line);
        }
      } catch (e) {}
    }
    
    // ✅ 分页：从后往前读取（最新消息在前）
    const total = filteredLines.length;  // ✅ 过滤后的总数
    const reversedLines = [...filteredLines].reverse();
    const pagedLines = reversedLines.slice(offset, offset + limit);
    
    const messages = [];
    const toolMessages = [];
    
    pagedLines.forEach((line) => {
      try {
        const entry = JSON.parse(line);
        if (entry.type === 'message') {
          const msg = entry.message;
          if (msg && msg.content) {
            let textContent = '';
            if (Array.isArray(msg.content)) {
              msg.content.forEach(item => {
                if (item.type === 'text') textContent += item.text;
              });
            } else if (typeof msg.content === 'string') {
              textContent = msg.content;
            }
            
            const feishuInfo = parseFeishuMessage(textContent);
            const toolInfo = extractToolInfo(textContent);
            const isToolResult = msg.role === 'toolResult' || msg.role === 'tool' || msg.role === 'function';
            const hasExecInfo = toolInfo && (toolInfo.type === 'exec' || toolInfo.type === 'process');
            
            if (isToolResult || hasExecInfo) {
              toolMessages.push({
                id: `tool_${toolMessages.length}`,
                channel: 'all',
                toolName: toolInfo?.tool || msg.toolName || 'tool',
                toolStatus: toolInfo?.status || (isToolResult ? 'completed' : 'unknown'),
                toolCode: toolInfo?.code,
                content: textContent,
                timestamp: entry.timestamp ? (typeof entry.timestamp === 'string' ? new Date(entry.timestamp).getTime() : entry.timestamp) : Date.now(),
                role: msg.role,
                isFeishu: !!feishuInfo
              });
            } else if (textContent.trim().length > 0) {
              messages.push({
                id: `all_${messages.length}`,
                channel: 'all',
                sender: msg.role === 'user' ? '用户' : 'AI',
                content: textContent,
                timestamp: entry.timestamp ? (typeof entry.timestamp === 'string' ? new Date(entry.timestamp).getTime() : entry.timestamp) : Date.now(),
                isSelf: msg.role === 'user',
                role: msg.role,
                isFeishu: !!feishuInfo
              });
            }
          }
        }
      } catch (e) {}
    });
    
    res.json({ success: true, messages, toolMessages, total, offset, limit });
  } catch (e) {
    console.error('读取全部消息失败:', e.message);
    res.status(500).json({ success: false, error: e.message, messages: [], toolMessages: [], total: 0, offset: 0, limit: 40 });
  }
});

router.post('/sessions/send', (req, res) => {
  const { sessionKey, message } = req.body;
  
  if (!sessionKey || !message) {
    return res.status(400).json({ success: false, error: '缺少 sessionKey 或 message' });
  }
  
  exec(`openclaw-cn sessions send --session-key "${sessionKey}" "${message.replace(/"/g, '\\"')}"`, (error, stdout, stderr) => {
    if (error) {
      console.error('发送消息失败:', error);
      return res.status(500).json({ success: false, error: stderr || error.message });
    }
    res.json({ success: true, message: '消息已发送', response: stdout });
  });
});

// 获取会话列表
router.get('/sessions', (req, res) => {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) {
      return res.json({ success: false, error: '会话文件不存在', sessions: [] });
    }
    
    const sessionsData = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
    const sessions = Object.entries(sessionsData).map(([key, data]) => ({
      sessionKey: key,
      kind: data.kind || 'direct',
      updatedAt: data.updatedAt || Date.now()
    }));
    
    res.json({ success: true, sessions: sessions });
  } catch (e) {
    console.error('读取会话列表失败:', e.message);
    res.json({ success: false, error: e.message, sessions: [] });
  }
});

// 监控会话文件变化
let lastSessionState = null;
function watchSessions() {
  if (!fs.existsSync(SESSIONS_FILE)) {
    setTimeout(watchSessions, 5000);
    return;
  }
  
  try {
    const content = fs.readFileSync(SESSIONS_FILE, 'utf-8');
    lastSessionState = JSON.parse(content);
  } catch (e) {
    console.error('读取会话文件失败:', e.message);
  }
  
  fs.watch(SESSIONS_FILE, (eventType) => {
    if (eventType === 'change') {
      try {
        const content = fs.readFileSync(SESSIONS_FILE, 'utf-8');
        const newState = JSON.parse(content);
        
        if (lastSessionState) {
          const oldKeys = Object.keys(lastSessionState);
          const newKeys = Object.keys(newState);
          
          if (newKeys.length > oldKeys.length) {
            broadcastToClients({ 
              type: 'sessions_changed', 
              sessions: newKeys.map(key => ({
                sessionKey: key,
                kind: newState[key].kind,
                updatedAt: newState[key].updatedAt
              }))
            });
          }
        }
        
        lastSessionState = newState;
      } catch (e) {
        console.error('监控会话文件变化失败:', e.message);
      }
    }
  });
  
  if (fs.existsSync(SESSIONS_DIR)) {
    fs.readdir(SESSIONS_DIR, (err, files) => {
      if (err) return;
      
      const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));
      jsonlFiles.forEach(file => {
        const filePath = path.join(SESSIONS_DIR, file);
        const sessionId = file.replace('.jsonl', '');
        watchJsonlFile(filePath, sessionId);
      });
    });
  }
}

function watchJsonlFile(filePath, sessionId) {
  let lastSize = 0;
  let lastMtime = 0;
  
  const initWatch = () => {
    try {
      const stats = fs.statSync(filePath);
      lastSize = stats.size;
      lastMtime = stats.mtimeMs;
      console.log(`[监控] 开始监控会话 ${sessionId}, 文件大小：${lastSize} bytes`);
    } catch (e) {
      setTimeout(() => initWatch(), 5000);
      return;
    }
  };
  
  initWatch();
  
  fs.watch(filePath, (eventType) => {
    if (eventType === 'change') {
      try {
        const stats = fs.statSync(filePath);
        if (stats.size > lastSize || stats.mtimeMs > lastMtime) {
          console.log(`[监控] 检测到新消息 - 会话 ${sessionId}, ${lastSize} → ${stats.size} bytes`);
          broadcastToClients({
            type: 'new_message',
            sessionId: sessionId,
            timestamp: Date.now()
          });
          lastSize = stats.size;
          lastMtime = stats.mtimeMs;
        }
      } catch (e) {
        console.error('监控 JSONL 文件失败:', e.message);
      }
    }
  });
}

watchSessions();

export default router;
