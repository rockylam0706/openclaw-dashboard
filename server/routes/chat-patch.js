// ✅ 分页支持补丁 - 修改三个 API 以支持分页
// 使用方法：node server/routes/chat-patch.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const chatFilePath = path.join(__dirname, 'chat.js');

let content = fs.readFileSync(chatFilePath, 'utf-8');

// 1. 修改 /api/chat/sessions/:sessionKey/history 返回 total
content = content.replace(
  /res\.json\({ success: true, messages: messages, toolMessages: toolMessages }\);/,
  `res.json({ 
      success: true, 
      messages: messages, 
      toolMessages: toolMessages,
      total: lines.length
    });`
);

// 2. 修改 /api/chat/feishu-messages 支持分页
content = content.replace(
  /router\.get\('\/feishu-messages', async \(req, res\) => {/,
  `router.get('/feishu-messages', async (req, res) => {
  const { offset = '0', limit = '40' } = req.query;
  const offsetNum = parseInt(offset, 10);
  const limitNum = parseInt(limit, 10);`
);

content = content.replace(
  /const lines = content\.trim\(\)\.split\('\\n'\)\.filter\(line => line\.trim\(\)\);/,
  `const lines = content.trim().split('\\n').filter(line => line.trim());
    
    // ✅ 分页：从后往前取（最新消息优先）
    const total = lines.length;
    const reversedLines = [...lines].reverse();
    const pagedLines = reversedLines.slice(offsetNum, offsetNum + limitNum);`
);

content = content.replace(
  /lines\.forEach\(\(line\) => {/g,
  `pagedLines.forEach((line) => {`
);

console.log('✅ 补丁应用完成');
