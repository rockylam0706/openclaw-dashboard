import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.DASHBOARD_PORT || 18790;

// 导入路由
import statusRoutes from './routes/status.js';
import taskRoutes from './routes/tasks.js';
import sessionRoutes from './routes/sessions.js';
import memoryRoutes from './routes/memory.js';
import cronRoutes from './routes/cron.js';
import commandRoutes from './routes/command.js';
import docsRoutes from './routes/docs.js';
import backupRoutes from './routes/backup.js';
import chatRoutes from './routes/chat.js';
import agentsRoutes from './routes/agents.js';

const app = express();

// 1. CORS - 最先注册
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 2. JSON 解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 3. API 路由 - 在静态文件之前，避免冲突
app.use('/api/status', statusRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/memory', memoryRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/command', commandRoutes);
app.use('/api/docs', docsRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/agents', agentsRoutes);

// 客户端错误日志接口
app.post('/api/log-error', (req, res) => {
  const errorData = req.body;
  console.error('[CLIENT ERROR]', errorData.message, errorData.url);
  res.sendStatus(200);
});

// 4. 静态文件服务 - HTML 不缓存，JS/CSS 使用哈希文件名
app.use(express.static(path.join(__dirname, '../dist'), {
  etag: true,
  lastModified: true,
  fallthrough: false,
  setHeaders: (res, filePath) => {
    // HTML 文件不缓存，确保用户总是获取最新版本
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    // JS/CSS 使用哈希文件名，可以长期缓存
    if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// 5. SPA 回退 - 所有其他请求返回 index.html
app.use((req, res) => {
  if (req.path.startsWith('/ws')) {
    return res.status(404).send('WebSocket endpoint');
  }
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// 创建 HTTP 服务器
const server = http.createServer(app);

// WebSocket 服务器
const wss = new WebSocketServer({ server, path: '/ws' });

// 传递给 chat 路由
import { setWssInstance } from './routes/chat.js';
setWssInstance(wss);

wss.on('connection', (ws) => {
  console.log('[WS] 客户端已连接');
  
  // 发送当前会话列表
  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      console.log('[WS 收到]', data);
      ws.send(msg); // 回声测试
    } catch (e) {
      ws.send(msg);
    }
  });
  
  ws.on('error', (err) => console.error('[WS Error]', err));
  ws.on('close', () => console.log('[WS] 客户端已断开'));
  
  // 心跳
  const heartbeat = setInterval(() => {
    if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'heartbeat' }));
  }, 30000);
  
  ws.on('close', () => clearInterval(heartbeat));
});

// 启动服务器
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🦞 OpenClaw Dashboard 运行在 http://0.0.0.0:${PORT}`);
  console.log(`本地访问：http://localhost:${PORT}`);
  console.log(`LAN 访问：http://<你的 IP>:${PORT}`);
  console.log(`WebSocket: ws://0.0.0.0:${PORT}/ws`);
});
