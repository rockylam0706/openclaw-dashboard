import { useState, useEffect, memo, useCallback } from 'react';

const COMMANDS = [
  {
    id: 'check-status',
    label: '查看状态',
    icon: '📊',
    description: '查看 OpenClaw 网关当前运行状态',
    usage: '检查网关是否正常运行，查看端口、内存等信息',
    scenario: '日常巡检、故障排查',
    notes: '无副作用，可放心使用',
    dangerous: false,
  },
  {
    id: 'restart-gateway',
    label: '重启网关',
    icon: '🔄',
    description: '重启 OpenClaw 网关服务（会导致短暂中断）',
    usage: '网关异常或配置变更后重启服务',
    scenario: '网关无响应、配置更新后',
    notes: '⚠️ 会导致 10-30 秒服务中断，请谨慎使用',
    dangerous: true,
  },
  {
    id: 'clear-cache',
    label: '清理缓存',
    icon: '🧹',
    description: '清理系统缓存，释放磁盘空间',
    usage: '清理临时文件、日志缓存等',
    scenario: '磁盘空间不足、定期维护',
    notes: '不会删除重要数据，但可能需要重新加载缓存',
    dangerous: false,
  },
  {
    id: 'view-logs',
    label: '查看日志',
    icon: '📜',
    description: '查看最近 50 条系统日志',
    usage: '查看系统运行日志，排查问题',
    scenario: '故障排查、审计追踪',
    notes: '仅显示最近 50 条，完整日志请查看日志文件',
    dangerous: false,
  },
  // 问题 11 修复：添加 doctor 诊断命令
  {
    id: 'doctor',
    label: '系统诊断',
    icon: '🏥',
    description: '执行系统健康检查，诊断潜在问题',
    usage: '执行 openclaw-cn doctor 命令，全面检查系统状态',
    scenario: '系统异常、性能问题、定期健康检查',
    notes: '会自动检查网关、配置、依赖等，输出详细报告',
    dangerous: false,
  },
];

function CommandPanel({ showToast }) {
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmCmd, setConfirmCmd] = useState(null);
  // 问题 10 修复：添加帮助面板状态
  const [showHelp, setShowHelp] = useState(false);

  const executeCommand = useCallback(async (cmd) => {
    // 危险操作需要二次确认
    if (cmd.dangerous) {
      setConfirmCmd(cmd);
      setShowConfirm(true);
      return;
    }

    await runCommand(cmd);
  }, []);

  const runCommand = useCallback(async (cmd) => {
    try {
      setLoading(cmd.id);
      setOutput(null);
      
      const res = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: cmd.id,
          confirm: cmd.dangerous,
        }),
      });
      
      const data = await res.json();
      
      setOutput({
        success: data.success || !data.error,
        command: cmd.label,
        output: data.output || data.message || data.error,
      });
      
      // 显示 Toast 通知
      if (data.success) {
        showToast(`${cmd.label} 执行成功`, 'success');
      } else {
        showToast(`${cmd.label} 执行失败：${data.error || data.message}`, 'error');
      }
    } catch (error) {
      setOutput({
        success: false,
        command: cmd.label,
        output: error.message,
      });
      showToast(`${cmd.label} 执行失败：${error.message}`, 'error');
    } finally {
      setLoading(null);
      setShowConfirm(false);
      setConfirmCmd(null);
    }
  }, [showToast]);

  return (
    <div className="bg-dark-card rounded-xl border border-dark-border card-hover shadow-lg">
      {/* 标题栏 */}
      <div className="p-4 border-b border-dark-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center">
            <span className="mr-2">⚡</span>
            快捷命令
          </h2>
          {/* 问题 10 修复：添加帮助按钮 */}
          <button
            onClick={() => setShowHelp(true)}
            className="p-2 text-gray-400 hover:text-brand transition-colors"
            title="查看命令说明"
            aria-label="查看命令说明"
          >
            ❓
          </button>
        </div>
      </div>
      
      {/* 命令按钮 - 小按钮样式 */}
      <div className="p-4">
        <div className="flex flex-wrap gap-3">
          {COMMANDS.map(cmd => (
            <div key={cmd.id} className="relative group">
              <button
                onClick={() => executeCommand(cmd)}
                disabled={loading === cmd.id}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  loading === cmd.id
                    ? 'bg-brand/20 border-brand animate-pulse'
                    : cmd.dangerous
                      ? 'bg-red-500/10 border-red-500/50 hover:border-red-500 hover:bg-red-500/20 text-red-400'
                      : 'bg-dark-bg border-dark-border hover:border-brand hover:bg-brand/10 text-white'
                }`}
              >
                <span>{cmd.icon}</span>
                <span>{cmd.label}</span>
                {loading === cmd.id && (
                  <span className="animate-spin ml-1">⏳</span>
                )}
              </button>
              
              {/* 悬停说明 */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 border border-gray-700 shadow-xl">
                {cmd.description}
                {cmd.dangerous && (
                  <div className="mt-1 flex items-center text-red-400">
                    <span>⚠️</span>
                    <span className="ml-1">危险操作</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* 二次确认弹窗 */}
      {showConfirm && confirmCmd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-dark-card rounded-xl border border-red-500/50 p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-3xl">⚠️</span>
              <h3 className="text-xl font-semibold text-red-400">危险操作确认</h3>
            </div>
            
            <p className="text-gray-300 mb-2">
              您即将执行：
              <span className="font-mono text-brand ml-2">{confirmCmd.label}</span>
            </p>
            
            <p className="text-gray-400 text-sm mb-6 p-3 bg-dark-bg/50 rounded-lg border border-dark-border">
              {confirmCmd.description}
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => runCommand(confirmCmd)}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 rounded-lg text-white font-medium transition-colors"
              >
                确认执行
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setConfirmCmd(null);
                }}
                className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 输出区域 - 问题 3 修复：移动端优化 */}
      {output && (
        <div className={`mx-3 sm:mx-4 mb-4 p-3 sm:p-4 rounded-lg border ${
          output.success 
            ? 'bg-green-500/10 border-green-500/50' 
            : 'bg-red-500/10 border-red-500/50'
        }`}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="text-sm font-medium flex items-center flex-1">
              {output.success ? '✅' : '❌'} 
              <span className="ml-2">{output.command}</span>
            </span>
            <div className="flex items-center gap-1">
              {/* 问题 9 修复：添加复制按钮 */}
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(output.output);
                    showToast('已复制到剪贴板', 'success', 2000);
                  } catch (err) {
                    showToast('复制失败', 'error', 2000);
                  }
                }}
                className="p-1 text-gray-400 hover:text-brand transition-colors flex-shrink-0"
                title="复制输出"
                aria-label="复制输出"
              >
                📋
              </button>
              <button
                onClick={() => setOutput(null)}
                className="p-1 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                aria-label="关闭"
              >
                ×
              </button>
            </div>
          </div>
          {/* 移动端可横向滚动 */}
          <div className="max-h-48 sm:max-h-60 overflow-y-auto bg-dark-bg/50 p-2 sm:p-3 rounded border border-dark-border">
            <pre className="text-xs sm:text-sm font-mono text-gray-300 whitespace-pre-wrap break-all">
              {output.output}
            </pre>
          </div>
        </div>
      )}

      {/* 问题 10 修复：帮助面板弹窗 */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card rounded-xl border border-dark-border w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* 帮助面板标题栏 */}
            <div className="p-4 border-b border-dark-border flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center">
                <span className="mr-2">❓</span>
                快捷命令使用说明
              </h3>
              <button
                onClick={() => setShowHelp(false)}
                className="p-2 text-gray-400 hover:text-white transition-colors text-xl"
                aria-label="关闭帮助"
              >
                ×
              </button>
            </div>
            
            {/* 帮助内容 */}
            <div className="p-4 overflow-y-auto flex-1">
              <div className="space-y-4">
                {COMMANDS.map((cmd, index) => (
                  <div
                    key={cmd.id}
                    className="p-4 bg-dark-bg/50 rounded-lg border border-dark-border"
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-2xl">{cmd.icon}</span>
                      <div className="flex-1">
                        <h4 className="font-semibold text-white">{cmd.label}</h4>
                        <p className="text-sm text-gray-400">{cmd.description}</p>
                      </div>
                      {cmd.dangerous && (
                        <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-full">
                          ⚠️ 危险操作
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">💡 使用说明</p>
                        <p className="text-gray-300">{cmd.usage}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">🎯 使用场景</p>
                        <p className="text-gray-300">{cmd.scenario}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">📝 注意事项</p>
                        <p className="text-gray-300">{cmd.notes}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* 帮助面板底部 */}
            <div className="p-4 border-t border-dark-border bg-dark-bg/30">
              <p className="text-xs text-gray-500 text-center">
                💡 提示：将鼠标悬停在命令按钮上可快速查看说明
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(CommandPanel);
