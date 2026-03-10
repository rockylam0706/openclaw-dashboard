import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// 工作空间根目录
const WORKSPACE_ROOT = path.join(process.env.HOME || '', '.openclaw', 'workspace');

// 获取当前 agent 对应的 workspace
function getAgentWorkspace(agent) {
  if (!agent) return WORKSPACE_ROOT;
  // 使用 workspace-{agent} 作为子 agent 的工作空间根目录
  const agentWorkspace = path.join(process.env.HOME, '.openclaw', `workspace-${agent}`);
  // 安全校验
  const agentWorkspaceRoot = path.join(process.env.HOME, '.openclaw', `workspace-${agent}`);
  if (!path.resolve(agentWorkspace).startsWith(path.resolve(agentWorkspaceRoot))) {
    console.warn('无效的 agent 路径:', agentWorkspace);
    return WORKSPACE_ROOT;
  }
  return agentWorkspace;
}

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
    const { agent } = req.query;
    const workspace = getAgentWorkspace(agent);
    
    const docs = META_DOCS.map(doc => {
      const filePath = path.join(workspace, doc.name);
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
        modified,
        agent: agent || null
      };
    });
    
    res.json({ success: true, agent: agent || null, docs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取元文档内容
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { agent } = req.query;
    const workspace = getAgentWorkspace(agent);
    const doc = META_DOCS.find(d => d.id === id);
    
    if (!doc) {
      return res.status(404).json({ error: '文档不存在' });
    }
    
    const filePath = path.join(workspace, doc.name);
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      res.json({ 
        success: true, 
        file: doc.name,
        id: doc.id,
        description: doc.description,
        agent: agent || null,
        content 
      });
    } else {
      res.json({ 
        success: true, 
        file: doc.name,
        id: doc.id,
        description: doc.description,
        agent: agent || null,
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
    const { content, agent } = req.body;
    const workspace = getAgentWorkspace(agent);
    const doc = META_DOCS.find(d => d.id === id);
    
    if (!doc) {
      return res.status(404).json({ error: '文档不存在' });
    }
    
    const filePath = path.join(workspace, doc.name);
    
    // 确保目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, content, 'utf-8');
    
    res.json({ 
      success: true, 
      file: doc.name,
      id: doc.id,
      agent: agent || null,
      message: '文档已保存'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
