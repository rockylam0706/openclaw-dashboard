import { useState, useEffect } from 'react';

function MemoryManager({ showToast, selectedAgent }) {
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' or 'longterm'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dailyFiles, setDailyFiles] = useState([]);
  const [hasLongTerm, setHasLongTerm] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // 构建带 agent 参数的 URL
  const buildApiUrl = (baseUrl, params = {}) => {
    const url = new URL(baseUrl, window.location.origin);
    if (selectedAgent) {
      url.searchParams.set('agent', selectedAgent);
    }
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    });
    return url.toString();
  };

  // 加载记忆文件列表
  useEffect(() => {
    loadFileList();
  }, [selectedAgent]);

  // 加载内容（仅手动刷新，移除自动刷新）
  useEffect(() => {
    loadContent();
  }, [activeTab, selectedDate, selectedAgent]);

  // 手动刷新功能（仅用户点击时触发）
  const refreshMemory = async () => {
    try {
      setLoading(true);
      setLastUpdate(Date.now());
      await loadFileList();
      await loadContent();
      if (showToast) {
        showToast('记忆已刷新', 'success', 2000);
      }
    } catch (error) {
      console.error('刷新记忆失败:', error);
      if (showToast) {
        showToast('刷新失败', 'error', 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadFileList = async () => {
    try {
      const url = buildApiUrl('/api/memory/list');
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setDailyFiles(data.daily || []);
        setHasLongTerm(data.longTerm || false);
      }
    } catch (error) {
      console.error('加载文件列表失败:', error);
    }
  };

  const loadContent = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        type: activeTab === 'longterm' ? 'longterm' : 'daily',
      });
      if (activeTab === 'daily' && selectedDate) {
        params.append('file', `${selectedDate}.md`);
      }
      
      const url = buildApiUrl(`/api/memory?${params}`);
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.success) {
        setContent(data.content || '');
      }
    } catch (error) {
      console.error('加载内容失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveContent = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/memory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: activeTab === 'daily' ? `${selectedDate}.md` : 'MEMORY.md',
          content,
          type: activeTab,
          agent: selectedAgent || undefined
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        // 刷新文件列表
        loadFileList();
        if (showToast) {
          showToast('保存成功', 'success', 2000);
        }
      }
    } catch (error) {
      console.error('保存失败:', error);
      if (showToast) {
        showToast('保存失败', 'error', 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  // 生成最近 30 天的日期列表
  const generateDateOptions = () => {
    const dates = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dates.push(dateStr);
    }
    return dates;
  };

  return (
    <div className="bg-dark-card rounded-xl border border-dark-border card-hover shadow-lg overflow-hidden">
      {/* 标题栏 */}
      <div className="p-4 border-b border-dark-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold flex items-center">
              <span className="mr-2">🧠</span>
              记忆管理
            </h2>
            {selectedAgent && (
              <span className="px-2 py-0.5 text-xs bg-brand/20 text-brand rounded-full">
                🐝 {selectedAgent}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500 hidden sm:inline">
              {new Date(lastUpdate).toLocaleTimeString()}
            </span>
            {/* 问题 9 修复：添加刷新按钮 */}
            <button
              onClick={refreshMemory}
              disabled={loading}
              className={`p-2 text-gray-400 hover:text-brand transition-all transform ${
                loading ? 'animate-spin' : 'active:scale-90'
              }`}
              title="刷新记忆"
              aria-label="刷新记忆"
            >
              🔄
            </button>
            <span className="text-xs text-gray-500">
              {saving ? '保存中...' : '已保存'}
            </span>
            <button
              onClick={saveContent}
              disabled={saving || loading}
              className="px-3 py-1.5 text-sm bg-brand hover:bg-brand-light rounded-lg transition-colors disabled:opacity-50 font-medium"
            >
              💾 保存
            </button>
          </div>
        </div>
      </div>
      
      {/* 标签页 */}
      <div className="flex border-b border-dark-border">
        <button
          onClick={() => setActiveTab('daily')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'daily'
              ? 'bg-brand/10 text-brand border-b-2 border-brand'
              : 'text-gray-400 hover:text-white hover:bg-dark-bg/50'
          }`}
        >
          📅 短期记忆
        </button>
        <button
          onClick={() => setActiveTab('longterm')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'longterm'
              ? 'bg-brand/10 text-brand border-b-2 border-brand'
              : 'text-gray-400 hover:text-white hover:bg-dark-bg/50'
          }`}
        >
          📚 长期记忆
        </button>
      </div>
      
      {/* 内容区 */}
      <div className="p-4">
        {/* 日期选择器（仅短期记忆显示） */}
        {activeTab === 'daily' && (
          <div className="mb-4 flex items-center space-x-3">
            <label className="text-sm text-gray-400">选择日期:</label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand transition-colors"
            >
              {generateDateOptions().map(date => {
                const fileInfo = dailyFiles.find(f => f.date === date);
                return (
                  <option key={date} value={date}>
                    {date} {fileInfo ? '📄' : ''}
                  </option>
                );
              })}
            </select>
            {dailyFiles.find(f => f.date === selectedDate) && (
              <span className="text-xs text-green-500">✓ 已存在</span>
            )}
          </div>
        )}
        
        {/* 编辑器 */}
        {loading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-700 rounded w-2/3"></div>
            <div className="h-4 bg-gray-700 rounded w-full"></div>
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              activeTab === 'longterm'
                ? "记录重要的长期记忆、经验教训、关键决策..."
                : `记录 ${selectedDate} 的日常记忆、工作内容、重要事件...`
            }
            className="w-full h-64 bg-dark-bg border border-dark-border rounded-lg p-4 text-sm font-mono focus:outline-none focus:border-brand transition-colors resize-none"
          />
        )}
        
        {/* 提示信息 */}
        <div className="mt-3 px-3 py-2 bg-dark-bg/50 rounded border border-dark-border text-xs text-gray-500">
          {activeTab === 'longterm' ? (
            <span>💡 长期记忆用于记录重要的经验、决策和上下文，定期从日常记忆中提炼</span>
          ) : (
            <span>💡 短期记忆按日期记录，每天一个文件，支持 Markdown 语法</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default MemoryManager;
