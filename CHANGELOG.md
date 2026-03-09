# Changelog

All notable changes to OpenClaw Dashboard will be documented in this file.

## [2.0.2] - 2025-03-07

### 🐛 Bug Fixes

1. **刷新时网关状态显示错误** (#1)
   - 修复刷新过程中状态短暂显示"已停止"的问题
   - 现在刷新时保持旧状态，获取新状态后再更新

2. **刷新按钮无反馈** (#2)
   - 添加点击动画（scale 效果）
   - 添加 Toast 提示"刷新中..."和"已更新"

3. **移动端刷新按钮太小** (#3)
   - 移动端最小点击区域增加到 44x44px (p-3)
   - 字体大小增加到 text-lg

4. **运行时长定义不清晰** (#4)
   - 为网关状态和任务卡片的运行时长添加 tooltip 说明
   - 说明文字："网关/任务自启动以来运行的时间"

5. **当前任务为空时无提示** (#5)
   - 添加友好的空状态提示
   - 显示"暂无任务"和说明文字

6. **元信息模块移动端编辑窗口太小** (#7)
   - 移动端现在全屏编辑
   - 使用 fixed 定位，覆盖整个屏幕
   - 添加关闭按钮

7. **记忆模块重复** (#8)
   - 移除 MDEditor（日常记忆）组件
   - 保留 MemoryManager（长期 + 短期记忆）
   - 删除 App.jsx 中的 MDEditor 引用

### ✨ New Features

8. **缺少刷新按钮** (#9)
   - MemoryManager：添加刷新记忆列表按钮
   - MetaDocs：添加刷新文档列表按钮
   - CronManager：添加刷新任务列表按钮
   - TodoList：添加刷新待办列表按钮

9. **快捷命令帮助按钮** (#10)
   - 右上角添加 ❓ 按钮
   - 点击弹出帮助面板
   - 每个命令包含：使用说明、使用场景、注意事项

10. **添加 doctor 诊断指令** (#11)
    - 新增系统诊断命令
    - 执行 `openclaw-cn doctor`
    - 显示系统健康状态报告

### 📝 Documentation

- 在 TodoList.jsx 中添加数据来源说明注释
- 说明当前使用 localStorage 存储
- 规划未来对接 openclaw-cn 任务系统

### 🎨 UI/UX Improvements

- 所有刷新按钮添加统一的 loading 动画
- 移动端按钮点击区域优化（最小 44x44px）
- Toast 提示统一风格
- 帮助面板响应式设计

### 🔧 Technical Changes

- 更新 server/routes/command.js 添加 doctor 命令
- 更新 App.jsx 和 TaskCard.jsx 支持刷新状态显示
- 更新 StatusBar.jsx 支持 isRefreshing 状态
- 版本号更新为 v2.0.2

---

## [2.0.1] - Previous Version

- Initial stable release
- Basic monitoring features
- Mobile-responsive design
