import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// 工作空间根目录
const WORKSPACE_ROOT = path.join(process.env.HOME || '', '.openclaw', 'workspace');

// 元文档列表
const META_DOCS = [
  { id: 'user', name: 'USER.md', description: '用户信息' },
  { id: 'soul', name: 'SOUL.md', description: 'AI 身份定义' },
  { id: 'identity', name: 'IDENTITY.md', description: 'AI 身份标识' },
  { id: 'tools', name: 'TOOLS.md', description: '工具配置' },
  { id: 'agents', name: 'AGENTS.md', description: 'AI 代理指南' },
  { id: 'heartbeat', name: 'HEARTBEAT.md', description: '心跳检查清单' }
];

// 获取元文档列表
router.get('/list', (req, res) => {
  try {
    const docs = META_DOCS.map(doc => {
      const filePath = path.join(WORKSPACE_ROOT, doc.name);
      const exists = fs.existsSync(filePath);
      let size = 0;
      let modified = null;
      
      if (exists) {
        const stats = fs.statSync(filePath);
        size = stats.size;
        modified = stats.mtime.toISOString();
      }
      
      return {
        ...doc,
        exists,
        size,
        modified
      };
    });
    
    res.json({ success: true, docs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取元文档内容
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const doc = META_DOCS.find(d => d.id === id);
    
    if (!doc) {
      return res.status(404).json({ error: '文档不存在' });
    }
    
    const filePath = path.join(WORKSPACE_ROOT, doc.name);
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      res.json({ 
        success: true, 
        file: doc.name,
        id: doc.id,
        description: doc.description,
        content 
      });
    } else {
      res.json({ 
        success: true, 
        file: doc.name,
        id: doc.id,
        description: doc.description,
        content: `# ${doc.name.replace('.md', '')}\n\n`
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新元文档
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const doc = META_DOCS.find(d => d.id === id);
    
    if (!doc) {
      return res.status(404).json({ error: '文档不存在' });
    }
    
    const filePath = path.join(WORKSPACE_ROOT, doc.name);
    fs.writeFileSync(filePath, content, 'utf-8');
    
    res.json({ 
      success: true, 
      file: doc.name,
      id: doc.id,
      message: '文档已保存'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
