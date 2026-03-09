import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// 任务配置文件路径
const CRON_CONFIG_PATH = path.join(process.env.HOME || '', '.openclaw', 'workspace', 'cron-tasks.json');

// 问题 5 修复：修正预设命令，确保格式正确可执行
const TASK_TEMPLATES = [
  {
    id: 'status-check',
    name: '状态检查',
    description: '定期检查 OpenClaw 网关状态',
    schedule: '*/5 * * * *',
    command: 'openclaw-cn gateway status',
    category: '监控'
  },
  {
    id: 'memory-backup',
    name: '记忆备份',
    description: '备份每日记忆文件',
    schedule: '0 23 * * *',
    command: 'mkdir -p ~/.openclaw/workspace/backup/memory && cp ~/.openclaw/workspace/memory/*.md ~/.openclaw/workspace/backup/memory/',
    category: '备份'
  },
  {
    id: 'log-cleanup',
    name: '日志清理',
    description: '清理 7 天前的日志文件',
    schedule: '0 2 * * 0',
    command: 'find ~/.openclaw/workspace/logs -type f -mtime +7 -delete',
    category: '维护'
  },
  {
    id: 'doctor',
    name: '系统诊断',
    description: '执行系统健康检查',
    schedule: '0 9 * * 1',
    command: 'openclaw-cn doctor',
    category: '监控'
  },
  {
    id: 'custom',
    name: '自定义命令',
    description: '执行自定义 shell 命令',
    schedule: '* * * * *',
    command: '',
    category: '自定义'
  }
];

// 问题 6 修复：将"午夜"改为"0 点"
const CRON_PRESETS = [
  { label: '每分钟', value: '* * * * *', description: '每分钟执行一次' },
  { label: '每 5 分钟', value: '*/5 * * * *', description: '每 5 分钟执行一次' },
  { label: '每 15 分钟', value: '*/15 * * * *', description: '每 15 分钟执行一次' },
  { label: '每小时', value: '0 * * * *', description: '每小时整点执行' },
  { label: '每天 (0 点)', value: '0 0 * * *', description: '每天 0 点执行' },
  { label: '每天 (9 点)', value: '0 9 * * *', description: '每天早上 9 点执行' },
  { label: '每周一', value: '0 9 * * 1', description: '每周一上午 9 点执行' },
  { label: '每月 1 号', value: '0 0 1 * *', description: '每月 1 号 0 点执行' }
];

// 加载任务列表
function loadTasks() {
  try {
    if (fs.existsSync(CRON_CONFIG_PATH)) {
      const data = fs.readFileSync(CRON_CONFIG_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    // 忽略错误
  }
  // 默认任务
  return [
    {
      id: '1',
      name: '每日状态检查',
      schedule: '0 9 * * *',
      command: 'openclaw-cn status',
      enabled: true,
      lastRun: null,
      nextRun: null,
      template: 'status-check'
    }
  ];
}

// 保存任务列表
function saveTasks(tasks) {
  try {
    const dir = path.dirname(CRON_CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CRON_CONFIG_PATH, JSON.stringify(tasks, null, 2), 'utf-8');
    return true;
  } catch (error) {
    return false;
  }
}

// 获取 Cron 任务列表
router.get('/', (req, res) => {
  try {
    const tasks = loadTasks();
    res.json({ 
      tasks,
      templates: TASK_TEMPLATES,
      presets: CRON_PRESETS
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建 Cron 任务
router.post('/', (req, res) => {
  try {
    const { name, schedule, command, enabled, template, description } = req.body;
    
    const tasks = loadTasks();
    const newTask = {
      id: Date.now().toString(),
      name: name || '新任务',
      schedule: schedule || '* * * * *',
      command: command || '',
      description: description || '',
      enabled: enabled !== false,
      template: template || 'custom',
      lastRun: null,
      nextRun: null,
      createdAt: new Date().toISOString()
    };

    tasks.push(newTask);
    saveTasks(tasks);
    
    res.json({ success: true, task: newTask });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新 Cron 任务
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, schedule, command, enabled, description } = req.body;
    
    const tasks = loadTasks();
    const taskIndex = tasks.findIndex(t => t.id === id);
    
    if (taskIndex === -1) {
      return res.status(404).json({ error: '任务不存在' });
    }

    tasks[taskIndex] = {
      ...tasks[taskIndex],
      name: name ?? tasks[taskIndex].name,
      schedule: schedule ?? tasks[taskIndex].schedule,
      command: command ?? tasks[taskIndex].command,
      description: description ?? tasks[taskIndex].description,
      enabled: enabled ?? tasks[taskIndex].enabled
    };

    saveTasks(tasks);
    res.json({ success: true, task: tasks[taskIndex] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除 Cron 任务
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const tasks = loadTasks();
    const taskIndex = tasks.findIndex(t => t.id === id);
    
    if (taskIndex === -1) {
      return res.status(404).json({ error: '任务不存在' });
    }

    tasks.splice(taskIndex, 1);
    saveTasks(tasks);
    res.json({ success: true, message: '任务已删除' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取任务模板
router.get('/templates', (req, res) => {
  try {
    res.json({ success: true, templates: TASK_TEMPLATES });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取 Cron 预设
router.get('/presets', (req, res) => {
  try {
    res.json({ success: true, presets: CRON_PRESETS });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
