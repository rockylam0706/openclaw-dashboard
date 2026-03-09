import { useState, useEffect } from 'react';

/**
 * 问题 6: ToDo 列表数据来源说明
 * 
 * 当前实现：
 * - 数据存储：localStorage (key: 'dashboard-todos')
 * - 数据格式：Array<{ id, text, completed, createdAt }>
 * - 持久化：浏览器本地存储，清除缓存会丢失
 * 
 * 未来改进方向（对接 openclaw-cn 任务系统）：
 * - 方案 1: 通过 WebSocket 接收 openclaw-cn 的 task 事件
 * - 方案 2: 调用 /api/tasks/todo 接口获取/更新待办
 * - 方案 3: 与 feishu_task 集成，同步飞书任务
 * 
 * 数据流：
 * 用户添加 → localStorage → UI 渲染
 * 用户删除/完成 → localStorage → UI 更新
 * 
 * TODO: 实现与 openclaw-cn 任务系统的双向同步
 */

function TodoList({ refreshTrigger }) {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // 从 localStorage 加载 TODO
  useEffect(() => {
    const saved = localStorage.getItem('dashboard-todos');
    if (saved) {
      try {
        setTodos(JSON.parse(saved));
      } catch (e) {
        // 忽略解析错误
      }
    }
  }, []);

  // 问题 10 修复：监听刷新触发器，重新加载数据
  useEffect(() => {
    if (refreshTrigger) {
      const saved = localStorage.getItem('dashboard-todos');
      if (saved) {
        try {
          setTodos(JSON.parse(saved));
          setLastUpdate(Date.now());
        } catch (e) {
          // 忽略解析错误
        }
      }
    }
  }, [refreshTrigger]);

  // 保存到 localStorage
  useEffect(() => {
    localStorage.setItem('dashboard-todos', JSON.stringify(todos));
  }, [todos]);

  const addTodo = (e) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    
    setTodos([...todos, {
      id: Date.now(),
      text: newTodo,
      completed: false,
      createdAt: Date.now(),
    }]);
    setNewTodo('');
    setLastUpdate(Date.now());
  };

  const toggleTodo = (id) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
    setLastUpdate(Date.now());
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
    setLastUpdate(Date.now());
  };

  const clearCompleted = () => {
    setTodos(todos.filter(todo => !todo.completed));
    setLastUpdate(Date.now());
  };

  const completedCount = todos.filter(t => t.completed).length;
  const totalCount = todos.length;

  // 问题 9 修复：添加刷新功能（重新从 localStorage 加载）
  const refreshTodos = () => {
    const saved = localStorage.getItem('dashboard-todos');
    if (saved) {
      try {
        setTodos(JSON.parse(saved));
        setLastUpdate(Date.now());
      } catch (e) {
        // 忽略解析错误
      }
    }
  };

  return (
    <div className="bg-dark-card rounded-xl p-6 border border-dark-border card-hover shadow-lg h-full">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center">
          <span className="mr-2">✅</span>
          TODO 列表
        </h2>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500 hidden sm:inline">
            {new Date(lastUpdate).toLocaleTimeString()}
          </span>
          {/* 问题 9 修复：添加刷新按钮 */}
          <button
            onClick={refreshTodos}
            className="p-2 text-gray-400 hover:text-brand transition-all transform active:scale-90"
            title="刷新列表"
            aria-label="刷新列表"
          >
            🔄
          </button>
          {completedCount > 0 && (
            <button
              onClick={clearCompleted}
              className="text-xs text-gray-400 hover:text-red-400 transition-colors"
            >
              清理已完成
            </button>
          )}
        </div>
      </div>
      
      {/* 添加表单 */}
      <form onSubmit={addTodo} className="mb-4 flex gap-2">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="添加新任务..."
          className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand transition-colors"
        />
        <button
          type="submit"
          className="px-4 py-2.5 bg-brand hover:bg-brand-light rounded-lg text-sm font-medium transition-colors"
        >
          添加
        </button>
      </form>
      
      {/* 任务列表 */}
      <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
        {todos.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">✨ 暂无待办</p>
            <p className="text-gray-600 text-xs mt-1">添加你的第一个任务吧！</p>
            <div className="mt-4 p-3 bg-dark-bg/50 rounded-lg border border-dark-border">
              <p className="text-xs text-gray-500">
                💡 说明：ToDo 数据存储在浏览器本地 (localStorage)<br/>
                清除浏览器缓存会丢失数据
              </p>
            </div>
          </div>
        ) : (
          todos.map(todo => (
            <div
              key={todo.id}
              className={`flex items-center justify-between p-3 bg-dark-bg rounded-lg border group transition-all ${
                todo.completed 
                  ? 'border-gray-700 opacity-60' 
                  : 'border-dark-border hover:border-brand/50'
              }`}
            >
              <div className="flex items-center space-x-3 flex-1">
                <button
                  onClick={() => toggleTodo(todo.id)}
                  className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                    todo.completed
                      ? 'bg-green-500 border-green-500'
                      : 'border-gray-600 hover:border-brand'
                  }`}
                >
                  {todo.completed && <span className="text-white text-xs">✓</span>}
                </button>
                <span className={`text-sm ${
                  todo.completed 
                    ? 'line-through text-gray-500' 
                    : 'text-white'
                }`}>
                  {todo.text}
                </span>
              </div>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500 transition-all p-1"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
      
      {/* 统计 */}
      <div className="mt-4 pt-4 border-t border-dark-border flex items-center justify-between text-xs">
        <span className="text-gray-500">
          进度：{completedCount} / {totalCount}
        </span>
        <div className="flex items-center space-x-2">
          <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden max-w-[100px]">
            <div 
              className="h-full bg-gradient-to-r from-brand to-brand-light transition-all"
              style={{ width: `${totalCount > 0 ? (completedCount / totalCount * 100) : 0}%` }}
            ></div>
          </div>
          <span className="text-brand font-medium">
            {totalCount > 0 ? Math.round(completedCount / totalCount * 100) : 0}%
          </span>
        </div>
      </div>
    </div>
  );
}

export default TodoList;
