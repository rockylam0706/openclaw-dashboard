import express from 'express';
import { exec } from 'child_process';

const router = express.Router();

// 问题 1 修复：从 subagents list 获取真实任务，而不是 task current
router.get('/', (req, res) => {
  try {
    // 尝试从 openclaw-cn subagents list 获取真实任务
    exec('openclaw-cn subagents list --json', { timeout: 5000 }, (error, stdout, stderr) => {
      if (error) {
        // 如果命令失败，返回空闲状态
        const mockTask = {
          id: null,
          description: '系统空闲，等待指令',
          status: 'idle',
          startTime: null,
          duration: 0,
          progress: 0
        };
        return res.json({
          current: mockTask,
          history: [],
          source: 'mock'
        });
      }
      
      try {
        const subagents = JSON.parse(stdout);
        // 如果有正在运行的 subagent，返回第一个作为当前任务
        if (subagents && subagents.agents && subagents.agents.length > 0) {
          const activeAgent = subagents.agents.find(a => a.status === 'running' || a.status === 'active') || subagents.agents[0];
          const task = {
            id: activeAgent.id || activeAgent.sessionId || 'subagent-' + Date.now(),
            description: activeAgent.task || activeAgent.label || '执行任务中...',
            status: activeAgent.status || 'running',
            startTime: activeAgent.createdAt || activeAgent.startTime || Date.now(),
            duration: 0,
            progress: activeAgent.progress || 0
          };
          return res.json({
            current: task,
            history: [],
            source: 'openclaw-cn-subagents'
          });
        }
        
        // 没有运行中的 subagent，返回空闲状态
        res.json({
          current: {
            id: null,
            description: '系统空闲，等待指令',
            status: 'idle',
            startTime: null,
            duration: 0,
            progress: 0
          },
          history: [],
          source: 'openclaw-cn-subagents'
        });
      } catch (parseError) {
        // JSON 解析失败，返回空闲状态
        res.json({
          current: {
            id: null,
            description: '系统空闲，等待指令',
            status: 'idle',
            startTime: null,
            duration: 0,
            progress: 0
          },
          history: [],
          source: 'mock'
        });
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      current: {
        id: null,
        description: '系统空闲，等待指令',
        status: 'idle',
        startTime: null,
        duration: 0,
        progress: 0
      }
    });
  }
});

// 获取任务历史
router.get('/history', (req, res) => {
  try {
    exec('openclaw-cn task history --json --limit=20', { timeout: 5000 }, (error, stdout) => {
      if (error) {
        return res.json({ history: [], source: 'mock' });
      }
      
      try {
        const history = JSON.parse(stdout);
        res.json({ history, source: 'openclaw-cn' });
      } catch {
        res.json({ history: [], source: 'mock' });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
