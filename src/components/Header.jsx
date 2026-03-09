import Version from './Version';

function Header({ darkMode, onToggle }) {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-dark-bg/90 border-b border-dark-border shadow-lg">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Logo 和标题 */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <span className="text-2xl sm:text-3xl animate-pulse">🦞</span>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-white flex items-center whitespace-nowrap">
                OpenClaw Dashboard
                <span className="ml-2 px-1.5 sm:px-2 py-0.5 bg-brand/20 text-brand text-xs rounded-full hidden sm:inline">
                  <Version />
                </span>
              </h1>
              <p className="text-xs text-gray-400 truncate hidden sm:block">实时监控面板 · 现代化设计</p>
            </div>
          </div>
          
          {/* 主题切换按钮 */}
          <button
            onClick={onToggle}
            className="p-2 sm:p-2.5 rounded-lg bg-dark-card border border-dark-border hover:border-brand transition-all hover:shadow-md flex-shrink-0"
            title={darkMode ? '切换到亮色模式' : '切换到暗色模式'}
          >
            {darkMode ? (
              <span className="text-lg sm:text-xl">☀️</span>
            ) : (
              <span className="text-lg sm:text-xl">🌙</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
