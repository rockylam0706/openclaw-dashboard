import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 18790;

console.log('开始导入路由...');
const startImport = Date.now();

// 逐个导入路由
const statusRoutes = (await import('./routes/status.js')).default;
console.log('status:', Date.now() - startImport, 'ms');

const taskRoutes = (await import('./routes/tasks.js')).default;
console.log('tasks:', Date.now() - startImport, 'ms');

const sessionRoutes = (await import('./routes/sessions.js')).default;
console.log('sessions:', Date.now() - startImport, 'ms');

const memoryRoutes = (await import('./routes/memory.js')).default;
console.log('memory:', Date.now() - startImport, 'ms');

const cronRoutes = (await import('./routes/cron.js')).default;
console.log('cron:', Date.now() - startImport, 'ms');

const commandRoutes = (await import('./routes/command.js')).default;
console.log('command:', Date.now() - startImport, 'ms');

const docsRoutes = (await import('./routes/docs.js')).default;
console.log('docs:', Date.now() - startImport, 'ms');

const backupRoutes = (await import('./routes/backup.js')).default;
console.log('backup:', Date.now() - startImport, 'ms');

const chatRoutes = (await import('./routes/chat.js')).default;
console.log('chat:', Date.now() - startImport, 'ms');

console.log('全部路由导入完成:', Date.now() - startImport, 'ms');

const app = express();

app.use(express.static(path.join(__dirname, '../dist'), {
  maxAge: '1h',
  etag: false,
  lastModified: false,
}));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('WS connected');
  ws.on('close', () => console.log('WS closed'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server at http://0.0.0.0:${PORT}`);
});
