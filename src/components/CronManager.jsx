import { useState, useEffect, memo } from 'react';

/**
 * CronManager - Cron 任务管理组件
 * 
 * 2026-03-07 修复：移除所有 useCallback，避免函数初始化顺序问题
 * 根本原因：useCallback 在 Vite 生产构建时会导致模块初始化顺序错误
 * 解决方案：使用普通函数，React 18+ 性能足够，不需要过度优化
 */

function CronManager({ showToast, refreshTrigger }) {
  const [tasks, setTasks] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [showCronHelp, setShowCronHelp] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [newTask, setNewTask] = useState({
    name: '',
    schedule: '* * * * *',
    command: '',
    description: '',
    enabled: true,
  });

  // ✅ 修复：使用普通函数，不使用 useCallback
  const loadTasks = async () => {
    try {
      const res = await fetch('/api/cron');
      const data = await res.json();
      setTasks(data.tasks || []);
      setTemplates(data.templates || []);
      setPresets(data.presets || []);
    } catch (error) {
      console.error('加载任务失败:', error);
      showToast('加载 Cron 任务失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 加载任务列表和模板
  useEffect(() => {
    loadTasks();
  }, []);

  // 监听刷新触发器
  useEffect(() => {
    if (refreshTrigger) {
      loadTasks();
    }
  }, [refreshTrigger]);

  // 选择模板时自动填充
  useEffect(() => {
    if (selectedTemplate && templates.length > 0) {
      const template = templates.find(t => t.id === selectedTemplate);
      if (template) {
        setNewTask({
          name: template.name,
          schedule: template.schedule,
          command: template.command,
          description: template.description,
          enabled: true,
        });
        setFormErrors({});
      }
    }
  }, [selectedTemplate, templates]);

  // ✅ 表单验证 - 普通函数
  const validateForm = () => {
    const errors = {};
    
    if (!newTask.name || newTask.name.trim().length === 0) {
      errors.name = '请输入任务名称';
    } else if (newTask.name.length > 50) {
      errors.name = '任务名称不能超过 50 个字符';
    }
    
    if (!newTask.command || newTask.command.trim().length === 0) {
      errors.command = '请输入执行命令';
    }
    
    if (!newTask.schedule || newTask.schedule.trim().length === 0) {
      errors.schedule = '请选择或输入执行时间';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ✅ 重置表单 - 普通函数
  const resetForm = () => {
    setNewTask({
      name: '',
      schedule: '* * * * *',
      command: '',
      description: '',
      enabled: true,
    });
    setSelectedTemplate('');
    setFormErrors({});
    setShowForm(false);
    setEditingTask(null);
  };

  // ✅ 打开编辑表单 - 普通函数
  const openEditForm = (task) => {
    setEditingTask(task);
    setNewTask({
      name: task.name,
      schedule: task.schedule,
      command: task.command,
      description: task.description || '',
      enabled: task.enabled,
    });
    setFormErrors({});
    setShowForm(true);
  };

  // ✅ 创建或更新任务 - 普通函数
  const createOrUpdateTask = async () => {
    if (!validateForm()) {
      showToast('请修正表单错误', 'warning');
      return;
    }
    
    if (editingTask) {
      await updateTask();
      return;
    }
    
    try {
      const res = await fetch('/api/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTask,
          template: selectedTemplate || 'custom'
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        setTasks([...tasks, data.task]);
        resetForm();
        showToast('Cron 任务创建成功', 'success');
      } else {
        showToast(`创建失败：${data.error || data.message}`, 'error');
      }
    } catch (error) {
      console.error('创建任务失败:', error);
      showToast('创建任务失败：' + error.message, 'error');
    }
  };

  // ✅ 更新任务 - 普通函数
  const updateTask = async () => {
    if (!validateForm()) {
      showToast('请修正表单错误', 'warning');
      return;
    }
    
    if (!editingTask) return;
    
    try {
      const res = await fetch(`/api/cron/${editingTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      });
      
      const data = await res.json();
      if (data.success) {
        setTasks(tasks.map(t => 
          t.id === editingTask.id ? data.task : t
        ));
        resetForm();
        showToast('Cron 任务更新成功', 'success');
      } else {
        showToast(`更新失败：${data.error || data.message}`, 'error');
      }
    } catch (error) {
      console.error('更新任务失败:', error);
      showToast('更新任务失败：' + error.message, 'error');
    }
  };

  // ✅ 删除任务 - 普通函数
  const deleteTask = async (id) => {
    if (!confirm('确定要删除这个任务吗？')) return;
    
    try {
      const res = await fetch(`/api/cron/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setTasks(tasks.filter(t => t.id !== id));
        showToast('任务已删除', 'success');
      } else {
        showToast(`删除失败：${data.error}`, 'error');
      }
    } catch (error) {
      console.error('删除任务失败:', error);
      showToast('删除任务失败', 'error');
    }
  };

  // ✅ 切换任务状态 - 普通函数
  const toggleTask = async (task) => {
    try {
      const res = await fetch(`/api/cron/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !task.enabled }),
      });
      
      const data = await res.json();
      if (data.success) {
        setTasks(tasks.map(t => 
          t.id === task.id ? { ...t, enabled: !t.enabled } : t
        ));
        showToast(`任务已${!task.enabled ? '启用' : '禁用'}`, 'success');
      } else {
        showToast(`更新失败：${data.error}`, 'error');
      }
    } catch (error) {
      console.error('更新任务失败:', error);
      showToast('更新任务失败', 'error');
    }
  };

  // ✅ 刷新任务 - 普通函数
  const refreshTasks = async () => {
    try {
      setLoading(true);
      await loadTasks();
      showToast('任务列表已刷新', 'success', 2000);
    } catch (error) {
      console.error('刷新任务失败:', error);
      showToast('刷新失败', 'error', 3000);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-dark-card rounded-xl p-6 border border-dark-border">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-gray-700 rounded w-32"></div>
          <div className="h-4 bg-gray-700 rounded w-full"></div>
          <div className="h-4 bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-card rounded-xl p-6 border border-dark-border card-hover shadow-lg">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center">
          <span className="mr-2">⏰</span>
          Cron 任务
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={refreshTasks}
            disabled={loading}
            className={`p-2 text-gray-400 hover:text-brand transition-all transform ${
              loading ? 'animate-spin' : 'active:scale-90'
            }`}
            title="刷新任务列表"
            aria-label="刷新任务列表"
          >
            🔄
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-3 py-1.5 text-sm bg-brand hover:bg-brand-light rounded-lg transition-colors font-medium"
          >
            {showForm ? '取消' : '+ 新建'}
          </button>
        </div>
      </div>
      
      {/* 新建表单 */}
      {showForm && (
        <div className="mb-6 p-5 bg-dark-bg rounded-lg border border-dark-border space-y-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            {editingTask ? '✏️ 编辑任务' : '➕ 创建新任务'}
          </h3>
          
          {/* 任务类型选择 */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">任务类型</label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full bg-dark-card border border-dark-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand transition-colors"
            >
              <option value="">自定义任务</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} - {t.description}
                </option>
              ))}
            </select>
          </div>
          
          {/* 任务名称 */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">任务名称</label>
            <input
              type="text"
              placeholder="例如：每日状态检查"
              value={newTask.name}
              onChange={(e) => {
                setNewTask({ ...newTask, name: e.target.value });
                if (formErrors.name) setFormErrors({ ...formErrors, name: null });
              }}
              className={`w-full bg-dark-card border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand transition-colors ${
                formErrors.name ? 'border-red-500' : 'border-dark-border'
              }`}
            />
            {formErrors.name && (
              <p className="mt-1 text-xs text-red-500">{formErrors.name}</p>
            )}
          </div>
          
          {/* 执行时间 */}
          <div>
            <label className="block text-sm text-gray-400 mb-2 flex items-center justify-between">
              <span>执行时间</span>
              <button
                type="button"
                onClick={() => setShowCronHelp(true)}
                className="text-xs text-brand hover:text-brand-light transition-colors flex items-center"
                title="查看 Cron 表达式说明"
              >
                ❓ Cron 说明
              </button>
            </label>
            <select
              value={newTask.schedule}
              onChange={(e) => {
                setNewTask({ ...newTask, schedule: e.target.value });
                if (formErrors.schedule) setFormErrors({ ...formErrors, schedule: null });
              }}
              className="w-full bg-dark-card border border-dark-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-brand transition-colors mb-2"
            >
              {presets.map(p => (
                <option key={p.value} value={p.value}>
                  {p.label} - {p.description}
                </option>
              ))}
              <option value="custom">自定义 Cron 表达式</option>
            </select>
            {newTask.schedule !== presets.find(p => p.value === newTask.schedule)?.value && (
              <input
                type="text"
                placeholder="Cron 表达式：分 时 日 月 周 (如：0 9 * * *)"
                value={newTask.schedule}
                onChange={(e) => {
                  setNewTask({ ...newTask, schedule: e.target.value });
                  if (formErrors.schedule) setFormErrors({ ...formErrors, schedule: null });
                }}
                className={`w-full bg-dark-card border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-brand transition-colors ${
                  formErrors.schedule ? 'border-red-500' : 'border-dark-border'
                }`}
              />
            )}
            {formErrors.schedule && (
              <p className="mt-1 text-xs text-red-500">{formErrors.schedule}</p>
            )}
          </div>
          
          {/* 执行命令 */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              执行命令
              <span className="text-gray-500 ml-2 text-xs">(支持多行，可写日报格式等详细说明)</span>
            </label>
            <textarea
              placeholder={`例如：
--event "请生成 Rocky 的今日日报"

日报格式建议：
1. 今日完成的任务
2. 遇到的问题
3. 明日计划
4. 需要协助的事项`}
              value={newTask.command}
              onChange={(e) => {
                setNewTask({ ...newTask, command: e.target.value });
                if (formErrors.command) setFormErrors({ ...formErrors, command: null });
              }}
              rows={6}
              className={`w-full bg-dark-card border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-brand transition-colors resize-y ${
                formErrors.command ? 'border-red-500' : 'border-dark-border'
              }`}
            />
            {formErrors.command && (
              <p className="mt-1 text-xs text-red-500">{formErrors.command}</p>
            )}
          </div>
          
          {/* 任务说明 */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">任务说明</label>
            <textarea
              placeholder="每行一条说明，帮助理解任务用途..."
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              rows={2}
              className="w-full bg-dark-card border border-dark-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand transition-colors resize-none"
            />
          </div>
          
          {/* 启用开关 */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="enabled"
              checked={newTask.enabled}
              onChange={(e) => setNewTask({ ...newTask, enabled: e.target.checked })}
              className="w-4 h-4 rounded border-dark-border bg-dark-card text-brand focus:ring-brand"
            />
            <label htmlFor="enabled" className="text-sm text-gray-300">
              创建后立即启用
            </label>
          </div>
          
          {/* 操作按钮 */}
          <div className="flex space-x-3 pt-2">
            <button
              onClick={createOrUpdateTask}
              className="flex-1 py-2.5 bg-brand hover:bg-brand-light rounded-lg text-sm font-medium transition-colors"
            >
              {editingTask ? '保存修改' : '创建任务'}
            </button>
            <button
              onClick={resetForm}
              className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}
      
      {/* 任务列表 */}
      {tasks.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">
          暂无 Cron 任务，点击"+ 新建"创建第一个任务
        </p>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <div
              key={task.id}
              className={`p-4 rounded-lg border transition-all ${
                task.enabled
                  ? 'bg-dark-bg/50 border-dark-border'
                  : 'bg-dark-bg/30 border-gray-700 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-lg font-semibold">{task.name}</span>
                    {task.template && task.template !== 'custom' && (
                      <span className="px-2 py-0.5 text-xs bg-brand/20 text-brand rounded-full">
                        {task.template}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      task.enabled
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {task.enabled ? '启用' : '禁用'}
                    </span>
                  </div>
                  
                  <p className="text-xs text-gray-400 font-mono mb-1">
                    ⏰ {task.schedule}
                  </p>
                  <p className="text-xs text-gray-400 font-mono mb-1">
                    💻 {task.command}
                  </p>
                  {task.description && (
                    <p className="text-xs text-gray-500 mt-2 whitespace-pre-line">
                      {task.description}
                    </p>
                  )}
                </div>
                
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => openEditForm(task)}
                    className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
                    title="编辑"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => toggleTask(task)}
                    className={`p-2 rounded-lg transition-colors ${
                      task.enabled
                        ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400'
                        : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                    }`}
                    title={task.enabled ? '禁用' : '启用'}
                  >
                    {task.enabled ? '⏸️' : '▶️'}
                  </button>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                    title="删除"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Cron 表达式帮助面板 */}
      {showCronHelp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card rounded-xl border border-dark-border w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-dark-border flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center">
                <span className="mr-2">❓</span>
                Cron 表达式说明
              </h3>
              <button
                onClick={() => setShowCronHelp(false)}
                className="p-2 text-gray-400 hover:text-white transition-colors text-xl"
                aria-label="关闭"
              >
                ×
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              <div className="space-y-4">
                <div className="p-4 bg-dark-bg/50 rounded-lg border border-dark-border">
                  <h4 className="font-semibold text-brand mb-2">📋 Cron 表达式格式</h4>
                  <p className="text-sm text-gray-300 font-mono bg-dark-card p-2 rounded mb-3">
                    分 时 日 月 星期
                  </p>
                  <div className="grid grid-cols-5 gap-2 text-xs text-gray-400 text-center">
                    <div>
                      <div className="font-medium text-white">分</div>
                      <div>0-59</div>
                    </div>
                    <div>
                      <div className="font-medium text-white">时</div>
                      <div>0-23</div>
                    </div>
                    <div>
                      <div className="font-medium text-white">日</div>
                      <div>1-31</div>
                    </div>
                    <div>
                      <div className="font-medium text-white">月</div>
                      <div>1-12</div>
                    </div>
                    <div>
                      <div className="font-medium text-white">星期</div>
                      <div>0-6</div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">星期：0= 周日，1= 周一，...，6= 周六</p>
                </div>
                
                <div className="p-4 bg-dark-bg/50 rounded-lg border border-dark-border">
                  <h4 className="font-semibold text-brand mb-3">💡 常用示例</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center p-2 bg-dark-card rounded">
                      <code className="text-brand font-mono">0 0 * * *</code>
                      <span className="text-gray-400">每天 0 点执行</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-dark-card rounded">
                      <code className="text-brand font-mono">0 9 * * 1</code>
                      <span className="text-gray-400">每周一 9 点执行</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-dark-card rounded">
                      <code className="text-brand font-mono">*/30 * * * *</code>
                      <span className="text-gray-400">每 30 分钟执行</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-dark-card rounded">
                      <code className="text-brand font-mono">0 */2 * * *</code>
                      <span className="text-gray-400">每 2 小时执行</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-dark-card rounded">
                      <code className="text-brand font-mono">0 9-17 * * 1-5</code>
                      <span className="text-gray-400">工作日 9 点 -17 点每小时</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-dark-bg/50 rounded-lg border border-dark-border">
                  <h4 className="font-semibold text-brand mb-2">🔧 特殊符号</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start">
                      <code className="text-brand font-mono w-16 flex-shrink-0">*</code>
                      <span className="text-gray-300">任意值（每分钟/每小时/每天等）</span>
                    </div>
                    <div className="flex items-start">
                      <code className="text-brand font-mono w-16 flex-shrink-0">/</code>
                      <span className="text-gray-300">间隔（如 */5 表示每 5 个单位）</span>
                    </div>
                    <div className="flex items-start">
                      <code className="text-brand font-mono w-16 flex-shrink-0">,</code>
                      <span className="text-gray-300">枚举（如 1,3,5 表示第 1、3、5）</span>
                    </div>
                    <div className="flex items-start">
                      <code className="text-brand font-mono w-16 flex-shrink-0">-</code>
                      <span className="text-gray-300">范围（如 9-17 表示 9 到 17）</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-dark-border bg-dark-bg/30">
              <p className="text-xs text-gray-500 text-center">
                💡 提示：使用预设值快速选择，或自定义表达式实现灵活调度
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(CronManager);
