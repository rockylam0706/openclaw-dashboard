import { useState, useEffect } from 'react';

function MDEditor() {
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // 加载文档
  useEffect(() => {
    loadDocument();
  }, []);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const file = `${today}.md`;
      setFileName(file);
      
      const res = await fetch(`/api/memory?file=${file}&type=daily`);
      const data = await res.json();
      
      if (data.success) {
        setContent(data.content);
        setLastSaved(Date.now());
      }
    } catch (error) {
      console.error('加载文档失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 保存文档
  const saveDocument = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/memory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: fileName,
          content,
          type: 'daily',
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        setLastSaved(Date.now());
      }
    } catch (error) {
      console.error('保存文档失败:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-dark-card rounded-xl border border-dark-border card-hover shadow-lg overflow-hidden">
      {/* 标题栏 */}
      <div className="flex items-center justify-between p-4 border-b border-dark-border bg-gradient-to-r from-dark-card to-dark-card/80">
        <h2 className="text-lg font-semibold flex items-center">
          <span className="mr-2">📝</span>
          日常记忆
        </h2>
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-xs text-gray-500">{fileName}</p>
            {lastSaved && (
              <p className="text-xs text-gray-600">
                {new Date(lastSaved).toLocaleTimeString()}
              </p>
            )}
          </div>
          <button
            onClick={loadDocument}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-brand transition-colors disabled:opacity-50"
            title="刷新"
          >
            🔄
          </button>
          <button
            onClick={saveDocument}
            disabled={saving || loading}
            className="px-4 py-2 text-sm bg-brand hover:bg-brand-light rounded-lg transition-colors disabled:opacity-50 font-medium"
          >
            {saving ? '保存中...' : '💾 保存'}
          </button>
        </div>
      </div>
      
      {/* 编辑器 */}
      <div className="p-4">
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
            placeholder={`记录今天的日常记忆、工作内容、重要事件...\n\n支持 Markdown 语法：\n- # 标题\n- **粗体** / *斜体*\n- - 列表项\n- [ ] 任务\n- \`\`\` 代码块 \`\`\``}
            className="w-full h-64 bg-dark-bg border border-dark-border rounded-lg p-4 text-sm font-mono focus:outline-none focus:border-brand transition-colors resize-none"
          />
        )}
      </div>
      
      {/* 提示 */}
      <div className="px-4 py-3 bg-dark-bg/50 border-t border-dark-border">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>💡 支持 Markdown 语法，自动保存到 memory 目录</span>
          <span>📁 {fileName}</span>
        </div>
      </div>
    </div>
  );
}

export default MDEditor;
