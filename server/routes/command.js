import express from 'express';
import { exec } from 'child_process';

const router = express.Router();

// 预定义命令
const COMMANDS = {
  'restart-gateway': {
    cmd: 'openclaw-cn gateway restart',
    description: '重启 OpenClaw 网关',
    dangerous: true
  },
  'check-status': {
    cmd: 'openclaw-cn gateway status',
    description: '查看网关状态',
    dangerous: false
  },
  'clear-cache': {
    cmd: 'openclaw-cn cache clear',
    description: '清理缓存',
    dangerous: false
  },
  'view-logs': {
    cmd: 'openclaw-cn logs --tail=50',
    description: '查看最近日志',
    dangerous: false
  },
  // 问题 11 修复：添加 doctor 诊断命令
  'doctor': {
    cmd: 'openclaw-cn doctor',
    description: '系统健康诊断',
    dangerous: false
  }
};

// 执行命令
router.post('/', (req, res) => {
  try {
    const { command, confirm } = req.body;
    
    const cmdConfig = COMMANDS[command];
    if (!cmdConfig) {
      return res.status(400).json({ error: '未知命令' });
    }

    // 危险操作需要二次确认
    if (cmdConfig.dangerous && !confirm) {
      return res.json({ 
        requiresConfirm: true, 
        message: `确认执行危险操作：${cmdConfig.description}` 
      });
    }

    // 执行命令
    exec(cmdConfig.cmd, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        res.status(500).json({ 
          error: error.message,
          stderr 
        });
        return;
      }

      res.json({
        success: true,
        command,
        output: stdout || stderr || '命令执行成功'
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取命令列表
router.get('/list', (req, res) => {
  try {
    res.json({ commands: COMMANDS });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
