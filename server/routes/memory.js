import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// 工作空间根目录
const WORKSPACE_ROOT = path.join(process.env.HOME || '', '.openclaw', 'workspace');
const MEMORY_DIR = path.join(WORKSPACE_ROOT, 'memory');

// 延迟初始化 memory 目录
function ensureMemoryDir() {
  if (!fs.existsSync(MEMORY_DIR)) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
  }
}

// 获取所有记忆文件列表
function getMemoryFiles() {
  ensureMemoryDir();
  try {
    const files = fs.readdirSync(MEMORY_DIR)
      .filter(f => f.endsWith('.md'))
      .map(f => {
        const filePath = path.join(MEMORY_DIR, f);
        const stats = fs.statSync(filePath);
        return {
          name: f,
          date: f.replace('.md', ''),
          size: stats.size,
          modified: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date)); // 按日期降序
    
    return files;
  } catch (error) {
    return [];
  }
}

// 获取 MD 文档内容
router.get('/', (req, res) => {
  try {
    const { file, type } = req.query;
    
    // 获取长期记忆 (MEMORY.md)
    if (type === 'longterm') {
      const longTermPath = path.join(WORKSPACE_ROOT, 'MEMORY.md');
      if (fs.existsSync(longTermPath)) {
        const content = fs.readFileSync(longTermPath, 'utf-8');
        return res.json({ 
          success: true, 
          file: 'MEMORY.md',
          type: 'longterm',
          content 
        });
      } else {
        return res.json({ 
          success: true, 
          file: 'MEMORY.md',
          type: 'longterm',
          content: '# 长期记忆\n\n'
        });
      }
    }
    
    // 获取特定日期的记忆
    if (file) {
      const filePath = path.join(MEMORY_DIR, file);
      // 安全校验：确保路径在 memory 目录内
      const resolvedPath = path.resolve(filePath);
      if (!resolvedPath.startsWith(MEMORY_DIR)) {
        return res.status(400).json({ error: '无效的文件路径' });
      }
      
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        res.json({ 
          success: true, 
          file: path.basename(filePath),
          type: 'daily',
          content 
        });
      } else {
        res.json({ 
          success: true, 
          file: path.basename(filePath),
          type: 'daily',
          content: `# ${path.basename(filePath, '.md')}\n\n`
        });
      }
      return;
    }
    
    // 默认：获取今天的记忆
    const today = new Date().toISOString().split('T')[0];
    const todayFile = path.join(MEMORY_DIR, `${today}.md`);
    
    if (fs.existsSync(todayFile)) {
      const content = fs.readFileSync(todayFile, 'utf-8');
      res.json({ 
        success: true, 
        file: `${today}.md`,
        type: 'daily',
        content 
      });
    } else {
      res.json({ 
        success: true, 
        file: `${today}.md`,
        type: 'daily',
        content: `# ${today}\n\n`
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取记忆文件列表
router.get('/list', (req, res) => {
  try {
    const files = getMemoryFiles();
    const longTermExists = fs.existsSync(path.join(WORKSPACE_ROOT, 'MEMORY.md'));
    
    res.json({
      success: true,
      longTerm: longTermExists,
      daily: files,
      total: files.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新 MD 文档
router.put('/', (req, res) => {
  try {
    const { file, content, type } = req.body;
    
    // 更新长期记忆
    if (type === 'longterm') {
      const longTermPath = path.join(WORKSPACE_ROOT, 'MEMORY.md');
      fs.writeFileSync(longTermPath, content, 'utf-8');
      return res.json({ 
        success: true, 
        file: 'MEMORY.md',
        type: 'longterm',
        message: '长期记忆已保存'
      });
    }
    
    // 更新日常记忆
    const filePath = file 
      ? path.join(MEMORY_DIR, file)
      : path.join(MEMORY_DIR, `${new Date().toISOString().split('T')[0]}.md`);
    
    // 安全校验
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(MEMORY_DIR)) {
      return res.status(400).json({ error: '无效的文件路径' });
    }
    
    fs.writeFileSync(filePath, content, 'utf-8');
    
    res.json({ 
      success: true, 
      file: path.basename(filePath),
      type: 'daily',
      message: '文档已保存'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
