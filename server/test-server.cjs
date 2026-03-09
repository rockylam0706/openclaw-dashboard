// 简化测试服务器 - 排除 Express 问题
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 18790;
const DIST_DIR = path.join(__dirname, '../dist');

const server = http.createServer((req, res) => {
  const start = Date.now();
  
  if (req.url === '/' || req.url === '/index.html') {
    const html = fs.readFileSync(path.join(DIST_DIR, 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    console.log(`GET / - ${Date.now() - start}ms`);
  } else if (req.url.startsWith('/assets/')) {
    const filePath = path.join(DIST_DIR, req.url);
    try {
      const ext = path.extname(filePath);
      const contentType = ext === '.js' ? 'application/javascript' : 
                         ext === '.css' ? 'text/css' : 'application/octet-stream';
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
      console.log(`GET ${req.url} - ${Date.now() - start}ms`);
    } catch (e) {
      res.writeHead(404);
      res.end('Not found');
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🦞 Test Server running at http://0.0.0.0:${PORT}`);
});
