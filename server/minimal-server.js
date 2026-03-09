import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 18790;

const app = express();

// 仅静态文件服务
app.use(express.static(path.join(__dirname, '../dist'), {
  maxAge: '1h',
  etag: false,
  lastModified: false,
}));

// SPA 回退
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Minimal server at http://0.0.0.0:${PORT}`);
});
