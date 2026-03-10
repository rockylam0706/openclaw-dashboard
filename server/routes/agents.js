import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Agent 列表缓存（TTL=60s）
let agentsCache = {
  data: null,
  timestamp: 0
};
const CACHE_TTL = 60000;

// 获取 Agent 列表
router.get('/list', (req, res) => {
  try {
    const now = Date.now();
    
    // 检查缓存
    if (agentsCache.data && (now - agentsCache.timestamp) < CACHE_TTL) {
      return res.json(agentsCache.data);
    }
    
    const agentsDir = path.join(process.env.HOME || '', '.openclaw', 'agents');
    
    // 如果 agents 目录不存在，返回空列表
    if (!fs.existsSync(agentsDir)) {
      const result = { success: true, agents: [] };
      agentsCache = { data: result, timestamp: now };
      return res.json(result);
    }
    
    const agents = fs.readdirSync(agentsDir)
      .filter(f => {
        try {
          return fs.statSync(path.join(agentsDir, f)).isDirectory();
        } catch {
          return false;
        }
      })
      .map(name => {
        const agentPath = path.join(agentsDir, name);
        let sessions = 0;
        
        // 尝试读取会话数量
        try {
          const sessionsPath = path.join(agentPath, 'sessions');
          if (fs.existsSync(sessionsPath)) {
            const files = fs.readdirSync(sessionsPath);
            sessions = files.filter(f => f.endsWith('.jsonl')).length;
          }
        } catch (e) {
          // 忽略权限错误
        }
        
        // 检查最后活跃时间
        let lastActive = null;
        try {
          const memoryDir = path.join(agentPath, 'memory');
          if (fs.existsSync(memoryDir)) {
            const files = fs.readdirSync(memoryDir).filter(f => f.endsWith('.md'));
            if (files.length > 0) {
              const latestFile = files.sort().pop();
              const stats = fs.statSync(path.join(memoryDir, latestFile));
              lastActive = stats.mtime.toISOString();
            }
          }
        } catch (e) {
          // 忽略
        }
        
        return {
          name,
          path: agentPath,
          sessions,
          lastActive
        };
      });
    
    const result = { success: true, agents };
    agentsCache = { data: result, timestamp: now };
    res.json(result);
  } catch (error) {
    console.error('获取 Agent 列表失败:', error);
    // 返回空数据而非 500 错误
    res.json({ success: true, agents: [], error: error.message });
  }
});

export default router;
