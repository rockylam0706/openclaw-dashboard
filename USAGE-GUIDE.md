# 🦞 OpenClaw Dashboard - 使用说明

**重要提示**: Dashboard 依赖 OpenClaw 网关！

---

## ❓ 常见问题

### Q1: 别人克隆后能直接使用吗？

**答案：可以，但需要满足前提条件！**

### Q2: 需要什么前提条件？

1. ✅ **OpenClaw 已安装并运行**
2. ✅ **Node.js v18+**
3. ✅ **npm**

### Q3: 如何检查 OpenClaw 是否安装？

```bash
openclaw-cn gateway status
```

如果显示运行中，说明已安装。

### Q4: 如果没有 OpenClaw 怎么办？

先安装 OpenClaw：
- 官网：https://openclaw.ai
- 文档：https://docs.openclaw.ai

---

## 🚀 完整安装流程

### 对于已安装 OpenClaw 的用户

```bash
# 3 步完成
git clone https://github.com/rockylam0706/openclaw-dashboard.git
cd openclaw-dashboard
npm install && npm run dev
```

访问 http://localhost:18790

### 对于未安装 OpenClaw 的用户

```bash
# 1. 先安装 OpenClaw
# 访问 https://openclaw.ai 按照指引安装

# 2. 验证安装
openclaw-cn gateway status

# 3. 安装 Dashboard
git clone https://github.com/rockylam0706/openclaw-dashboard.git
cd openclaw-dashboard
npm install && npm run dev
```

---

## 📊 项目依赖关系

```
OpenClaw Dashboard
    ↓ 依赖
OpenClaw 网关 (port 18789)
    ↓ 提供
AI 代理功能
```

**Dashboard 的作用：**
- 可视化监控 OpenClaw 状态
- 管理任务和会话
- 查看记忆和文档
- 执行快捷命令

**没有 Dashboard 也可以用：**
- OpenClaw 可以通过命令行使用
- Dashboard 只是增强体验的可选工具

---

## ✅ 安装验证清单

安装完成后检查：

- [ ] 可以访问 http://localhost:18790
- [ ] 网关状态显示绿色（运行中）
- [ ] 可以看到任务列表
- [ ] 可以看到会话列表
- [ ] 浏览器控制台无错误

---

## 🔗 相关链接

- **GitHub**: https://github.com/rockylam0706/openclaw-dashboard
- **安装指南**: INSTALL-GUIDE.md
- **OpenClaw**: https://openclaw.ai
- **问题反馈**: GitHub Issues
