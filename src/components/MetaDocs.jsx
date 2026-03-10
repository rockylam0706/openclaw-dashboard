import { useState, useEffect } from 'react';

const DOC_ICONS = {
  user: '👤',
  soul: '💫',
  identity: '🆔',
  tools: '🛠️',
  agents: '🤖',
  heartbeat: '💓'
};

function MetaDocs({ showToast, selectedAgent }) {
  const [docs, setDocs] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
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

  // 加载文档列表
  useEffect(() => {
    loadDocs();
  }, [selectedAgent]);

  // 问题 9 修复：添加刷新功能
  const refreshDocs = async () => {
    try {
      setLoading(true);
      setLastUpdate(Date.now());
      await loadDocs();
      if (showToast) {
        showToast('文档列表已刷新', 'success', 2000);
      }
    } catch (error) {
      console.error('刷新文档失败:', error);
      if (showToast) {
        showToast('刷新失败', 'error', 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadDocs = async () => {
    try {
      const url = buildApiUrl('/api/docs/list');
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setDocs(data.docs || []);
      }
    } catch (error) {
      console.error('加载文档列表失败:', error);
    }
  };

  const loadDocContent = async (docId) => {
    try {
      setLoading(true);
      const url = buildApiUrl(`/api/docs/${docId}`);
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.success) {
        setContent(data.content || '');
        setSelectedDoc(data);
        setShowEditor(true);
      }
    } catch (error) {
      console.error('加载文档失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveDocContent = async () => {
    if (!selectedDoc) return;
    
    try {
      setSaving(true);
      const res = await fetch(`/api/docs/${selectedDoc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, agent: selectedAgent || undefined }),
      });
      
      const data = await res.json();
      if (data.success) {
        // 刷新列表
        loadDocs();
        setShowEditor(false);
      }
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-dark-card rounded-xl border border-dark-border card-hover shadow-lg overflow-hidden h-full">
      {/* 标题栏 */}
      <div className="p-4 border-b border-dark-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold flex items-center">
              <span className="mr-2">📄</span>
              元文档
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
              onClick={refreshDocs}
              disabled={loading}
              className={`p-2 text-gray-400 hover:text-brand transition-all transform ${
                loading ? 'animate-spin' : 'active:scale-90'
              }`}
              title="刷新文档列表"
              aria-label="刷新文档列表"
            >
              🔄
            </button>
          </div>
        </div>
      </div>
      
      {/* 文档列表 */}
      <div className="p-4">
        <div className="space-y-2">
          {docs.map(doc => (
            <button
              key={doc.id}
              onClick={() => loadDocContent(doc.id)}
              className={`w-full p-3 rounded-lg border text-left transition-all group ${
                selectedDoc?.id === doc.id
                  ? 'bg-brand/10 border-brand'
                  : 'bg-dark-bg border-dark-border hover:border-brand/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{DOC_ICONS[doc.id] || '📄'}</span>
                  <div>
                    <p className="font-medium text-sm text-white">{doc.name}</p>
                    <p className="text-xs text-gray-500">{doc.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {doc.exists ? (
                    <span className="text-xs text-green-500">✓</span>
                  ) : (
                    <span className="text-xs text-gray-600">未创建</span>
                  )}
                  <span className="text-gray-600 group-hover:text-brand transition-colors">
                    →
                  </span>
                </div>
              </div>
              {doc.modified && (
                <p className="text-xs text-gray-600 mt-2 pl-10">
                  最后修改：{new Date(doc.modified).toLocaleString('zh-CN')}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* 编辑器弹窗 - 问题 7 修复：移动端全屏编辑 */}
      {showEditor && selectedDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4">
          {/* 移动端全屏，桌面端固定宽度 */}
          <div className="bg-dark-card w-full h-full sm:rounded-xl sm:border sm:border-dark-border sm:w-full sm:max-w-4xl sm:max-h-[90vh] sm:flex sm:flex-col shadow-2xl flex flex-col">
            {/* 弹窗标题栏 */}
            <div className="p-4 border-b border-dark-border flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <span className="text-2xl flex-shrink-0">{DOC_ICONS[selectedDoc.id] || '📄'}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold truncate">{selectedDoc.name}</h3>
                  <p className="text-xs text-gray-500 truncate">{selectedDoc.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <span className="text-xs text-gray-500 hidden sm:inline">
                  {saving ? '保存中...' : ''}
                </span>
                {/* 关闭按钮 - 移动端更大 */}
                <button
                  onClick={() => setShowEditor(false)}
                  className="p-2 sm:p-1 text-gray-400 hover:text-white transition-colors text-xl sm:text-base"
                  aria-label="关闭编辑器"
                >
                  ×
                </button>
              </div>
            </div>
            
            {/* 编辑器内容 - 移动端全屏 */}
            <div className="flex-1 p-3 sm:p-4 overflow-hidden flex flex-col min-h-0">
              {loading ? (
                <div className="animate-pulse space-y-2 flex-1">
                  <div className="h-4 bg-gray-700 rounded w-full"></div>
                  <div className="h-4 bg-gray-700 rounded w-full"></div>
                  <div className="h-4 bg-gray-700 rounded w-2/3"></div>
                </div>
              ) : (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`编辑 ${selectedDoc.name}...`}
                  className="flex-1 w-full bg-dark-bg border border-dark-border rounded-lg p-3 sm:p-4 text-sm font-mono focus:outline-none focus:border-brand transition-colors resize-none"
                />
              )}
            </div>
            
            {/* 弹窗底部操作栏 - 移动端固定在底部 */}
            <div className="p-3 sm:p-4 border-t border-dark-border flex justify-end space-x-3 flex-shrink-0">
              <button
                onClick={() => setShowEditor(false)}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={saveDocContent}
                disabled={saving || loading}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-brand hover:bg-brand-light rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? '保存中...' : '💾 保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MetaDocs;
