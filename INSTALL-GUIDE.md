# 🦞 OpenClaw Dashboard - 完整安装指南

**适用版本**: v2.0.16  
**最后更新**: 2026-03-10

---

## ⚠️ 重要前提条件

**Dashboard 依赖 OpenClaw 网关！**

在开始之前，请确保：

### ✅ 必需条件
1. **OpenClaw 已安装并运行**
   ```bash
   # 检查 OpenClaw 是否运行
   openclaw-cn gateway status
   
   # 如果未安装，先安装 OpenClaw
   # https://openclaw.ai
   ```

2. **Node.js v18+ 已安装**
   ```bash
   node --version
   # 应该显示 v18.x.x 或更高
   ```

3. **npm 已安装**
   ```bash
   npm --version
   ```

### ❌ 不需要的
- ❌ 数据库
- ❌ 复杂配置
- ❌ API Keys（Dashboard 本身不需要）

---

## 🚀 快速开始（3 步安装）

### 步骤 1: 克隆项目
```bash
git clone https://github.com/rockylam0706/openclaw-dashboard.git
cd openclaw-dashboard
```

### 步骤 2: 安装依赖
```bash
npm install
```

### 步骤 3: 启动 Dashboard
```bash
# 方式 A: 开发模式（带热重载）
npm run dev

# 方式 B: 生产模式
npm start
```

访问 http://localhost:18790

---

## 📋 详细说明

### 前提条件检查

#### 1. 检查 OpenClaw
```bash
# 检查是否已安装
which openclaw-cn

# 检查网关状态
openclaw-cn gateway status

# 如果未安装，访问 https://openclaw.ai 安装
```

**为什么需要 OpenClaw？**
- Dashboard 通过 API 调用 OpenClaw 网关
- 默认连接 `http://127.0.0.1:18789`
- 获取网关状态、任务、会话等数据

#### 2. 检查 Node.js
```bash
node --version
# 需要 v18.0.0 或更高

npm --version
# 需要 npm 8.x 或更高
```

**安装 Node.js:**
- macOS: `brew install node`
- Linux: `curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -`
- Windows: 下载安装 https://nodejs.org/

### 安装依赖

```bash
cd openclaw-dashboard
npm install
```

**安装的依赖:**
- React 18 - 前端框架
- Vite - 构建工具
- Express - 后端服务器
- WebSocket - 实时通信
- Tailwind CSS - 样式
- Winston - 日志

### 启动方式

#### 方式 A: 开发模式（推荐开发时使用）
```bash
npm run dev
```
- 支持热重载
- 自动刷新
- 访问：http://localhost:18790

#### 方式 B: 生产模式（推荐部署时使用）
```bash
# 先构建
npm run build

# 启动
npm start
```
- 优化的生产构建
- 更快的加载速度
- 访问：http://localhost:18790

---

## 🔧 配置选项

### 修改端口（可选）

默认端口：18790

**方式 1: 环境变量**
```bash
DASHBOARD_PORT=3000 npm start
```

**方式 2: 修改 .env 文件**
```bash
cp .env.example .env
# 编辑 .env 文件
DASHBOARD_PORT=3000
```

### 修改网关地址（可选）

默认网关：http://127.0.0.1:18789

如果你的 OpenClaw 网关在不同地址：

**方式 1: 环境变量**
```bash
OPENCLAW_GATEWAY_URL=http://your-server:18789 npm start
```

**方式 2: 修改 .env 文件**
```bash
OPENCLAW_GATEWAY_URL=http://your-server:18789
```

---

## 🌐 局域网访问

### 获取本机 IP
```bash
# macOS
ipconfig getifaddr en0

# Linux
hostname -I

# Windows
ipconfig
```

### 在其他设备访问
```
http://<你的 IP>:18790

示例：
http://192.168.2.7:18790
```

### 防火墙设置（如果需要）
```bash
# macOS: 系统偏好设置 → 安全性与隐私 → 防火墙
# 添加 Node.js 允许入站连接
```

---

## 🐛 常见问题

### Q1: "npm install 失败"
**解决**:
```bash
# 清理缓存
npm cache clean --force

# 删除 node_modules
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

### Q2: "无法连接网关"
**解决**:
```bash
# 检查 OpenClaw 是否运行
openclaw-cn gateway status

# 检查网关端口
lsof -i :18789

# 如果网关未运行
openclaw-cn gateway start
```

### Q3: "端口 18790 已被占用"
**解决**:
```bash
# 查找占用端口的进程
lsof -i :18790

# 杀掉进程
kill -9 <PID>

# 或使用其他端口
DASHBOARD_PORT=3000 npm start
```

### Q4: "页面空白"
**解决**:
```bash
# 检查浏览器控制台错误
# 清除浏览器缓存
# 重新构建
npm run build
npm start
```

### Q5: "WebSocket 连接失败"
**解决**:
```bash
# 检查防火墙设置
# 确保网关运行正常
# 检查浏览器是否支持 WebSocket
```

---

## 📊 系统要求

| 组件 | 最低要求 | 推荐 |
|------|---------|------|
| **Node.js** | v18.0.0 | v20.x.x |
| **npm** | 8.x | 10.x |
| **内存** | 512MB | 1GB |
| **磁盘** | 200MB | 500MB |
| **OpenClaw** | v0.1.7+ | 最新版 |

---

## 🎯 验证安装

### 检查清单
- [ ] Dashboard 可以访问
- [ ] 网关状态显示正常
- [ ] WebSocket 连接成功
- [ ] 可以查看任务列表
- [ ] 可以查看会话列表

### 测试步骤
1. 访问 http://localhost:18790
2. 检查网关状态指示器（应该是绿色）
3. 查看任务卡片（应该显示当前任务）
4. 打开浏览器控制台（应该没有错误）

---

## 📚 相关资源

| 资源 | 链接 |
|------|------|
| **GitHub 仓库** | https://github.com/rockylam0706/openclaw-dashboard |
| **OpenClaw 官网** | https://openclaw.ai |
| **OpenClaw 文档** | https://docs.openclaw.ai |
| **Discord 社区** | https://discord.gg/clawd |
| **问题反馈** | https://github.com/rockylam0706/openclaw-dashboard/issues |

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证

MIT License - 详见 LICENSE 文件

---

**安装完成后，享受你的 Dashboard 吧！** 🦞
