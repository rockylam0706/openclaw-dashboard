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

// 获取当前 agent 对应的 memory 目录
function getAgentMemoryDir(agent) {
  if (!agent) return MEMORY_DIR;
  // 使用 workspace-{agent} 作为子 agent 的工作空间根目录
  const agentMemoryDir = path.join(process.env.HOME, '.openclaw', `workspace-${agent}`, 'memory');
  // 安全校验：确保路径在 workspace-{agent} 目录下
  const agentWorkspaceRoot = path.join(process.env.HOME, '.openclaw', `workspace-${agent}`);
  if (!path.resolve(agentMemoryDir).startsWith(path.resolve(agentWorkspaceRoot))) {
    console.warn('无效的 agent 路径:', agentMemoryDir);
    return MEMORY_DIR;
  }
  return agentMemoryDir;
}

// 延迟初始化 memory 目录
function ensureMemoryDir(agent) {
  const memoryDir = getAgentMemoryDir(agent);
  if (!fs.existsSync(memoryDir)) {
    fs.mkdirSync(memoryDir, { recursive: true });
  }
}

// 获取所有记忆文件列表
function getMemoryFiles(agent) {
  const memoryDir = getAgentMemoryDir(agent);
  ensureMemoryDir(agent);
  try {
    const files = fs.readdirSync(memoryDir)
      .filter(f => f.endsWith('.md'))
      .map(f => {
        const filePath = path.join(memoryDir, f);
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
    const { file, type, agent } = req.query;
    const memoryDir = getAgentMemoryDir(agent);
    
    // 获取长期记忆 (MEMORY.md)
    if (type === 'longterm') {
      const longTermPath = agent 
        ? path.join(process.env.HOME, '.openclaw', `workspace-${agent}`, 'MEMORY.md')
        : path.join(WORKSPACE_ROOT, 'MEMORY.md');
      if (fs.existsSync(longTermPath)) {
        const content = fs.readFileSync(longTermPath, 'utf-8');
        return res.json({ 
          success: true, 
          file: 'MEMORY.md',
          type: 'longterm',
          agent: agent || null,
          content 
        });
      } else {
        return res.json({ 
          success: true, 
          file: 'MEMORY.md',
          type: 'longterm',
          agent: agent || null,
          content: '# 长期记忆\n\n'
        });
      }
    }
    
    // 获取特定日期的记忆
    if (file) {
      const filePath = path.join(memoryDir, file);
      // 安全校验：确保路径在 memory 目录内
      const resolvedPath = path.resolve(filePath);
      if (!resolvedPath.startsWith(memoryDir)) {
        return res.status(400).json({ error: '无效的文件路径' });
      }
      
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        res.json({ 
          success: true, 
          file: path.basename(filePath),
          type: 'daily',
          agent: agent || null,
          content 
        });
      } else {
        res.json({ 
          success: true, 
          file: path.basename(filePath),
          type: 'daily',
          agent: agent || null,
          content: `# ${path.basename(filePath, '.md')}\n\n`
        });
      }
      return;
    }
    
    // 默认：获取今天的记忆
    const today = new Date().toISOString().split('T')[0];
    const todayFile = path.join(memoryDir, `${today}.md`);
    
    if (fs.existsSync(todayFile)) {
      const content = fs.readFileSync(todayFile, 'utf-8');
      res.json({ 
        success: true, 
        file: `${today}.md`,
        type: 'daily',
        agent: agent || null,
        content 
      });
    } else {
      res.json({ 
        success: true, 
        file: `${today}.md`,
        type: 'daily',
        agent: agent || null,
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
    const { agent } = req.query;
    const files = getMemoryFiles(agent);
    const longTermPath = agent 
      ? path.join(process.env.HOME, '.openclaw', `workspace-${agent}`, 'MEMORY.md')
      : path.join(WORKSPACE_ROOT, 'MEMORY.md');
    const longTermExists = fs.existsSync(longTermPath);
    
    res.json({
      success: true,
      agent: agent || null,
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
    const { file, content, type, agent } = req.body;
    const memoryDir = getAgentMemoryDir(agent);
    
    // 更新长期记忆
    if (type === 'longterm') {
      const longTermPath = agent 
        ? path.join(process.env.HOME, '.openclaw', `workspace-${agent}`, 'MEMORY.md')
        : path.join(WORKSPACE_ROOT, 'MEMORY.md');
      
      // 确保目录存在
      const dir = path.dirname(longTermPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(longTermPath, content, 'utf-8');
      return res.json({ 
        success: true, 
        file: 'MEMORY.md',
        type: 'longterm',
        agent: agent || null,
        message: '长期记忆已保存'
      });
    }
    
    // 更新日常记忆
    const filePath = file 
      ? path.join(memoryDir, file)
      : path.join(memoryDir, `${new Date().toISOString().split('T')[0]}.md`);
    
    // 安全校验
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(memoryDir)) {
      return res.status(400).json({ error: '无效的文件路径' });
    }
    
    // 确保目录存在
    const memDir = path.dirname(filePath);
    if (!fs.existsSync(memDir)) {
      fs.mkdirSync(memDir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, content, 'utf-8');
    
    res.json({ 
      success: true, 
      file: path.basename(filePath),
      type: 'daily',
      agent: agent || null,
      message: '文档已保存'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
