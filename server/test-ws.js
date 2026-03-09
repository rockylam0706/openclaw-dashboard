import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 18790;

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
  console.log(`Server + WS at http://0.0.0.0:${PORT}`);
});
