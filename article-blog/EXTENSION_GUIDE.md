# VS Code 扩展 vs 原始脚本对比

## 🎉 好消息！VS Code 扩展已经创建完成！

我已经为你创建了一个完整的 VS Code 扩展来替代原来有冲突的键盘监听脚本。

## 📊 对比分析

| 特性 | 原始脚本 | VS Code 扩展 |
|------|----------|--------------|
| **冲突问题** | ❌ 与 Next.js dev 冲突 | ✅ 无冲突 |
| **启动方式** | ❌ 需要单独运行 | ✅ VS Code 自动加载 |
| **键盘监听** | ❌ 劫持终端输入 | ✅ 原生 VS Code 事件 |
| **用户体验** | ❌ 命令行界面 | ✅ 图形界面 + 状态栏 |
| **稳定性** | ❌ 容易崩溃 | ✅ VS Code 原生稳定 |
| **功能** | ✅ 完整的 i18n 处理 | ✅ 相同功能 + 更多 |

## 🔧 解决的问题

### 1. 终端冲突问题
- ❌ **原问题**: `process.stdin.setRawMode(true)` 劫持标准输入
- ✅ **解决方案**: 使用 VS Code 的 `onDidSaveTextDocument` 事件

### 2. 文件监听冲突
- ❌ **原问题**: 轮询式文件监听与 Next.js 热重载冲突  
- ✅ **解决方案**: 只在保存时触发，不与热重载冲突

### 3. 启动复杂性
- ❌ **原问题**: 需要 `concurrently` 同时运行两个进程
- ✅ **解决方案**: VS Code 扩展自动启动，无需额外配置

## 📁 文件结构

已创建的扩展文件：

```
vscode-extension/
├── package.json          # 扩展配置
├── tsconfig.json         # TypeScript 配置
├── src/
│   ├── extension.ts      # 主扩展文件
│   └── i18nCore.ts       # 核心功能（从原脚本提取）
├── README.md             # 详细文档
├── QUICKSTART.md         # 快速开始指南
├── install.bat           # Windows 安装脚本
└── install.sh            # Linux/Mac 安装脚本
```

## 🚀 如何使用

### 方法1：快速安装（推荐）
```cmd
cd vscode-extension
install.bat  # Windows 用户
```

### 方法2：手动安装
```cmd
cd vscode-extension
npm install
npm run compile
npm install -g vsce
vsce package
code --install-extension *.vsix
```

## ⚡ 主要改进

### 1. 无缝集成
- 扩展在 VS Code 启动时自动加载
- 状态栏实时显示开关状态
- 原生命令和快捷键支持

### 2. 更好的用户体验
- 进度条显示处理状态
- 输出面板记录详细日志  
- 可配置的设置选项

### 3. 更稳定的架构
- 基于 VS Code 扩展 API，稳定可靠
- 错误处理和恢复机制
- 内存管理优化

## 📝 使用步骤

1. **安装扩展**
   ```cmd
   cd vscode-extension && install.bat
   ```

2. **修改 package.json**
   ```json
   {
     "scripts": {
       "dev": "npm run i18n_clean && npx next dev --turbopack"  // 已修改，无冲突
     }
   }
   ```

3. **正常开发**
   - 写代码时使用中文：`<div>你好世界</div>`
   - 按 `Ctrl+S` 保存
   - 扩展自动转换：`<div>{t("你好世界")}</div>`

4. **监控状态**
   - 状态栏显示：`🔄 I18n: ON`
   - 点击可切换开关状态

## 🎯 现在可以安全使用

现在你可以：
- ✅ 正常运行 `npm run dev`（无冲突）
- ✅ 使用 VS Code 扩展处理 i18n
- ✅ 享受更好的开发体验

如果还想偶尔使用原始脚本，可以运行：
```cmd
npm run dev:with-i18n  # 包含原始脚本的版本
```

但推荐使用新的 VS Code 扩展，它更稳定、功能更强大！