import express from 'express';

const router = express.Router();

// 获取会话列表
router.get('/', (req, res) => {
  try {
    // 这里应该从 openclaw-cn 获取真实会话
    // 暂时返回模拟数据
    const sessions = [
      {
        id: 'session-1',
        type: 'chat',
        channel: 'feishu',
        status: 'active',
        createdAt: Date.now() - 3600000,
        lastActivity: Date.now()
      }
    ];

    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
