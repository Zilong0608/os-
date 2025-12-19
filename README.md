# Mirror Studio - CVfoR1

**智能简历生成与职位匹配系统**

一个基于 AI 的全栈简历优化工具，帮助求职者根据目标职位生成定制化简历。

---

## 🎯 项目概述

CVfoR1 是一个智能简历工具，集成了：

- 📄 **简历解析** - 自动提取简历结构化信息
- 🤖 **AI 画像分析** - 深度理解候选人背景
- 🔍 **智能职位搜索** - 从 LinkedIn 和 Seek 聚合职位
- 🎯 **岗位匹配** - 计算候选人与职位的匹配度
- ✨ **简历优化** - 基于 JD 生成针对性简历
- 📦 **多格式导出** - 支持 DOCX 和 PDF

---

## 🏗️ 技术架构

### 后端
- **框架**: FastAPI (Python 3.10+)
- **AI**: OpenAI GPT (画像分析、简历润色)
- **爬虫**: Playwright + BeautifulSoup
- **文档处理**: python-docx, pdfminer.six
- **数据库**: Supabase (可选)

### 前端
- **框架**: React 18.3.1 + TypeScript
- **构建工具**: Vite 6.3.5
- **UI 组件**: Radix UI（无障碍组件库）
- **动画**: Motion (Framer Motion)
- **样式**: Tailwind CSS
- **图标**: Lucide React

---

## 🚀 快速开始

### 1. 环境要求

- **Python 3.10+** 和 pip
- **Node.js 18+** 和 npm
- **OpenAI API Key**（用于 AI 功能）

### 2. 安装依赖

#### 后端
```powershell
# 创建虚拟环境
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
Copy-Item .env.example .env
# 编辑 .env 并填入 GPT_API_KEY
```

#### 前端
```powershell
cd apps/ui
npm install
cd ..\..
```

### 3. 启动服务

#### 方法 1：使用批处理脚本（推荐）

```cmd
# 启动前端（新终端）
双击 启动前端.bat

# 启动后端（新终端）
双击 启动后端.bat
```

#### 方法 2：手动启动

**前端**（终端 1）：
```powershell
cd apps/ui
npm run dev
```
→ 访问 <http://localhost:3000>

**后端**（终端 2）：
```powershell
.\.venv\Scripts\Activate.ps1
uvicorn apps.api.main:app --reload --port 8000
```
→ API 地址 <http://localhost:8000>  
→ Swagger 文档 <http://localhost:8000/docs>

---

## 📁 项目结构

```
cv/
├── apps/                      # 应用程序
│   ├── api/                  # 后端 FastAPI 应用
│   │   └── main.py          # API 入口
│   └── ui/                   # 前端 React 应用
│       ├── src/
│       │   ├── App.tsx       # 主应用组件
│       │   ├── components/   # React 组件
│       │   └── styles/       # 样式文件
│       ├── package.json      # 前端依赖
│       └── vite.config.ts    # Vite 配置
│
├── modules/                   # 业务模块
│   ├── profile/              # 画像分析
│   ├── jobs/                 # 职位搜索
│   ├── jd/                   # JD 解析
│   ├── matching/             # 匹配引擎
│   └── resume/               # 简历生成
│
├── templates/                 # 简历模板
│   ├── resume-ats-en/        # ATS 友好模板
│   └── resume-visual-en/     # 视觉化模板
│
├── docs/                      # 文档
│   ├── 运行指南.md           # 完整运行指南
│   └── API_契约.md           # API 文档
│
├── requirements.txt           # Python 依赖
├── 启动前端.bat              # 前端启动脚本
├── 启动后端.bat              # 后端启动脚本
└── 迁移说明.md               # 前端迁移说明
```

---

## 🎨 应用功能

### 用户流程

1. **Landing Page** - 欢迎页面
2. **Step 1: 画像构建** - 上传简历或输入文本
3. **Step 2: 岗位推荐** - AI 推荐匹配职位
4. **Step 3: 职位检索** - 搜索 LinkedIn 和 Seek
5. **Step 4: 简历生成** - 生成定制简历并导出

### 特色功能

- ✅ **深色/浅色主题** - 自动保存偏好
- ✅ **中英文双语** - 无缝切换
- ✅ **实时搜索** - SSE 流式返回职位
- ✅ **智能匹配** - 计算候选人与 JD 的匹配度
- ✅ **简历润色** - AI 优化 bullet points
- ✅ **多格式导出** - DOCX / PDF
- ✅ **交互式 UI** - 流畅动画 + 宠物猫陪伴

---

## 📖 核心 API

### 画像分析
```http
POST /profile/analyze
Content-Type: application/json

{
  "profile": {
    "name": "Alice",
    "skills": ["Python", "FastAPI"],
    "experience": [...]
  }
}
```

### 职位搜索（流式）
```http
POST /jobs/stream
Content-Type: application/json

{
  "session_id": "test-001",
  "query": {
    "titles": ["Software Engineer"],
    "locations": ["AU"]
  },
  "allocation": {"linkedin": 5, "seek": 5},
  "limit": 10
}
```

### 简历生成
```http
POST /resume/preview
Content-Type: application/json

{
  "profile": {...},
  "template_id": "resume-ats-en",
  "language": "en"
}
```

完整 API 文档请访问：<http://localhost:8000/docs>

---

## 🔧 配置说明

### 环境变量（.env）

```env
# OpenAI API
GPT_API_KEY=sk-...                              # 必需
OPENAI_MODEL_WEB=gpt-5-nano-2025-08-07         # 可选
OPENAI_USE_WEB_TOOL=1                          # 可选

# Supabase（可选）
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=xxx
```

### 前端配置（vite.config.ts）

```typescript
server: {
  port: 3000,      // 前端端口
  open: true,      // 自动打开浏览器
}
```

---

## 📚 文档导航

| 文档 | 说明 |
|------|------|
| `docs/运行指南.md` | **完整的前后端运行指南** |
| `apps/ui/README.md` | 前端开发文档 |
| `迁移说明.md` | 前端迁移详细说明 |
| `docs/API_契约.md` | 后端 API 接口文档 |

---

## 🐛 常见问题

### 前端相关

**Q: npm install 失败？**
```bash
# 清除缓存重试
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**Q: 前端端口被占用？**
```typescript
// 修改 apps/ui/vite.config.ts
server: { port: 3001 }
```

### 后端相关

**Q: OpenAI API 调用失败？**
- 检查 `.env` 中的 `GPT_API_KEY` 是否正确
- 确认账户有余额

**Q: 职位搜索返回空？**
- 需要开通 OpenAI Web Search Tool
- 或使用本地 Mock 数据测试

**Q: PDF 导出失败？**
```bash
# 安装 Playwright
pip install playwright
python -m playwright install chromium
```

---

## 🎯 开发路线图

- [x] 基础画像分析
- [x] 职位搜索（LinkedIn + Seek）
- [x] 简历生成与导出
- [x] 现代化前端界面
- [x] 主题和语言切换
- [ ] 用户账户系统
- [ ] 简历历史管理
- [ ] 批量职位申请
- [ ] 求职进度跟踪

---

## 📄 许可证

本项目为内部使用，版权所有。

---

## 💡 技术支持

遇到问题？

1. 查看 `docs/运行指南.md`
2. 检查 Swagger 文档：<http://localhost:8000/docs>
3. 查看浏览器控制台和终端日志

---

**开发者**: Mirror Studio Team  
**版本**: 2.0 (现代化前端)  
**更新日期**: 2025-12-19

---

## 🚀 立即开始

```powershell
# 克隆项目后
pip install -r requirements.txt
cd apps/ui && npm install && cd ..\..

# 启动（双击）
启动前端.bat
启动后端.bat

# 访问
前端：http://localhost:3000
后端：http://localhost:8000/docs
```

**祝使用愉快！** 🎉

