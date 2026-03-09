import fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import fastifyWebSocket from '@fastify/websocket';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.DASHBOARD_PORT || 18790;

// 创建 Fastify 实例
const server = fastify({
  logger: {
    level: 'info',
  },
  // 优化：增加连接超时
  connectionTimeout: 5000,
  keepAliveTimeout: 30000,
  requestTimeout: 15000,
});

// 注册插件
await server.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
});

await server.register(fastifyWebSocket);

await server.register(fastifyStatic, {
  root: path.join(__dirname, '../dist'),
  prefix: '/',
  maxAge: '1h',
  immutable: true,
  decorateReply: false,
});

// 导入路由
const statusRoutes = (await import('./routes/status.js')).default;
const taskRoutes = (await import('./routes/tasks.js')).default;
const sessionRoutes = (await import('./routes/sessions.js')).default;
const memoryRoutes = (await import('./routes/memory.js')).default;
const cronRoutes = (await import('./routes/cron.js')).default;
const commandRoutes = (await import('./routes/command.js')).default;
const docsRoutes = (await import('./routes/docs.js')).default;
const backupRoutes = (await import('./routes/backup.js')).default;
const chatRoutes = (await import('./routes/chat.js')).default;

// 注册 API 路由
server.register(async (fastify) => {
  fastify.register(statusRoutes, { prefix: '/api/status' });
  fastify.register(taskRoutes, { prefix: '/api/tasks' });
  fastify.register(sessionRoutes, { prefix: '/api/sessions' });
  fastify.register(memoryRoutes, { prefix: '/api/memory' });
  fastify.register(cronRoutes, { prefix: '/api/cron' });
  fastify.register(commandRoutes, { prefix: '/api/command' });
  fastify.register(docsRoutes, { prefix: '/api/docs' });
  fastify.register(backupRoutes, { prefix: '/api/backup' });
  fastify.register(chatRoutes, { prefix: '/api/chat' });
});

// WebSocket 支持
server.get('/ws', { websocket: true }, (connection, req) => {
  console.log('客户端已连接 WebSocket');
  
  connection.socket.on('message', (message) => {
    connection.socket.send(message);
  });
  
  connection.socket.on('error', (error) => {
    console.error('WebSocket 错误:', error);
  });
  
  // 发送心跳
  const heartbeat = setInterval(() => {
    if (connection.socket.readyState === 1) {
      connection.socket.send(JSON.stringify({ type: 'heartbeat' }));
    }
  }, 30000);
  
  connection.socket.on('close', () => {
    clearInterval(heartbeat);
    console.log('客户端已断开 WebSocket');
  });
});

// SPA 回退 - 所有非 API、非静态文件请求返回 index.html
server.setNotFoundHandler((request, reply) => {
  if (!request.url.startsWith('/api') && !request.url.startsWith('/ws')) {
    reply.type('text/html').sendFile('index.html');
  } else {
    reply.code(404).send({ error: 'Not Found' });
  }
});

// 启动服务器
try {
  await server.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`🦞 OpenClaw Dashboard 运行在 http://0.0.0.0:${PORT}`);
  console.log(`WebSocket: ws://0.0.0.0:${PORT}/ws`);
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
