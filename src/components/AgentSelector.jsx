import { useState, useEffect } from 'react';

function AgentSelector({ selectedAgent, onAgentChange, showToast }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  // 加载 Agent 列表
  useEffect(() => {
    loadAgents();
    
    // 定时刷新列表（每30秒）
    const interval = setInterval(loadAgents, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAgents = async () => {
    try {
      const res = await fetch('/api/agents/list');
      const data = await res.json();
      if (data.success) {
        setAgents(data.agents || []);
        setLastUpdate(Date.now());
      }
    } catch (error) {
      console.error('加载 Agent 列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAgentChange = (agentName) => {
    onAgentChange(agentName || null);
    if (showToast) {
      showToast(agentName ? `已切换到 Agent: ${agentName}` : '已切换到默认工作空间', 'success', 2000);
    }
  };

  // 获取 Agent 状态徽章
  const getStatusBadge = (agent) => {
    if (!agent.lastActive) {
      return <span className="text-xs text-gray-500">从未活跃</span>;
    }
    
    const lastActiveTime = new Date(agent.lastActive);
    const now = new Date();
    const diffMs = now - lastActiveTime;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 5) {
      return <span className="text-xs text-green-500 flex items-center">
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></span>
        在线
      </span>;
    } else if (diffMins < 60) {
      return <span className="text-xs text-yellow-500">{diffMins}m 前</span>;
    } else {
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) {
        return <span className="text-xs text-orange-500">{diffHours}h 前</span>;
      }
      return <span className="text-xs text-gray-500">{Math.floor(diffHours / 24)}d 前</span>;
    }
  };

  if (loading && agents.length === 0) {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-400">加载中...</span>
      </div>
    );
  }

  // 如果没有多 Agent，显示单 Agent 模式提示
  if (agents.length === 0) {
    return (
      <div className="flex items-center space-x-2 text-sm">
        <span className="text-gray-500">🐝</span>
        <span className="text-gray-400">单 Agent 模式</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-gray-400">🐝</span>
      <select
        value={selectedAgent || ''}
        onChange={(e) => handleAgentChange(e.target.value)}
        className="bg-dark-bg border border-dark-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-brand transition-colors cursor-pointer"
      >
        <option value="">默认工作空间</option>
        {agents.map(agent => (
          <option key={agent.name} value={agent.name}>
            {agent.name} ({agent.sessions} 会话)
          </option>
        ))}
      </select>
      
      {/* 显示当前 Agent 状态 */}
      {selectedAgent && agents.find(a => a.name === selectedAgent) && (
        <div className="flex items-center">
          {getStatusBadge(agents.find(a => a.name === selectedAgent))}
        </div>
      )}
    </div>
  );
}

export default AgentSelector;
