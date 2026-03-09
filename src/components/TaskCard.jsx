import { useState, useEffect } from 'react';

function TaskCard({ task, onRefresh, lastUpdate, isRefreshing }) {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (task?.startTime) {
      const interval = setInterval(() => {
        setDuration(Math.floor((Date.now() - task.startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [task?.startTime]);

  // 问题 5 修复：当前任务为空时显示友好提示
  if (!task) {
    return (
      <div className="bg-dark-card rounded-xl p-6 border border-dark-border card-hover shadow-lg">
        {/* 标题栏 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2 sm:gap-0">
          <h2 className="text-base sm:text-lg font-semibold flex items-center">
            <span className="mr-2">📋</span>
            当前任务
          </h2>
          <div className="flex items-center flex-wrap gap-2 sm:space-x-3">
            {lastUpdate && (
              <span className="text-xs text-gray-500">
                {new Date(lastUpdate).toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className={`p-3 text-lg text-gray-400 hover:text-brand transition-all transform ${
                isRefreshing ? 'animate-spin' : 'active:scale-90'
              }`}
              title="刷新任务"
              aria-label="刷新任务"
            >
              🔄
            </button>
          </div>
        </div>
        
        {/* 空状态提示 */}
        <div className="text-center py-12">
          <div className="text-6xl mb-4">😴</div>
          <p className="text-gray-400 text-lg font-medium mb-2">暂无任务</p>
          <p className="text-gray-500 text-sm">网关当前空闲，等待新任务...</p>
        </div>
      </div>
    );
  }

  // 计算警告状态
  const minutes = Math.floor(duration / 60);
  const isWarning = minutes >= 5 && minutes < 10;
  const isAlert = minutes >= 10;
  
  const statusColors = {
    idle: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50',
    running: isAlert 
      ? 'bg-red-500/20 text-red-500 border-red-500/50' 
      : isWarning 
        ? 'bg-orange-500/20 text-orange-500 border-orange-500/50'
        : 'bg-green-500/20 text-green-500 border-green-500/50',
    completed: 'bg-blue-500/20 text-blue-500 border-blue-500/50',
    error: 'bg-red-500/20 text-red-500 border-red-500/50',
  };

  const statusLabels = {
    idle: '待命中',
    running: '运行中',
    completed: '已完成',
    error: '错误',
  };

  const statusIcons = {
    idle: '⏸️',
    running: '▶️',
    completed: '✅',
    error: '❌',
  };

  return (
    <div className={`bg-dark-card rounded-xl p-4 sm:p-6 border ${isAlert ? 'border-red-500 animate-pulse' : 'border-dark-border'} card-hover shadow-lg`}>
      {/* 标题栏 - 移动端上下布局 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
        <h2 className="text-base sm:text-lg font-semibold flex items-center">
          <span className="mr-2">📋</span>
          当前任务
        </h2>
        <div className="flex items-center flex-wrap gap-2 sm:space-x-3">
          <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium border ${statusColors[task.status] || statusColors.idle}`}>
            {statusIcons[task.status] || '⏸️'} {statusLabels[task.status] || task.status}
          </span>
          {lastUpdate && (
            <span className="text-xs text-gray-500">
              {new Date(lastUpdate).toLocaleTimeString()}
            </span>
          )}
          {/* 问题 2 & 3 修复：刷新按钮添加动画、移动端增大点击区域 */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`p-3 text-lg text-gray-400 hover:text-brand transition-all transform ${
              isRefreshing ? 'animate-spin' : 'active:scale-90'
            }`}
            title="刷新任务"
            aria-label="刷新任务"
          >
            🔄
          </button>
        </div>
      </div>
      
      {/* 任务描述 */}
      <div className="mb-6 p-4 bg-dark-bg/50 rounded-lg border border-dark-border">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">任务描述</p>
        <p className="text-white font-medium">{task.description || '无任务'}</p>
      </div>
      
      {/* 进度条 */}
      {task.progress !== undefined && (
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">进度</span>
            <span className="text-brand font-medium">{task.progress}%</span>
          </div>
          <div className="h-3 bg-gray-700 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-brand to-brand-light transition-all duration-300"
              style={{ width: `${task.progress}%` }}
            ></div>
          </div>
        </div>
      )}
      
      {/* 时间信息 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 问题 4 修复：运行时长添加 tooltip 说明 */}
        <div className="p-3 bg-dark-bg/50 rounded-lg border border-dark-border relative group">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1 flex items-center">
            运行时长
            <span className="ml-1 cursor-help text-gray-500" title="任务自启动以来运行的时间">❓</span>
          </p>
          <p className={`font-mono text-lg ${isAlert ? 'text-red-500' : isWarning ? 'text-orange-500' : 'text-white'}`}>
            {formatDuration(duration)}
            {isAlert && <span className="ml-2">⚠️</span>}
            {isWarning && <span className="ml-2">⚡</span>}
          </p>
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-gray-700 shadow-xl">
            任务自启动以来运行的时间
          </div>
        </div>
        <div className="p-3 bg-dark-bg/50 rounded-lg border border-dark-border">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">开始时间</p>
          <p className="font-mono text-lg text-white">
            {task.startTime ? new Date(task.startTime).toLocaleTimeString() : '-'}
          </p>
        </div>
      </div>
    </div>
  );
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default TaskCard;
