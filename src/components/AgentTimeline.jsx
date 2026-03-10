import { useState, useEffect } from 'react';

// Agent 图标映射
const AGENT_ICONS = {
  main: '🐝',
  fengbujue: '🐟',
  default: '🤖'
};

// 获取 Agent 图标
const getAgentIcon = (agentName) => {
  return AGENT_ICONS[agentName] || AGENT_ICONS.default;
};

// 消息阶段
const STAGES = {
  received: { icon: '📥', label: '收到', color: 'text-blue-400' },
  processing: { icon: '🔄', label: '处理中', color: 'text-yellow-400' },
  forwarded: { icon: '📤', label: '转发', color: 'text-purple-400' },
  response: { icon: '📝', label: '响应', color: 'text-green-400' },
  completed: { icon: '✅', label: '完成', color: 'text-green-500' }
};

function AgentTimeline({ showToast, selectedAgent }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // 加载消息时间线
  useEffect(() => {
    loadTimeline();
    // 每30秒刷新一次
    const interval = setInterval(loadTimeline, 30000);
    return () => clearInterval(interval);
  }, [selectedAgent]);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      
      // 获取当前Agent的消息
      const params = new URLSearchParams();
      if (selectedAgent) {
        params.set('agent', selectedAgent);
      }
      
      const res = await fetch(`/api/chat/recent-messages?${params}`);
      const data = await res.json();
      
      if (data.success) {
        // 处理消息，转换为时间线格式
        const timeline = processMessagesToTimeline(data.messages || []);
        setMessages(timeline);
        setLastUpdate(Date.now());
      }
    } catch (error) {
      console.error('加载时间线失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 将消息处理为时间线格式
  const processMessagesToTimeline = (msgs) => {
    if (!msgs || msgs.length === 0) {
      return [];
    }

    // 按时间排序
    const sorted = [...msgs].sort((a, b) => {
      const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
      const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
      return timeB - timeA; // 最新的在前
    });

    // 转换为时间线项
    return sorted.map((msg, index) => {
      const sender = msg.sender || msg.from || 'unknown';
      const content = msg.content || msg.message || '';
      const timestamp = msg.timestamp || msg.created_at || new Date().toISOString();
      
      // 确定消息阶段
      let stage = STAGES.received;
      if (content.includes('处理中') || content.includes('processing')) {
        stage = STAGES.processing;
      } else if (content.includes('转发') || content.includes('forward')) {
        stage = STAGES.forwarded;
      } else if (content.includes('响应') || content.includes('response')) {
        stage = STAGES.response;
      } else if (msg.done || msg.completed) {
        stage = STAGES.completed;
      }

      return {
        id: msg.id || index,
        timestamp,
        sender,
        content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
        stage,
        agent: sender
      };
    });
  };

  const refreshTimeline = async () => {
    await loadTimeline();
    if (showToast) {
      showToast('时间线已刷新', 'success', 2000);
    }
  };

  // 格式化时间
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="bg-dark-card rounded-xl border border-dark-border card-hover shadow-lg overflow-hidden">
      {/* 标题栏 */}
      <div className="p-4 border-b border-dark-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold flex items-center">
              <span className="mr-2">📊</span>
              消息时间线
            </h2>
            {selectedAgent && (
              <span className="px-2 py-0.5 text-xs bg-brand/20 text-brand rounded-full">
                🐝 {selectedAgent}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {lastUpdate && (
              <span className="text-xs text-gray-500">
                {formatTime(lastUpdate)}
              </span>
            )}
            <button
              onClick={refreshTimeline}
              disabled={loading}
              className={`p-2 text-gray-400 hover:text-brand transition-all transform ${
                loading ? 'animate-spin' : 'active:scale-90'
              }`}
              title="刷新时间线"
              aria-label="刷新时间线"
            >
              🔄
            </button>
          </div>
        </div>
      </div>

      {/* 时间线内容 */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {loading && messages.length === 0 ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-start space-x-3">
                <div className="w-16 h-4 bg-gray-700 rounded"></div>
                <div className="flex-1 h-4 bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <span className="text-4xl mb-2 block">📭</span>
            <p>暂无消息记录</p>
            <p className="text-xs mt-1">开始对话后将显示消息时间线</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, index) => (
              <div key={msg.id} className="flex items-start space-x-3">
                {/* 时间 */}
                <div className="text-xs text-gray-500 w-12 flex-shrink-0">
                  {formatTime(msg.timestamp)}
                </div>
                
                {/* 时间线连接线 */}
                <div className="flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full ${msg.stage.color.replace('text-', 'bg-')} ${index === 0 ? 'animate-pulse' : ''}`}></div>
                  {index < messages.length - 1 && (
                    <div className="w-px h-full bg-dark-border/50 my-0.5"></div>
                  )}
                </div>
                
                {/* 消息内容 */}
                <div className="flex-1 bg-dark-bg/50 rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getAgentIcon(msg.agent)}</span>
                      <span className="font-medium text-gray-300">{msg.agent}</span>
                    </div>
                    <span className={`text-xs ${msg.stage.color}`}>
                      {msg.stage.icon} {msg.stage.label}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs truncate">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 图例 */}
      <div className="p-3 border-t border-dark-border bg-dark-bg/30">
        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
          <span className="flex items-center">
            <span className="w-2 h-2 bg-blue-400 rounded-full mr-1"></span>
            📥 收到
          </span>
          <span className="flex items-center">
            <span className="w-2 h-2 bg-yellow-400 rounded-full mr-1"></span>
            🔄 处理中
          </span>
          <span className="flex items-center">
            <span className="w-2 h-2 bg-purple-400 rounded-full mr-1"></span>
            📤 转发
          </span>
          <span className="flex items-center">
            <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
            📝 响应
          </span>
          <span className="flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
            ✅ 完成
          </span>
        </div>
      </div>
    </div>
  );
}

export default AgentTimeline;
