import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.DASHBOARD_PORT || 18790;
const DIST_DIR = path.join(__dirname, '../dist');

// 简单的路由处理
const routeHandlers = {};

// 注册路由
function registerRoute(method, path, handler) {
  routeHandlers[`${method}:${path}`] = handler;
}

// 导入并注册 API 路由
const statusRoutes = (await import('./routes/status.js')).default;
const taskRoutes = (await import('./routes/tasks.js')).default;
const sessionRoutes = (await import('./routes/sessions.js')).default;
const memoryRoutes = (await import('./routes/memory.js')).default;
const cronRoutes = (await import('./routes/cron.js')).default;
const commandRoutes = (await import('./routes/command.js')).default;
const docsRoutes = (await import('./routes/docs.js')).default;
const backupRoutes = (await import('./routes/backup.js')).default;
const chatRoutes = (await import('./routes/chat.js')).default;

// 简化的 Express 适配器
function createRouter() {
  const routes = { GET: {}, POST: {}, PUT: {}, DELETE: {} };
  
  const router = {
    get: (path, handler) => { routes.GET[path] = handler; },
    post: (path, handler) => { routes.POST[path] = handler; },
    put: (path, handler) => { routes.PUT[path] = handler; },
    delete: (path, handler) => { routes.DELETE[path] = handler; },
  };
  
  return { router, routes };
}

// 创建 HTTP 服务器
const server = http.createServer(async (req, res) => {
  const startTime = Date.now();
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;
  
  // CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // API 路由处理
  if (pathname.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
    
    // 简单的路由匹配
    let body = '';
    if (req.method === 'POST' || req.method === 'PUT') {
      for await (const chunk of req) {
        body += chunk;
      }
    }
    
    req.body = body ? JSON.parse(body) : {};
    req.query = Object.fromEntries(url.searchParams);
    
    const mockRes = {
      statusCode: 200,
      headers: {},
      setHeader: (k, v) => { mockRes.headers[k] = v; res.setHeader(k, v); },
      writeHead: (code, headers) => { mockRes.statusCode = code; Object.entries(headers || {}).forEach(([k, v]) => res.setHeader(k, v)); },
      end: (data) => {
        res.writeHead(mockRes.statusCode);
        res.end(data);
        console.log(`[${new Date().toISOString()}] ${req.method} ${pathname} ${mockRes.statusCode} ${Date.now() - startTime}ms`);
      },
      json: (data) => mockRes.end(JSON.stringify(data)),
      status: (code) => { mockRes.statusCode = code; return mockRes; },
    };
    
    // 路由匹配
    const apiPath = pathname.replace(/^\/api\/[^/]+/, '');
    const basePath = pathname.match(/^\/api\/[^/]+/)?.[0] || '';
    
    try {
      // 简单处理：调用对应路由
      if (pathname.startsWith('/api/status')) {
        statusRoutes(mockRes, { method: req.method, path: apiPath, query: req.query, body: req.body });
      } else if (pathname.startsWith('/api/tasks')) {
        taskRoutes(mockRes, { method: req.method, path: apiPath, query: req.query, body: req.body });
      } else if (pathname.startsWith('/api/sessions')) {
        sessionRoutes(mockRes, { method: req.method, path: apiPath, query: req.query, body: req.body });
      } else if (pathname.startsWith('/api/memory')) {
        memoryRoutes(mockRes, { method: req.method, path: apiPath, query: req.query, body: req.body });
      } else if (pathname.startsWith('/api/cron')) {
        cronRoutes(mockRes, { method: req.method, path: apiPath, query: req.query, body: req.body });
      } else if (pathname.startsWith('/api/command')) {
        commandRoutes(mockRes, { method: req.method, path: apiPath, query: req.query, body: req.body });
      } else if (pathname.startsWith('/api/docs')) {
        docsRoutes(mockRes, { method: req.method, path: apiPath, query: req.query, body: req.body });
      } else if (pathname.startsWith('/api/backup')) {
        backupRoutes(mockRes, { method: req.method, path: apiPath, query: req.query, body: req.body });
      } else if (pathname.startsWith('/api/chat')) {
        chatRoutes(mockRes, { method: req.method, path: apiPath, query: req.query, body: req.body });
      } else {
        mockRes.statusCode = 404;
        mockRes.end(JSON.stringify({ error: 'Not found' }));
      }
    } catch (error) {
      console.error('API 错误:', error);
      mockRes.statusCode = 500;
      mockRes.end(JSON.stringify({ error: error.message }));
    }
    return;
  }
  
  // 静态文件服务
  let filePath = path.join(DIST_DIR, pathname === '/' ? '/index.html' : pathname);
  
  try {
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      const ext = path.extname(filePath);
      const contentTypes = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.ico': 'image/x-icon',
      };
      
      res.writeHead(200, {
        'Content-Type': contentTypes[ext] || 'application/octet-stream',
        'Cache-Control': pathname.startsWith('/assets/') ? 'public, max-age=3600, immutable' : 'no-cache',
      });
      
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
      stream.on('end', () => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${pathname} 200 ${Date.now() - startTime}ms`);
      });
      return;
    }
  } catch (e) {
    // 文件不存在，返回 index.html (SPA)
  }
  
  // SPA 回退
  res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' });
  fs.createReadStream(path.join(DIST_DIR, 'index.html')).pipe(res);
});

// WebSocket 服务器
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('客户端已连接 WebSocket');
  
  ws.on('message', (message) => {
    ws.send(message);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket 错误:', error);
  });
  
  // 心跳
  const heartbeat = setInterval(() => {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'heartbeat' }));
    }
  }, 30000);
  
  ws.on('close', () => {
    clearInterval(heartbeat);
    console.log('客户端已断开 WebSocket');
  });
});

// 启动服务器
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🦞 Native Server running at http://0.0.0.0:${PORT}`);
  console.log(`WebSocket: ws://0.0.0.0:${PORT}/ws`);
});
