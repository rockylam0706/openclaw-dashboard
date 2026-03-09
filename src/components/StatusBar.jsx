function StatusBar({ status, onRefresh, lastUpdate, isRefreshing }) {
  // 问题 1 修复：如果没有状态，显示加载中而不是"已停止"
  if (!status) {
    return (
      <div className="animate-pulse bg-dark-card rounded-xl p-4 border border-dark-border">
        <div className="h-6 bg-gray-700 rounded w-32"></div>
      </div>
    );
  }

  const gatewayRunning = status.gateway?.running;
  
  return (
    <div className="bg-gradient-to-r from-dark-card to-dark-card/80 rounded-xl p-4 sm:p-5 border border-dark-border card-hover shadow-lg">
      {/* 标题栏 - 移动端上下布局 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
        <h2 className="text-base sm:text-lg font-semibold flex items-center">
          <span className="mr-2">📊</span>
          系统状态
        </h2>
        <div className="flex items-center justify-between sm:justify-end space-x-3">
          {lastUpdate && (
            <span className="text-xs text-gray-500">
              {new Date(lastUpdate).toLocaleTimeString()}
            </span>
          )}
          {/* 问题 2 & 3 修复：刷新按钮添加动画、Toast 反馈、移动端增大点击区域 */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`p-3 sm:p-2 text-lg sm:text-base text-gray-400 hover:text-brand transition-all transform ${
              isRefreshing ? 'animate-spin' : 'active:scale-90'
            }`}
            title="刷新状态"
            aria-label="刷新状态"
          >
            🔄
          </button>
        </div>
      </div>
      
      {/* 状态信息 - 移动端网格布局 */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4">
        {/* 网关状态 */}
        <div className="col-span-2 sm:col-span-auto flex items-center space-x-3">
          <div className={`status-indicator ${gatewayRunning ? 'status-running' : 'status-error'}`}></div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">网关状态</p>
            <p className="font-semibold text-sm sm:text-base">
              {gatewayRunning ? (
                <span className="text-green-500 flex items-center">
                  运行中
                  <span className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                </span>
              ) : (
                <span className="text-red-500">已停止</span>
              )}
            </p>
          </div>
        </div>
        
        {/* 网关端口 */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">网关端口</p>
          <p className="font-mono text-brand font-medium text-sm">{status.gateway?.port || '-'}</p>
        </div>
        
        {/* Dashboard 端口 */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Dashboard</p>
          <p className="font-mono text-brand font-medium text-sm">{status.dashboard?.port || '-'}</p>
        </div>
        
        {/* 内存使用 */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">内存使用</p>
          <p className="font-mono text-xs sm:text-sm text-white">
            {status.dashboard?.memory 
              ? `${Math.round(status.dashboard.memory.heapUsed / 1024 / 1024)} MB`
              : '-'}
          </p>
        </div>
      </div>
      
      {/* 额外信息 - 移动端隐藏 */}
      <div className="hidden sm:flex mt-4 pt-4 border-t border-dark-border/50 items-center space-x-4 text-xs text-gray-500">
        <span>📁 工作空间：<span className="text-gray-400">~/.openclaw/workspace</span></span>
        <span>🤖 模型：<span className="text-gray-400">lite/qwen3.5-plus</span></span>
      </div>
    </div>
  );
}

export default StatusBar;
