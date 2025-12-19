# Mirror Studio - CVfoR1 前端应用

这是一个基于 React + TypeScript + Vite 构建的现代化智能简历生成与职位匹配系统前端应用。

## 🚀 技术栈

- **框架**: React 18.3.1
- **构建工具**: Vite 6.3.5
- **语言**: TypeScript
- **动画**: Motion (Framer Motion)
- **UI 组件**: Radix UI + 自定义组件库
- **图标**: Lucide React
- **样式**: Tailwind CSS (通过 globals.css)

## 📦 安装依赖

在首次运行前，请先安装所有必需的依赖：

```bash
cd apps/ui
npm install
```

### 核心依赖说明

```bash
# React 核心库
npm install react react-dom

# 动画库
npm install motion

# UI 组件库
npm install lucide-react clsx tailwind-merge
npm install class-variance-authority

# Radix UI 组件（已在 package.json 中配置）
# 包括 accordion, dialog, popover, select 等多个高质量无障碍组件
```

## 🎯 运行项目

### 开发模式

```bash
npm run dev
```

这将启动开发服务器，默认在 `http://localhost:3000` 打开。

### 构建生产版本

```bash
npm run build
```

构建输出将生成在 `build/` 目录中。

## 📁 项目结构

```
apps/ui/
├── index.html              # HTML 入口文件
├── package.json            # 依赖配置
├── vite.config.ts         # Vite 构建配置
├── src/
│   ├── App.tsx            # 主应用组件（路由和状态管理）
│   ├── main.tsx           # React 入口文件
│   ├── index.css          # 基础样式
│   ├── components/        # 页面组件
│   │   ├── Landing.tsx              # 落地页
│   │   ├── PersonaBuilder.tsx       # 画像构建（Step 1）
│   │   ├── PersonaDetails.tsx       # 画像详情
│   │   ├── JobRecommendations.tsx   # 岗位推荐（Step 2）
│   │   ├── JobSearch.tsx            # 岗位搜索（Step 3）
│   │   ├── ResumeGeneration.tsx     # 简历生成（Step 4）
│   │   ├── TechBackground.tsx       # 背景动画组件
│   │   ├── PopCat.tsx              # 交互式小猫组件
│   │   ├── StepProgress.tsx        # 步骤进度条
│   │   ├── figma/                  # Figma 相关组件
│   │   │   └── ImageWithFallback.tsx
│   │   └── ui/                     # 基础 UI 组件库
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       ├── dialog.tsx
│   │       └── ... (更多 Radix UI 组件)
│   ├── styles/
│   │   └── globals.css    # 全局样式（包含 Tailwind）
│   └── guidelines/
│       └── Guidelines.md  # 设计指南
└── README.md              # 本文件
```

## 🎨 应用流程

应用采用多步骤引导式流程：

1. **Landing Page** - 欢迎页面，开始使用
2. **Step 1: Persona Builder** - 构建个人画像（上传简历或输入信息）
3. **Step 2: Job Recommendations** - 基于画像的智能岗位推荐
4. **Step 3: Job Search** - 精准职位检索（LinkedIn + Seek）
5. **Step 4: Resume Generation** - 生成针对性简历

## 🌐 与后端 API 集成

前端需要连接到后端 API（位于 `apps/api/`）。

### 配置 API 地址

当前应用假定后端运行在默认地址。如需修改，请在相应组件中更新 API 端点：

```typescript
// 在各个组件中查找类似的 API 调用
const API_BASE = 'http://localhost:8000';  // 后端地址
```

### 启动后端服务

```bash
# 在项目根目录
cd apps/api
python -m uvicorn main:app --reload
```

后端将运行在 `http://localhost:8000`。

## ⚙️ 配置说明

### Vite 配置 (`vite.config.ts`)

- **端口**: 默认 3000
- **自动打开浏览器**: 启用
- **构建输出目录**: `build/`
- **路径别名**: `@/` 指向 `src/`

### 依赖别名

所有 Radix UI 和其他依赖库已在 `vite.config.ts` 中配置了别名映射，确保版本一致性。

## 🎭 功能特性

- ✅ 响应式设计，支持移动端
- ✅ 深色/浅色主题切换
- ✅ 中文/英文双语支持
- ✅ 流畅的页面过渡动画（Apple 风格）
- ✅ 无障碍设计（Radix UI）
- ✅ 交互式宠物猫陪伴
- ✅ 实时进度跟踪

## 🐛 常见问题

### 依赖安装失败

```bash
# 清除缓存重新安装
rm -rf node_modules package-lock.json
npm install
```

### 端口被占用

修改 `vite.config.ts` 中的端口号：

```typescript
server: {
  port: 3001,  // 改为其他端口
  open: true,
}
```

### TypeScript 类型错误

确保安装了 TypeScript 类型定义：

```bash
npm install --save-dev @types/node @types/react @types/react-dom
```

## 📝 开发注意事项

1. **使用 TypeScript**: 所有新组件请使用 `.tsx` 扩展名
2. **遵循 ESLint 规则**: 保持代码风格一致
3. **组件复用**: 优先使用 `src/components/ui/` 中的基础组件
4. **样式规范**: 使用 Tailwind CSS 类名，避免内联样式
5. **国际化**: 在组件中支持 `language` prop（'zh' | 'en'）

## 🔗 相关文档

- [React 文档](https://react.dev/)
- [Vite 文档](https://vitejs.dev/)
- [Radix UI](https://www.radix-ui.com/)
- [Lucide Icons](https://lucide.dev/)
- [Motion 动画库](https://motion.dev/)

## 📄 许可证

本项目为内部使用，版权所有。

---

**需要帮助？** 请查看 `src/guidelines/Guidelines.md` 了解更多设计和开发指南。
