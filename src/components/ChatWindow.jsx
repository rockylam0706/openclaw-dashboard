import { useState, useEffect, useRef, useCallback } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const CHANNELS = [
  { id: 'webui', name: 'WebUI 会话', icon: '🌐', color: 'text-green-400', apiEndpoint: '/api/chat/webui-messages' },
  { id: 'feishu', name: '飞书', icon: '📱', color: 'text-blue-400', apiEndpoint: '/api/chat/feishu-messages' },
  { id: 'all', name: '全部', icon: '📋', color: 'text-gray-400', apiEndpoint: '/api/chat/all-messages' },  // ✅ 修复：使用正确的 API
];

// ✅ Markdown 渲染配置（学习 OpenClaw WebUI）
marked.setOptions({
  gfm: true,        // GitHub Flavored Markdown
  breaks: true,     // 换行符转换为 <br>
  headerIds: false, // 不生成标题 ID
  mangle: false,    // 不转义 HTML 实体
});

// ✅ 复制按钮组件（学习 OpenClaw WebUI）
function CopyButton({ text, label = '复制' }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setError(false);
      setTimeout(() => {
        setCopied(false);
        setError(false);
      }, 1500);
    } catch {
      setError(true);
      setTimeout(() => setError(false), 1500);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`chat-copy-btn ${copied ? 'copied' : ''} ${error ? 'error' : ''}`}
      title={copied ? '已复制' : error ? '复制失败' : label}
      aria-label={copied ? '已复制' : error ? '复制失败' : label}
    >
      <span className="chat-copy-btn__icon">
        <span className="chat-copy-btn__icon-copy">📋</span>
        <span className="chat-copy-btn__icon-check">✅</span>
      </span>
    </button>
  );
}

// ✅ Markdown 渲染组件（学习 OpenClaw WebUI）
function MarkdownContent({ content }) {
  const html = marked.parse(content || '');
  const cleanHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'p', 'br', 'strong', 'em', 'u', 'code', 'pre', 'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'del', 'ins', 'sub', 'sup'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel', 'class', 'id'],
  });

  return (
    <div 
      className="markdown-content text-sm leading-relaxed"
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
}

// ✅ 普通对话消息组件（完整显示，支持 Markdown）
function ConversationMessage({ content }) {
  if (!content?.trim()) return null;
  
  return (
    <div className="conversation-message relative group">
      <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={content} label="复制消息" />
      </div>
      <MarkdownContent content={content} />
    </div>
  );
}

// ✅ 工具执行结果消息组件（结构化折叠显示，学习 OpenClaw WebUI）
function ExecResultMessage({ content, toolName, toolStatus, toolCode }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const statusConfig = {
    completed: { icon: '✅', label: '成功', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
    failed: { icon: '❌', label: '失败', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' }
  };
  const status = statusConfig[toolStatus] || { icon: '⚠️', label: '未知', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' };

  return (
    <div className="tool-message border border-dark-border rounded-lg overflow-hidden my-2">
      {/* 摘要栏（始终可见） */}
      <div
        className={`${status.bg} px-3 py-2.5 flex items-center justify-between cursor-pointer hover:bg-dark-bg/50 transition-colors border-b ${status.border}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2.5">
          <span className="text-lg">🔧</span>
          <span className="text-sm font-medium text-gray-200">
            <span className={`font-mono ${status.color}`}>{toolName || 'tool'}</span>
            <span className="mx-1.5 text-gray-500">·</span>
            <span className={status.color}>{status.icon} {status.label}</span>
          </span>
          {toolCode !== undefined && (
            <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${status.bg} ${status.color}`}>
              code: {toolCode}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400">
            {isExpanded ? '🔼 收起' : '📄 查看详情'}
          </span>
          <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <CopyButton text={content} label="复制输出" />
          </div>
        </div>
      </div>
      
      {/* 详情（展开后显示） */}
      {isExpanded && (
        <div className="max-h-[500px] overflow-y-auto custom-scrollbar bg-dark-bg/30 p-3">
          <div className="markdown-content">
            <MarkdownContent content={content} />
          </div>
        </div>
      )}
    </div>
  );
}

// ✅ 飞书消息组件（带标识，支持 Markdown）
function FeishuMessage({ content, feishuType }) {
  if (!content?.trim()) return null;
  
  return (
    <div className="feishu-message relative pl-3 border-l-2 border-blue-500/50">
      <div className="absolute -left-0.5 top-0 text-xs text-blue-400 font-medium">
        📱 {feishuType || '飞书'}
      </div>
      <MarkdownContent content={content} />
    </div>
  );
}

// ✅ 消息渲染器（根据消息类型选择组件）
function MessageRenderer({ msg }) {
  // 工具执行结果优先
  if (msg.toolName && (msg.toolStatus === 'completed' || msg.toolStatus === 'failed')) {
    return <ExecResultMessage 
      content={msg.content} 
      toolName={msg.toolName}
      toolStatus={msg.toolStatus}
      toolCode={msg.toolCode}
    />;
  }
  
  // 飞书消息
  if (msg.isFeishu || msg.feishuType) {
    return <FeishuMessage content={msg.content} feishuType={msg.feishuType} />;
  }
  
  // 默认：普通对话
  return <ConversationMessage content={msg.content} />;
}

function ChatWindow({ showToast }) {
  const [selectedChannel, setSelectedChannel] = useState('webui');
  const [messages, setMessages] = useState([]);        // ✅ A2 方案：普通消息
  const [toolMessages, setToolMessages] = useState([]); // ✅ A2 方案：工具消息
  const [loading, setLoading] = useState(true);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [showToolMessages, setShowToolMessages] = useState(true); // 是否显示工具消息
  const [hasMore, setHasMore] = useState(true);  // ✅ 是否还有更多历史消息
  const [loadingMore, setLoadingMore] = useState(false);  // ✅ 正在加载更多
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true); // ✅ 控制是否自动滚动
  const [currentOffset, setCurrentOffset] = useState(0); // ✅ 当前偏移量（基于实际返回的消息数）
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);  // ✅ 消息容器引用
  const wsRef = useRef(null);
  const channelRef = useRef(selectedChannel);

  // 初始化 WebSocket 连接
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const connectWebSocket = () => {
      try {
        wsRef.current = new WebSocket(wsUrl);
        
        wsRef.current.onopen = () => {
          console.log('[WS] 已连接');
          setWsConnected(true);
        };
        
        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'new_message') {
              // 收到新消息通知，重新加载当前频道
              loadMessagesForChannel(channelRef.current, true);
            }
          } catch (e) {
            console.error('解析 WS 消息失败:', e);
          }
        };
        
        wsRef.current.onclose = () => {
          console.log('[WS] 已断开，3 秒后重连...');
          setWsConnected(false);
          setTimeout(connectWebSocket, 3000);
        };
        
        wsRef.current.onerror = (error) => {
          console.error('[WS 错误]', error);
        };
      } catch (e) {
        console.error('创建 WS 连接失败:', e);
        setTimeout(connectWebSocket, 3000);
      }
    };
    
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // 更新 channelRef
  useEffect(() => {
    channelRef.current = selectedChannel;
  }, [selectedChannel]);

  // ✅ 按频道存储消息（切换频道时保留聊天记录 + offset）
  const channelMessagesRef = useRef({ 
    webui: { messages: [], toolMessages: [], hasLoaded: false, offset: 0 }, 
    feishu: { messages: [], toolMessages: [], hasLoaded: false, offset: 0 }, 
    all: { messages: [], toolMessages: [], hasLoaded: false, offset: 0 } 
  });

  // 首次加载消息（仅首次，切换频道不重新加载）
  useEffect(() => {
    const channelData = channelMessagesRef.current[selectedChannel];
    if (!channelData.hasLoaded || channelData.messages.length === 0) {
      // ✅ 修复：如果没有加载过 OR 消息为空，重新加载
      console.log(`[Chat] 切换频道 ${selectedChannel}, hasLoaded=${channelData.hasLoaded}, messages.length=${channelData.messages.length}`);
      loadMessagesForChannel(selectedChannel, false);
      channelData.hasLoaded = true;
    } else {
      // 切换频道时，从 ref 恢复消息和 offset
      setMessages(channelData.messages);
      setToolMessages(channelData.toolMessages);
      setCurrentOffset(channelData.offset);
    }
  }, [selectedChannel]);

  // ✅ 手动加载更多
  const handleLoadMore = async () => {
    if (hasMore && !loadingMore && !loading) {
      console.log('[Chat] 用户点击加载更多...');
      await loadMessagesForChannel(selectedChannel, false, true);
    }
  };

  // ✅ 智能自动滚动（仅在特定场景下滚动）
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
      setShouldScrollToBottom(false);  // 滚动后重置
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // ✅ 滚动到顶部时显示加载更多提示（不自动触发）
  const handleScroll = useCallback(() => {
    // 仅用于调试或未来扩展，不自动触发加载更多
  }, []);

  useEffect(() => {
    // ✅ 只在以下场景自动滚动：
    // 1. 首次加载消息
    // 2. 收到新的 AI 对话消息（非工具消息）
    if (shouldScrollToBottom && messages.length > 0 && !loading && !loadingMore) {
      scrollToBottom();
    }
  }, [messages.length, loading, loadingMore, shouldScrollToBottom, scrollToBottom]);

  // ✅ 分页加载配置
  const INITIAL_LOAD_COUNT = 40;  // 首次加载 40 条
  const LOAD_MORE_COUNT = 20;     // 每次加载更多 20 条

  // ✅ A2 方案：加载分离的消息（支持分页）
  const loadMessagesForChannel = async (channelId, isRealtimeUpdate, loadMore = false) => {
    try {
      if (!isRealtimeUpdate && !loadMore) setLoading(true);
      if (loadMore) setLoadingMore(true);
      
      const channel = CHANNELS.find(c => c.id === channelId);
      if (!channel) return;
      
      // ✅ 分页参数：加载更多时传递 offset（基于实际返回的消息数，不是 limit）
      const limitNum = loadMore ? LOAD_MORE_COUNT : INITIAL_LOAD_COUNT;
      const offset = loadMore ? currentOffset : 0;
      const url = `${channel.apiEndpoint}?offset=${offset}&limit=${limitNum}`;
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.success) {
        // ✅ A2 方案：分离存储普通消息和工具消息
        const msgs = data.messages || [];
        const tools = data.toolMessages || [];
        
        // ✅ 分页加载：追加消息 or 替换消息
        if (loadMore) {
          // ✅ 加载更多：追加到前面（历史消息），保持当前位置
          setMessages(prev => [...msgs, ...prev]);  // 新消息在前
          // ✅ 飞书窗口：不显示工具消息；其他窗口：追加到前面
          if (channelId === 'feishu') {
            setToolMessages([]);  // 飞书始终不显示工具消息
          } else {
            setToolMessages(prev => [...tools, ...prev]);  // 工具消息追加到前面
          }
          
          // ✅ 自动验证时间戳（加载更多时）
          if (msgs.length > 0 || tools.length > 0) {
            const allNewMessages = [...msgs, ...tools].sort((a, b) => a.timestamp - b.timestamp);
            const oldMessages = [...messages, ...toolMessages].sort((a, b) => a.timestamp - b.timestamp);
            
            if (oldMessages.length > 0 && allNewMessages.length > 0) {
              const oldestNewTimestamp = allNewMessages[0].timestamp;
              const oldestOldTimestamp = oldMessages[0].timestamp;
              
              if (oldestNewTimestamp >= oldestOldTimestamp) {
                console.error('❌ [验证失败] 加载的历史消息时间戳不正确！');
                console.error(`   新消息最早：${new Date(oldestNewTimestamp).toLocaleString()}`);
                console.error(`   旧消息最早：${new Date(oldestOldTimestamp).toLocaleString()}`);
                console.error(`   期望：新消息时间戳 < 旧消息时间戳`);
                showToast('加载验证失败，请刷新页面重试', 'error', 5000);
              } else {
                console.log('✅ [验证成功] 时间戳顺序正确');
                console.log(`   新消息最早：${new Date(oldestNewTimestamp).toLocaleString()}`);
                console.log(`   旧消息最早：${new Date(oldestOldTimestamp).toLocaleString()}`);
              }
            }
          }
          
          setShouldScrollToBottom(false);  // 明确禁止自动滚动
        } else if (isRealtimeUpdate) {
          // ✅ 实时更新（收到新消息）：检查是否有新的 AI 对话消息
          const hasNewConversation = msgs.some(m => !m.toolName && m.role !== 'toolResult');
          if (hasNewConversation) {
            setMessages(prev => [...prev, ...msgs]);
            setShouldScrollToBottom(true);  // 允许自动滚动
          } else {
            // 只有工具消息，不滚动
            setMessages(prev => [...prev, ...msgs]);
            setShouldScrollToBottom(false);
          }
          // ✅ 飞书窗口：不显示工具消息；其他窗口：替换工具消息
          if (channelId === 'feishu') {
            setToolMessages([]);
          } else {
            setToolMessages(prev => [...prev, ...tools]);  // 实时更新追加到后面
          }
        } else {
          // ✅ 首次加载：替换消息并滚动到底部
          setMessages(msgs);
          // ✅ 飞书窗口：不显示工具消息；其他窗口：显示工具消息
          if (channelId === 'feishu') {
            setToolMessages([]);
          } else {
            setToolMessages(tools);
          }
          setShouldScrollToBottom(true);  // 允许自动滚动
        }
        
        // ✅ 更新 offset（基于 API 实际返回的消息数，不是 limit！）
        const newOffset = loadMore ? currentOffset + msgs.length + tools.length : msgs.length + tools.length;
        setCurrentOffset(newOffset);
        
        // ✅ 检查是否还有更多消息
        // 基于已加载的消息总数（对话 + 工具）与 total 的比较
        const hasMoreMessages = data.total === undefined || newOffset < data.total;
        setHasMore(hasMoreMessages);
        
        console.log(`[Chat] ${channelId}: ${msgs.length}/${limitNum} 对话消息，${tools.length} 工具消息${loadMore ? ' (加载更多)' : ''}, offset=${offset}→${newOffset}, hasMore=${hasMoreMessages}, total=${data.total}, loadedCount=${newLoadedCount}`);
        
        // ✅ 保存到 channelMessagesRef（切换频道时保留）
        const currentMsgs = loadMore ? [...msgs, ...messages] : msgs;
        const currentTools = loadMore ? [...tools, ...toolMessages] : tools;
        channelMessagesRef.current[channelId] = {
          messages: currentMsgs,
          toolMessages: currentTools,
          hasLoaded: true,
          offset: newOffset  // ✅ 使用新的 offset
        };
        
        // 保存到 LocalStorage
        try {
          localStorage.setItem(`chat-messages-${channelId}`, JSON.stringify(currentMsgs));
          localStorage.setItem(`chat-toolMessages-${channelId}`, JSON.stringify(currentTools));
        } catch (e) {
          console.error('保存缓存失败:', e);
        }
      }
    } catch (error) {
      console.error('加载消息失败:', error);
      if (!isRealtimeUpdate && !loadMore) {
        showToast('加载消息失败', 'error');
      }
    } finally {
      if (!isRealtimeUpdate && !loadMore) setLoading(false);
      if (loadMore) setLoadingMore(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    try {
      setSending(true);
      
      const channel = CHANNELS.find(c => c.id === selectedChannel);
      let targetSessionKey = 'agent:main:main';
      
      if (selectedChannel === 'feishu') {
        targetSessionKey = 'agent:main:feishu:group:oc_2ea57de39e1f2f14bf549cb79075168f';
      }
      
      const res = await fetch('/api/chat/sessions/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionKey: targetSessionKey,
          message: inputMessage,
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        setInputMessage('');
        loadMessagesForChannel(selectedChannel, true);
        showToast('消息已发送', 'success');
      } else {
        showToast(`发送失败：${data.error}`, 'error');
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      showToast('发送消息失败', 'error');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    
    if (msgDate.getTime() === today.getTime()) {
      return timeStr;
    }
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (msgDate.getTime() === yesterday.getTime()) {
      return `昨天 ${timeStr}`;
    }
    return `${dateStr} ${timeStr}`;
  };

  const getChannelColor = (channelId) => {
    const channel = CHANNELS.find(c => c.id === channelId);
    return channel?.color || 'text-gray-400';
  };

  // ✅ A2 方案：合并渲染消息（按时间顺序）
  const renderAllMessages = () => {
    // 合并普通消息和工具消息，按时间排序
    const allMessages = [...messages, ...toolMessages].sort((a, b) => {
      // ✅ 修复时间戳格式不一致问题（普通消息用数字，工具消息用 ISO 字符串）
      const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp;
      const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp;
      return timeA - timeB;
    });
    
    return allMessages.map((msg, index) => (
      <div
        key={msg.id || `msg_${index}`}
        className={`flex ${msg.isSelf ? 'justify-end' : 'justify-start'} group`}
      >
        <div
          className={`max-w-[80%] rounded-xl p-3.5 transition-all ${
            msg.isSelf
              ? 'bg-brand text-white shadow-lg shadow-brand/20'
              : 'bg-dark-card border border-dark-border hover:border-brand/30'
          }`}
        >
          {/* 消息头 */}
          <div className="flex items-center space-x-2 mb-1.5">
            {/* 头像 */}
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              msg.isSelf ? 'bg-white/20' : 'bg-brand/20 text-brand'
            }`}>
              {msg.isSelf ? '我' : (msg.role === 'user' ? 'U' : 'A')}
            </div>
            
            {/* 发送者和时间 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className={`text-xs font-medium truncate ${
                  msg.isSelf ? 'text-white/90' : getChannelColor(msg.channel)
                }`}>
                  {msg.sender || (msg.isSelf ? '我' : 'AI')}
                  {msg.feishuType && (
                    <span className="ml-1 text-xs opacity-60">[{msg.feishuType}]</span>
                  )}
                </span>
                <span className="text-xs opacity-60" title={new Date(msg.timestamp).toLocaleString('zh-CN')}>
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            </div>
          </div>
          
          {/* 消息内容 */}
          <div className={`text-sm ${msg.isSelf ? 'text-white' : 'text-gray-200'}`}>
            <MessageRenderer msg={msg} />
          </div>
        </div>
      </div>
    ));
  };

  return (
    <div className="bg-dark-card rounded-xl border border-dark-border card-hover shadow-lg overflow-hidden flex flex-col h-[800px]">
      {/* 标题栏 + 频道选择 */}
      <div className="p-4 border-b border-dark-border bg-dark-card/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center">
            <span className="mr-2">💬</span>
            聊天窗口
            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
              wsConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {wsConnected ? '● 实时' : '● 断开'}
            </span>
          </h2>
          <div className="flex items-center space-x-2">
            {/* 工具消息开关 */}
            {toolMessages.length > 0 && (
              <button
                onClick={() => setShowToolMessages(!showToolMessages)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  showToolMessages 
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                    : 'bg-dark-bg text-gray-500 border border-dark-border'
                }`}
                title="切换工具消息显示"
              >
                🔧 工具 ({toolMessages.length})
              </button>
            )}
            <button
              onClick={() => {
                // ✅ 刷新按钮：只滚动到底部，不重新加载
                setShouldScrollToBottom(true);
              }}
              disabled={loading}
              className={`p-2 text-gray-400 hover:text-brand transition-all transform active:scale-90`}
              title="滚动到底部"
            >
              ⬇️
            </button>
          </div>
        </div>
        
        {/* 频道切换 */}
        <div className="flex space-x-2">
          {CHANNELS.map(channel => (
            <button
              key={channel.id}
              onClick={() => setSelectedChannel(channel.id)}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center space-x-2 ${
                selectedChannel === channel.id
                  ? 'bg-brand/20 text-brand border border-brand/50 shadow-lg shadow-brand/10'
                  : 'bg-dark-bg text-gray-400 border border-dark-border hover:border-brand/30 hover:bg-dark-bg/80'
              }`}
            >
              <span>{channel.icon}</span>
              <span>{channel.name}</span>
            </button>
          ))}
        </div>
        
        {/* 当前频道说明 */}
        <div className="mt-2.5 text-xs text-gray-400 flex items-center justify-between">
          <span>
            {selectedChannel === 'webui' && '💻 显示你与 AI 的直接对话（排除飞书消息）'}
            {selectedChannel === 'feishu' && '📱 显示所有飞书消息（私聊 + 群聊）'}
            {selectedChannel === 'all' && '📋 显示主会话的所有消息'}
          </span>
          {wsConnected && <span className="text-green-400">✓ 实时同步</span>}
        </div>
      </div>
      
      {/* 消息列表 */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-dark-bg/30 relative"
      >
        {/* ✅ 加载更多按钮（手动点击） */}
        {hasMore && !loadingMore && (
          <div className="text-center py-3">
            <button
              onClick={handleLoadMore}
              className="px-4 py-2 bg-dark-card border border-dark-border hover:border-brand rounded-lg text-sm text-gray-300 hover:text-brand transition-all"
            >
              📜 加载更多历史消息
            </button>
            <p className="text-xs text-gray-500 mt-2">💡 滚动到顶部后点击加载</p>
          </div>
        )}
        
        {/* ✅ 正在加载更多 */}
        {loadingMore && (
          <div className="text-center text-gray-500 text-xs py-2 animate-pulse">
            🔄 加载历史消息...
          </div>
        )}
        
        {/* ✅ 没有更多消息提示 */}
        {!hasMore && messages.length > 0 && (
          <div className="text-center text-gray-600 text-xs py-2">
            ─── 已经到底了 ───
          </div>
        )}
        
        {loading && messages.length === 0 && toolMessages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-12">
            <p className="animate-pulse">🔄 加载中...</p>
          </div>
        ) : messages.length === 0 && toolMessages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-12">
            <p>💭 暂无消息</p>
            <p className="mt-2 text-xs">发送第一条消息开始对话</p>
            {wsConnected && (
              <p className="mt-2 text-xs text-green-400">✓ WebSocket 已连接，实时接收消息</p>
            )}
          </div>
        ) : (
          <>
            {/* 渲染所有消息（按时间顺序） */}
            {renderAllMessages()}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {/* 输入框 */}
      <div className="p-4 border-t border-dark-border bg-dark-card/50">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="输入消息... (Enter 发送)"
            disabled={sending || !wsConnected}
            className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={sendMessage}
            disabled={sending || !inputMessage.trim() || !wsConnected}
            className="px-5 py-2.5 bg-brand hover:bg-brand-light rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-lg shadow-brand/20"
          >
            {sending ? '发送中...' : '发送'}
          </button>
        </div>
        {!wsConnected && (
          <p className="text-xs text-red-400 mt-2 text-center">
            ⚠️ WebSocket 未连接，消息可能无法实时接收
          </p>
        )}
      </div>
    </div>
  );
}

export default ChatWindow;
