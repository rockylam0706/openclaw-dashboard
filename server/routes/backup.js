import express from 'express';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// 备份目录
const BACKUP_DIR = path.join(process.env.HOME || '', '.openclaw', 'backups');
// 工作空间目录
const WORKSPACE_DIR = path.join(process.env.HOME || '', '.openclaw', 'workspace');
// 配置文件目录
const CONFIG_DIR = path.join(process.env.HOME || '', '.openclaw');

// 延迟初始化备份目录
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

// 获取备份列表
router.get('/list', (req, res) => {
  try {
    ensureBackupDir();
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.tar.gz') || f.endsWith('.zip'))
      .map(f => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        const backupName = f.replace('.tar.gz', '').replace('.zip', '');
        
        // 尝试读取 manifest 文件获取说明
        let description = null;
        try {
          const manifestPath = path.join(BACKUP_DIR, `${backupName}.manifest.json`);
          if (fs.existsSync(manifestPath)) {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
            description = manifest.description || null;
          }
        } catch (e) {
          // 忽略错误，description 保持 null
        }
        
        return {
          filename: f,
          size: stat.size,
          createdAt: stat.birthtimeMs,
          modifiedAt: stat.mtimeMs,
          description
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);
    
    res.json({ 
      success: true, 
      backups: files,
      backupDir: BACKUP_DIR
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 创建备份 - 优化：只备份重要文件
router.post('/create', async (req, res) => {
  const { name, description, includeLogs } = req.body || {};
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = name || `backup-${timestamp}`;
  const backupPath = path.join(BACKUP_DIR, `${backupName}.tar.gz`);
  
  try {
    ensureBackupDir();
    
    // 创建临时清单文件，指定要备份的内容
    const manifestPath = path.join(BACKUP_DIR, `.manifest-${timestamp}.txt`);
    const manifestData = {
      files: [
        // 核心配置文件
        'openclaw.json',
        'mcp.json',
        
        // 工作空间（排除大型目录）
        'workspace/AGENTS.md',
        'workspace/SOUL.md',
        'workspace/USER.md',
        'workspace/TOOLS.md',
        'workspace/MEMORY.md',
        'workspace/IDENTITY.md',
        'workspace/HEARTBEAT.md',
        'workspace/memory/',
        'workspace/config/',
        'workspace/projects/',
        'workspace/skills/',
      ],
      description: description || '',
      createdAt: Date.now()
    };
    
    // 写入清单（JSON 格式，包含说明）
    fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2));
    
    // 构建 tar 命令，排除 node_modules、dist、.git 等大型目录
    const excludePatterns = [
      '--exclude=node_modules',
      '--exclude=dist',
      '--exclude=.git',
      '--exclude=*.log',
      '--exclude=*.zip',
      '--exclude=*.tar.gz',
      '--exclude=.DS_Store',
    ];
    
    if (!includeLogs) {
      excludePatterns.push('--exclude=logs');
    }
    
    const tarCommand = `
      cd "${CONFIG_DIR}" && \
      tar -czf "${backupPath}" \
        ${excludePatterns.join(' ')} \
        openclaw.json \
        mcp.json \
        workspace/AGENTS.md \
        workspace/SOUL.md \
        workspace/USER.md \
        workspace/TOOLS.md \
        workspace/MEMORY.md \
        workspace/IDENTITY.md \
        workspace/HEARTBEAT.md \
        workspace/memory \
        workspace/config \
        workspace/projects \
        workspace/skills \
        2>&1
    `;
    
    await new Promise((resolve, reject) => {
      exec(tarCommand, { timeout: 120000 }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`tar 命令失败：${error.message}\n${stderr}`));
        } else {
          resolve(stdout);
        }
      });
    });
    
    // 保存 manifest 文件（包含说明）到备份目录
    const manifestSavePath = path.join(BACKUP_DIR, `${backupName}.manifest.json`);
    fs.writeFileSync(manifestSavePath, JSON.stringify(manifestData, null, 2));
    
    // 获取备份文件信息
    const stat = fs.statSync(backupPath);
    
    res.json({
      success: true,
      backup: {
        filename: `${backupName}.tar.gz`,
        path: backupPath,
        size: stat.size,
        createdAt: Date.now(),
        description: description || null
      },
      message: `备份成功，包含 ${manifestData.files.length} 个核心项目`
    });
  } catch (error) {
    console.error('创建备份失败:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: '创建备份失败，请检查日志'
    });
  }
});

// 恢复备份
router.post('/restore', async (req, res) => {
  const { filename } = req.body;
  
  if (!filename) {
    res.status(400).json({ success: false, error: '请指定备份文件' });
    return;
  }
  
  const backupPath = path.join(BACKUP_DIR, filename);
  
  if (!fs.existsSync(backupPath)) {
    res.status(404).json({ success: false, error: '备份文件不存在' });
    return;
  }
  
  try {
    // 恢复前先创建当前状态备份
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const preRestoreBackup = `prerestore-${timestamp}.tar.gz`;
    const preRestorePath = path.join(BACKUP_DIR, preRestoreBackup);
    
    const preBackupCommand = `
      cd "${CONFIG_DIR}" && \
      tar -czf "${preRestorePath}" \
        --exclude=node_modules \
        --exclude=dist \
        --exclude=.git \
        --exclude=logs \
        openclaw.json mcp.json workspace/ 2>&1
    `;
    
    await new Promise((resolve, reject) => {
      exec(preBackupCommand, { timeout: 120000 }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`预备份失败：${error.message}`));
        } else {
          resolve(stdout);
        }
      });
    });
    
    // 恢复备份
    const restoreCommand = `
      cd "${CONFIG_DIR}" && \
      tar -xzf "${backupPath}" 2>&1
    `;
    
    await new Promise((resolve, reject) => {
      exec(restoreCommand, { timeout: 120000 }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`恢复失败：${error.message}`));
        } else {
          resolve(stdout);
        }
      });
    });
    
    res.json({
      success: true,
      message: '恢复成功',
      preRestoreBackup
    });
  } catch (error) {
    console.error('恢复备份失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除备份
router.delete('/:filename', (req, res) => {
  const { filename } = req.params;
  const backupPath = path.join(BACKUP_DIR, filename);
  
  if (!fs.existsSync(backupPath)) {
    res.status(404).json({ success: false, error: '备份文件不存在' });
    return;
  }
  
  try {
    fs.unlinkSync(backupPath);
    res.json({ success: true, message: '备份已删除' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 备份统计
router.get('/stats', (req, res) => {
  try {
    ensureBackupDir();
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.tar.gz') || f.endsWith('.zip'));
    
    let totalSize = 0;
    files.forEach(f => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      totalSize += stat.size;
    });
    
    res.json({
      success: true,
      stats: {
        count: files.length,
        totalSize,
        backupDir: BACKUP_DIR
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
