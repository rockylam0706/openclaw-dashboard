import { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import StatusBar from './components/StatusBar';
import CronManager from './components/CronManager';
import CommandPanel from './components/CommandPanel';
import MetaDocs from './components/MetaDocs';
import MemoryManager from './components/MemoryManager';
import BackupManager from './components/BackupManager';
import ChatWindow from './components/ChatWindow';
import AgentSelector from './components/AgentSelector';
import AgentTimeline from './components/AgentTimeline';
import Toast from './components/Toast';
import Version from './components/Version';

const TABS = [
  { id: 'status', label: '状态信息', icon: '📊' },
  { id: 'chat', label: '聊天窗口', icon: '💬' },
  { id: 'timeline', label: '消息时间线', icon: '📊' },
];

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('status');
  const [gatewayStatus, setGatewayStatus] = useState(null);
  const [lastUpdate, setLastUpdate] = useState({});
  const [toast, setToast] = useState(null);
  const [isGatewayRefreshing, setIsGatewayRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const wsRef = useRef(null);

  // 获取网关状态
  const fetchGatewayStatus = async (showToastMessage = false) => {
    try {
      setIsGatewayRefreshing(true);
      if (showToastMessage) {
        showToast('刷新中...', 'info', 2000);
      }
      const res = await fetch('/api/status');
      const status = await res.json();
      setGatewayStatus(status);
      setLastUpdate(prev => ({ ...prev, gateway: Date.now() }));
      if (showToastMessage) {
        showToast('已更新', 'success', 2000);
      }
    } catch (error) {
      console.error('获取网关状态失败:', error);
      if (showToastMessage) {
        showToast('刷新失败', 'error', 3000);
      }
    } finally {
      setIsGatewayRefreshing(false);
    }
  };

  // 显示 Toast
  const showToast = (message, type = 'info', duration = 3000) => {
    setToast({ message, type, duration });
  };

  // 关闭 Toast
  const closeToast = () => {
    setToast(null);
  };

  // WebSocket 连接
  useEffect(() => {
    let websocket;
    let reconnectTimeout;
    let isMounted = true;
    const RECONNECT_DELAY = 3000;
    const MAX_RECONNECT_ATTEMPTS = 10;
    let reconnectAttempts = 0;

    const connectWebSocket = () => {
      if (!isMounted) return;
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      websocket = new WebSocket(wsUrl);

      websocket.onopen = () => {
        console.log('WebSocket 已连接');
        reconnectAttempts = 0;
        wsRef.current = websocket;
      };

      websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'heartbeat') {
          fetchGatewayStatus();
        }
      };

      websocket.onclose = () => {
        console.log('WebSocket 已断开');
        if (isMounted && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          reconnectTimeout = setTimeout(connectWebSocket, RECONNECT_DELAY);
        }
      };

      websocket.onerror = (error) => {
        console.error('WebSocket 错误:', error);
      };
    };

    connectWebSocket();

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (websocket) websocket.close();
    };
  }, []);

  // 初始加载和定时刷新
  useEffect(() => {
    fetchGatewayStatus();
    
    // 优化 1：网关状态检查从 5 秒改为 1 分钟（减少 97% 慢请求）
    const gatewayInterval = setInterval(fetchGatewayStatus, 60000);
    const moduleInterval = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 60000);
    
    return () => {
      clearInterval(gatewayInterval);
      clearInterval(moduleInterval);
    };
  }, []);

  // 手动刷新
  const refreshGateway = () => fetchGatewayStatus(true);

  return (
    <div className="min-h-screen bg-dark-bg">
      <Header darkMode={darkMode} onToggle={() => setDarkMode(!darkMode)} />
      
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* 页签导航 */}
        <div className="flex space-x-2 mb-6 border-b border-dark-border">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-dark-card text-brand border-t-2 border-brand'
                  : 'text-gray-400 hover:text-white hover:bg-dark-card/50'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        
        {/* 状态信息页签 */}
        {activeTab === 'status' && (
          <div className="space-y-4 sm:space-y-6 animate-fade-in">
            <StatusBar 
              status={gatewayStatus} 
              onRefresh={refreshGateway}
              lastUpdate={lastUpdate.gateway}
              isRefreshing={isGatewayRefreshing}
            />
            
            {/* Agent 选择器 */}
            <div className="bg-dark-card rounded-xl p-4 border border-dark-border">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold flex items-center">
                  <span className="mr-2">🐝</span>
                  Agent 选择
                </h2>
              </div>
              <div className="mt-3">
                <AgentSelector 
                  selectedAgent={selectedAgent} 
                  onAgentChange={setSelectedAgent}
                  showToast={showToast}
                />
              </div>
            </div>
            
            {/* 移动端单列，平板双列，桌面三列 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* 第一行：记忆管理 + 定时任务 */}
              <div className="sm:col-span-2">
                <MemoryManager showToast={showToast} selectedAgent={selectedAgent} />
              </div>
              
              <div>
                <CronManager showToast={showToast} refreshTrigger={refreshTrigger} selectedAgent={selectedAgent} />
              </div>
              
              {/* 第二行：备份管理 + 元文档信息 */}
              <div className="sm:col-span-2">
                <BackupManager showToast={showToast} />
              </div>
              
              <div>
                <MetaDocs showToast={showToast} selectedAgent={selectedAgent} />
              </div>
              
              {/* 第三行：快捷命令（整行） */}
              <div className="sm:col-span-2 lg:col-span-3">
                <CommandPanel showToast={showToast} />
              </div>
            </div>
          </div>
        )}
        
        {/* 聊天窗口页签 */}
        {activeTab === 'chat' && (
          <div className="animate-fade-in">
            <ChatWindow showToast={showToast} />
          </div>
        )}
        
        {/* 消息时间线页签 */}
        {activeTab === 'timeline' && (
          <div className="animate-fade-in">
            <AgentTimeline showToast={showToast} selectedAgent={selectedAgent} />
          </div>
        )}
      </main>
      
      <footer className="container mx-auto px-4 py-6 text-center text-gray-500 text-sm border-t border-dark-border mt-8">
        <p>🦞 OpenClaw Dashboard <Version /> | Made with ❤️</p>
        <p className="mt-1">
          最后更新：网关 {lastUpdate.gateway ? new Date(lastUpdate.gateway).toLocaleTimeString() : '-'}
        </p>
      </footer>

      {toast && (
        <Toast message={toast.message} type={toast.type} duration={toast.duration} onClose={closeToast} />
      )}
    </div>
  );
}

export default App;
