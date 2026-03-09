import express from 'express';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// 优化 2：网关状态缓存（10 秒）
let cachedStatus = null;
let cacheTime = 0;
const CACHE_TTL = 10000; // 10 秒

// 获取网关状态的辅助函数
// 优化 3：异步执行，不阻塞事件循环
function getGatewayStatus() {
  return new Promise((resolve) => {
    exec('openclaw-cn gateway status', { 
      encoding: 'utf8', 
      timeout: 15000,
      maxBuffer: 10 * 1024 * 1024
    }, (error, stdout, stderr) => {
      if (error) {
        console.error('获取网关状态失败:', error.message);
        checkPort(18789).then(resolve);
        return;
      }
      
      const output = stdout;
      
      // 检查是否包含 "Runtime: running (pid XXX)" 或类似内容
      const isRunning = output.includes('Runtime: running') ||
                       output.toLowerCase().includes('running') || 
                       output.toLowerCase().includes('运行') ||
                       output.toLowerCase().includes('active');
      
      // 提取网关真实运行时长
      const uptimeSeconds = extractGatewayUptime(output);
      
      resolve({
        running: isRunning,
        pid: extractPid(output),
        uptime: uptimeSeconds,
        output: output.trim()
      });
    });
  });
}

// 从网关输出中提取真实运行时长
function extractGatewayUptime(output) {
  // 尝试从 "Runtime: running (pid 14818)" 和后续行提取运行时间
  // 如果没有明确的时间，尝试从进程启动时间计算
  const pidMatch = output.match(/PID[:\s]+(\d+)/i);
  if (pidMatch && pidMatch[1]) {
    const pid = pidMatch[1];
    try {
      // 使用 ps 命令获取进程启动时间（同步，但耗时很短 <10ms）
      const { execSync } = require('child_process');
      const psOutput = execSync(`ps -o etime= -p ${pid}`, { encoding: 'utf8', timeout: 2000 }).trim();
      if (psOutput) {
        return parseEtime(psOutput);
      }
    } catch (e) {
      // 忽略错误
    }
  }
  return 0;
}

// 解析 ps etime 输出 (格式：[[DD-]hh:]mm:ss)
function parseEtime(etime) {
  const parts = etime.split(':').map(Number);
  if (parts.length === 2) {
    // mm:ss
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    // hh:mm:ss 或 DD-hh:mm:ss
    if (etime.includes('-')) {
      const [days, hours, mins, secs] = etime.split(/[-:]/).map(Number);
      return days * 86400 + hours * 3600 + mins * 60 + secs;
    }
    // hh:mm:ss
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

// 检查端口是否被占用
function checkPort(port) {
  return new Promise((resolve) => {
    exec(`lsof -i :${port}`, { timeout: 3000 }, (error, stdout) => {
      if (error || !stdout) {
        resolve({ running: false, pid: null });
      } else {
        const pid = stdout.split('\n')[1]?.split(/\s+/)[1];
        resolve({ running: true, pid: pid || null });
      }
    });
  });
}

// 从输出中提取 PID
function extractPid(output) {
  // 尝试匹配 "Runtime: running (pid 14818)" 格式
  const runtimePidMatch = output.match(/Runtime:\s*running\s*\(pid\s+(\d+)\)/i);
  if (runtimePidMatch) return runtimePidMatch[1];
  
  // 尝试匹配 "PID: 14818" 或 "PID 14818" 格式
  const pidMatch = output.match(/PID[:\s]+(\d+)/i);
  if (pidMatch) return pidMatch[1];
  
  // 尝试匹配 "pid 14818" 格式
  const lowerPidMatch = output.match(/pid\s+(\d+)/i);
  if (lowerPidMatch) return lowerPidMatch[1];
  
  const lines = output.split('\n');
  for (const line of lines) {
    const parts = line.split(/\s+/);
    if (parts.length > 1 && /^\d+$/.test(parts[1])) {
      return parts[1];
    }
  }
  return null;
}

// 读取 openclaw.json 配置
function readOpenClawConfig() {
  try {
    const configPath = path.join(process.env.HOME || '', '.openclaw', 'openclaw.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      // 提取常用配置项
      return {
        workspace: config.workspace || '~/.openclaw/workspace',
        model: config.default_model || config.model || 'lite/qwen3.5-plus',
        gateway: {
          port: config.gateway?.port || 18789
        }
      };
    }
  } catch (error) {
    console.error('读取配置失败:', error.message);
  }
  // 返回默认配置
  return {
    workspace: '~/.openclaw/workspace',
    model: 'lite/qwen3.5-plus',
    gateway: { port: 18789 }
  };
}

// 获取网关状态
router.get('/', async (req, res) => {
  try {
    // 优化 2：检查缓存（10 秒内复用）
    const now = Date.now();
    if (cachedStatus && (now - cacheTime) < CACHE_TTL) {
      return res.json(cachedStatus);
    }
    
    const gatewayStatus = await getGatewayStatus();
    const config = readOpenClawConfig();
    
    const status = {
      gateway: {
        running: gatewayStatus.running,
        port: config?.gateway?.port || 18789,
        pid: gatewayStatus.pid,
        uptime: gatewayStatus.uptime || 0, // 使用网关真实运行时长
        status: gatewayStatus.running ? 'running' : 'stopped',
        rawOutput: gatewayStatus.output
      },
      dashboard: {
        running: true,
        port: process.env.DASHBOARD_PORT || 18790,
        pid: process.pid,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      },
      config: config ? {
        workspace: config.workspace,
        model: config.model
      } : null,
      timestamp: Date.now()
    };

    // 优化 2：缓存结果
    cachedStatus = status;
    cacheTime = now;

    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
