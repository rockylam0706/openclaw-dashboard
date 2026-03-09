import { useState, useEffect } from 'react';

function BackupManager({ showToast }) {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [stats, setStats] = useState(null);
  const [includeLogs, setIncludeLogs] = useState(true);
  const [backupName, setBackupName] = useState('');
  const [backupDescription, setBackupDescription] = useState('');
  const [showDescriptionInput, setShowDescriptionInput] = useState(false);
  const [backupDir, setBackupDir] = useState('');

  // 加载备份列表
  useEffect(() => {
    loadBackups();
    loadStats();
  }, []);

  const loadBackups = async () => {
    try {
      const res = await fetch('/api/backup/list');
      const data = await res.json();
      if (data.success) {
        setBackups(data.backups || []);
        if (data.backupDir) {
          setBackupDir(data.backupDir);
        }
      }
    } catch (error) {
      console.error('加载备份列表失败:', error);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch('/api/backup/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        if (data.stats?.backupDir && !backupDir) {
          setBackupDir(data.stats.backupDir);
        }
      }
    } catch (error) {
      console.error('加载统计失败:', error);
    }
  };

  const createBackup = async () => {
    try {
      setCreating(true);
      const res = await fetch('/api/backup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: backupName || undefined,
          description: backupDescription || undefined,
          includeLogs
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        showToast(`备份创建成功：${data.backup.filename}`, 'success');
        setBackupName('');
        setBackupDescription('');
        setShowDescriptionInput(false);
        loadBackups();
        loadStats();
      } else {
        showToast(`创建失败：${data.error}`, 'error');
      }
    } catch (error) {
      console.error('创建备份失败:', error);
      showToast('创建备份失败', 'error');
    } finally {
      setCreating(false);
    }
  };

  const restoreBackup = async (filename) => {
    if (!confirm(`确定要恢复备份 "${filename}" 吗？\n\n恢复前会自动创建当前状态的备份。`)) {
      return;
    }
    
    try {
      setRestoring(true);
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
      
      const data = await res.json();
      if (data.success) {
        showToast(`恢复成功！恢复前备份：${data.preRestoreBackup}`, 'success');
        loadBackups();
      } else {
        showToast(`恢复失败：${data.error}`, 'error');
      }
    } catch (error) {
      console.error('恢复备份失败:', error);
      showToast('恢复备份失败', 'error');
    } finally {
      setRestoring(false);
    }
  };

  const deleteBackup = async (filename) => {
    if (!confirm(`确定要删除备份 "${filename}" 吗？`)) {
      return;
    }
    
    try {
      const res = await fetch(`/api/backup/${filename}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('备份已删除', 'success');
        loadBackups();
        loadStats();
      } else {
        showToast(`删除失败：${data.error}`, 'error');
      }
    } catch (error) {
      console.error('删除备份失败:', error);
      showToast('删除备份失败', 'error');
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  return (
    <div className="bg-dark-card rounded-xl border border-dark-border card-hover shadow-lg overflow-hidden">
      {/* 标题栏 */}
      <div className="p-4 border-b border-dark-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold flex items-center">
            <span className="mr-2">💾</span>
            备份管理
          </h2>
          {stats && (
            <div className="text-xs text-gray-500">
              {stats.count} 个备份 · {formatSize(stats.totalSize)}
            </div>
          )}
        </div>
        {backupDir && (
          <div className="text-xs text-gray-500 flex items-center">
            <span className="mr-1">📁</span>
            备份目录：
            <a
              href={`file://${backupDir}`}
              onClick={(e) => {
                e.preventDefault();
                // 使用 open 命令打开 Finder
                fetch('/api/command/run', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    command: `open "${backupDir}"`
                  })
                }).catch(() => {});
              }}
              className="ml-1 text-brand hover:underline cursor-pointer"
              title="点击打开备份目录"
            >
              {backupDir}
            </a>
          </div>
        )}
      </div>
      
      {/* 创建备份区域 */}
      <div className="p-4 border-b border-dark-border bg-dark-bg/30">
        <h3 className="text-sm font-medium text-gray-400 mb-3">创建新备份</h3>
        
        <div className="space-y-3">
          <div>
            <input
              type="text"
              placeholder="备份名称（可选，留空使用当前时间）"
              value={backupName}
              onChange={(e) => setBackupName(e.target.value)}
              className="w-full bg-dark-card border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand transition-colors"
            />
          </div>
          
          {/* 备份说明输入 */}
          <div>
            {!showDescriptionInput ? (
              <button
                onClick={() => setShowDescriptionInput(true)}
                className="text-xs text-brand hover:text-brand-light transition-colors flex items-center"
              >
                📝 添加备份说明（可选）
              </button>
            ) : (
              <div className="space-y-2">
                <textarea
                  placeholder="输入备份说明（例如：版本更新前备份、功能测试前备份等）"
                  value={backupDescription}
                  onChange={(e) => setBackupDescription(e.target.value)}
                  className="w-full bg-dark-card border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand transition-colors resize-none"
                  rows="2"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setShowDescriptionInput(false);
                      setBackupDescription('');
                    }}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => setShowDescriptionInput(false)}
                    className="text-xs text-brand hover:text-brand-light transition-colors"
                  >
                    完成
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="includeLogs"
              checked={includeLogs}
              onChange={(e) => setIncludeLogs(e.target.checked)}
              className="w-4 h-4 rounded border-dark-border bg-dark-card text-brand focus:ring-brand"
            />
            <label htmlFor="includeLogs" className="text-sm text-gray-300">
              包含日志文件（会增加备份大小）
            </label>
          </div>
          
          <button
            onClick={createBackup}
            disabled={creating}
            className="w-full py-2.5 bg-brand hover:bg-brand-light rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? '创建中...' : '📦 立即备份'}
          </button>
        </div>
      </div>
      
      {/* 备份列表 */}
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-3">备份历史</h3>
        
        {backups.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">
            暂无备份，点击上方"立即备份"创建第一个备份
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            {backups.map((backup, index) => (
              <div
                key={index}
                className="p-3 bg-dark-bg/50 rounded-lg border border-dark-border hover:border-brand/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      📁 {backup.filename}
                    </p>
                    {backup.description && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2" title={backup.description}>
                        📝 {backup.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                      <span>{formatSize(backup.size)}</span>
                      <span>•</span>
                      <span>{formatDate(backup.createdAt)}</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 ml-3 flex-shrink-0">
                    <button
                      onClick={() => restoreBackup(backup.filename)}
                      disabled={restoring}
                      className="p-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors disabled:opacity-50"
                      title="恢复此备份"
                    >
                      ↩️
                    </button>
                    <button
                      onClick={() => deleteBackup(backup.filename)}
                      className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                      title="删除备份"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* 提示信息 */}
        <div className="mt-3 px-3 py-2 bg-dark-bg/50 rounded border border-dark-border text-xs text-gray-500">
          💡 建议定期备份工作空间，包含代码、配置、记忆等所有重要数据
        </div>
      </div>
    </div>
  );
}

export default BackupManager;
