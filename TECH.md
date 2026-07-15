# TA Assistant 技术文档

> 更新日期：2026-07-14

## 1. 项目概述

TA Assistant 是面向英语培训机构助教的工作效率工具，覆盖助教日常工作全流程：班级管理、学生管理、成绩记录、课中反馈撰写、照片管理、数据推送、资料库管理。

支持桌面端（PC）和移动端（手机）双端使用，采用响应式布局 + 独立路由的方式实现。

## 2. 技术栈

| 层级 | 技术选型 |
|------|----------|
| 前端框架 | React 19 + TypeScript |
| 构建工具 | Vite 6 |
| 样式方案 | Tailwind CSS v4 + 自定义 CSS 变量设计系统 |
| 状态管理 | Zustand |
| 本地缓存 | Dexie.js (IndexedDB) |
| 路由 | react-router-dom |
| UI 组件 | shadcn/ui（按需使用） |
| 后端 | Cloudflare Workers + itty-router |
| 数据库 | Cloudflare D1 (SQLite) |
| 文件存储 | Cloudflare R2 |
| 部署 | Cloudflare Pages |

## 3. 项目结构

```
src/
  components/          # 公共组件
    DesktopLayout.tsx  # 桌面端布局（侧边栏导航）
    MobileLayout.tsx   # 移动端布局（底部 Tab 导航）
    LoginPage.tsx      # 登录/注册页（含开发模式跳过）
    StudentSelector.tsx # 学生选择器
    Toast.tsx          # Toast 提示
  pages/
    desktop/           # 桌面端页面
      DesktopDashboard.tsx   # 仪表盘
      DesktopClasses.tsx     # 班级管理（CRUD）
      DesktopStudents.tsx    # 学生管理
      DesktopScores.tsx      # 成绩管理
      DesktopFeedback.tsx    # 反馈管理（AI 3步流）
      DesktopPhotos.tsx      # 照片管理
      DesktopPush.tsx        # 数据推送
      DesktopLibrary.tsx     # 资料库
      DesktopSettings.tsx    # 设置
    mobile/            # 移动端页面
      MobileHome.tsx         # 首页
      MobileClasses.tsx      # 班级管理（CRUD + 学生管理）
      MobileScores.tsx       # 成绩录入
      MobileCamera.tsx       # 拍照上传
      MobileFeedback.tsx     # 反馈管理（AI 3步流）
      MobilePush.tsx         # 数据推送
      MobileLibrary.tsx      # 资料库
  stores/
    useAppStore.ts     # Zustand 全局状态
  hooks/
    useStudents.ts     # 学生数据加载（含 IndexedDB 缓存）
    useIsMobile.ts     # 移动端检测
  services/
    api.ts             # API 客户端（全类型）
    aiGenerator.ts     # AI 反馈生成服务
  types/
    index.ts           # TypeScript 类型定义
  workers/             # Cloudflare Workers 后端
    index.ts           # Worker 入口
    middleware/auth.ts # JWT 认证中间件
    routes/            # API 路由
      auth.ts, classes.ts, students.ts, sessions.ts,
      scores.ts, feedback.ts, photos.ts
  db/
    index.ts           # Dexie IndexedDB 配置
  data/
    templates.ts       # 反馈模板数据（已弃用，AI 生成取代）
```

## 4. 数据库设计（D1 Schema）

```sql
-- 用户表
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 班级表
CREATE TABLE classes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  semester TEXT, -- spring/summer/autumn/winter
  schedule_mode TEXT, -- weekly/continuous
  schedule_config TEXT, -- JSON
  total_sessions INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 学生表
CREATE TABLE students (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  name TEXT NOT NULL,
  student_id TEXT,
  phone TEXT,
  parent_name TEXT,
  note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 课次表
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  session_number INTEGER NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  status TEXT DEFAULT 'upcoming' -- upcoming/today/done/absent
);

-- 成绩表
CREATE TABLE scores (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  score REAL,
  time_used INTEGER,
  attendance TEXT DEFAULT 'present', -- present/absent/late/leave
  online_homework INTEGER DEFAULT 0,
  offline_homework INTEGER DEFAULT 0,
  note TEXT
);

-- 反馈表
CREATE TABLE feedback (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  content TEXT NOT NULL,
  template_type TEXT DEFAULT 'ai',
  char_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft', -- draft/pushed/failed
  created_at TEXT DEFAULT (datetime('now'))
);

-- 照片表
CREATE TABLE photos (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  type TEXT NOT NULL, -- homework/quiz
  blob_key TEXT NOT NULL,
  thumbnail_url TEXT,
  width INTEGER,
  height INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 推送状态表
CREATE TABLE push_status (
  session_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  photo_status TEXT DEFAULT 'pending', -- pending/pushed/failed
  feedback_status TEXT DEFAULT 'draft', -- draft/pushed/failed
  pushed_at TEXT,
  PRIMARY KEY (session_id, student_id)
);

-- 资料库资源表
CREATE TABLE resources (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- link/doc/word/ppt/pdf/excel/image/other
  category TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  file_size TEXT,
  tags TEXT, -- JSON array
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

## 5. API 设计

使用 itty-router 进行路由分发，所有 API 返回 `ApiResponse<T>` 格式：

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### 路由列表

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/register | 注册 |
| POST | /api/auth/login | 登录（返回 JWT） |
| GET | /api/auth/me | 获取当前用户 |
| GET | /api/classes | 获取班级列表 |
| POST | /api/classes | 创建班级 |
| PUT | /api/classes/:id | 更新班级 |
| DELETE | /api/classes/:id | 删除班级 |
| GET | /api/classes/:id/students | 获取班级学生 |
| POST | /api/students | 添加学生 |
| PUT | /api/students/:id | 更新学生 |
| DELETE | /api/students/:id | 删除学生 |
| GET | /api/sessions | 获取课次列表 |
| GET | /api/scores | 获取成绩 |
| POST | /api/scores/batch | 批量录入成绩 |
| GET | /api/feedback | 获取反馈列表 |
| POST | /api/feedback | 保存反馈 |
| POST | /api/photos/upload | 上传照片（R2） |
| GET | /api/photos | 获取照片列表 |
| POST | /api/ai/chat | AI 聊天代理（转发豆包 API） |

## 6. 前端设计系统

基于 CSS 变量的设计系统，定义在 `src/index.css`：

```css
:root {
  --primary: #4F46E5;
  --primary-dark: #4338CA;
  --primary-light: #818CF8;
  --primary-lighter: #EEF2FF;
  --danger: #EF4444;
  --danger-light: #FEE2E2;
  --success: #10B981;
  --warning: #F59E0B;
  --info: #3B82F6;
  --bg: #F8FAFC;
  --bg-white: #FFFFFF;
  --border: #E2E8F0;
  --border-light: #F1F5F9;
  --text-primary: #1E293B;
  --text-secondary: #64748B;
  --text-muted: #94A3B8;
}
```

### 核心 CSS 类

- `.d-panel` / `.d-panel-header` / `.d-panel-body` — 桌面面板
- `.d-table` — 桌面表格
- `.d-btn` / `.d-btn-primary` / `.d-btn-outline` / `.d-btn-ghost` — 按钮
- `.d-stats-grid` — 统计卡片网格
- `.d-toolbar` — 工具栏
- `.m-card` — 移动端卡片
- `.m-btn` / `.m-btn-primary` / `.m-btn-outline` — 移动端按钮
- `.progress-bar` / `.progress-fill` — 进度条
- `.tag` / `.tag-primary` — 标签

## 7. Phase 1 功能清单（已实现）

### 7.1 认证与布局

- [x] JWT 登录/注册
- [x] 开发模式跳过登录（方便本地调试）
- [x] 桌面端侧边栏导航（9个菜单项）
- [x] 移动端底部 Tab 导航（7个标签）
- [x] 响应式路由自动跳转（/ → /mobile 或 /desktop）

### 7.2 班级管理（桌面端 + 移动端）

- [x] 班级列表展示
- [x] 班级新增（弹窗表单）
- [x] 班级编辑
- [x] 班级删除
- [x] 班级详情（课程进度、排课、学生管理 3 个 Tab）
- [x] 排课模式：按周/连续日期
- [x] 统计卡片（班级数、学生数等）
- [x] 搜索/筛选工具栏

### 7.3 学生管理（桌面端 + 移动端）

- [x] 学生列表
- [x] 学生新增（姓名、学号、电话、家长、备注）
- [x] 学生编辑
- [x] 学生删除
- [x] 与班级关联

### 7.4 成绩管理

- [x] 小测成绩录入
- [x] 用时记录
- [x] 出勤状态（出勤/缺勤/迟到/请假）
- [x] 线上/线下作业完成情况
- [x] 桌面端表格展示
- [x] 移动端快捷输入

### 7.5 照片管理

- [x] 模拟拍照界面（作业/小测分类）
- [x] 照片网格展示
- [x] 拍照成功动画

### 7.6 AI 智能反馈生成（桌面端 + 移动端）

**3 步生成流程：**

1. **课程内容设置**：输入本节课的课程内容（如 Unit 5 Reading 词汇句型等）
2. **课堂表现填写**：为每个学生独立选择表现等级 + 填写简要表现描述
   - 5 种表现等级：表现优秀 / 表现良好 / 需要提升 / 缺勤请假 / 明显进步
   - 快捷描述标签一键填入
   - 填写进度条可视化
3. **一键批量生成**：AI 根据课程内容 + 每个学生的不同表现生成个性化反馈
   - 生成进度动画
   - 逐个查看/编辑/重新生成/复制
   - 「保存并下一个」快速流转
   - 字数统计与预警（150字标准）

### 7.7 资料库（桌面端 + 移动端）

- [x] 8 种资源类型：链接、文档、Word、PPT、PDF、Excel、图片、其他
- [x] 7 个分类：全部、答案库、模板资料、常用网站、教材课件、教研资料、其他
- [x] 资源新增/编辑/删除
- [x] 搜索 + 类型筛选
- [x] 桌面端：网格/列表双视图
- [x] 移动端：分类横向滚动 + 卡片列表
- [x] **点击卡片打开资源**：有链接直接跳转，无链接打开详情预览弹窗
- [x] 详情预览：显示完整信息、标签、链接地址，支持「打开链接」和「编辑」

### 7.8 数据推送

- [x] 推送计划展示
- [x] 推送状态统计（照片/反馈推送状态）
- [x] 进度条动画

## 8. AI 集成架构（Phase 2）

### 8.1 豆包大模型接入

通过 Cloudflare Workers 代理转发前端请求到豆包 API，API Key 存储在 Workers 环境变量中，不暴露到浏览器端。

```
前端 aiGenerator.ts → api.ts (POST /api/ai/chat) → Workers ai.ts → 豆包 API (ark.cn-beijing.volces.com)
```

### 8.2 豆包 API 配置

| 环境 | 配置方式 | 说明 |
|------|----------|------|
| 本地开发 | `.dev.vars` 文件 | 填写 `DOUBAO_API_KEY` 和 `DOUBAO_MODEL_ID` |
| 生产部署 | `wrangler secret` | `wrangler secret put DOUBAO_API_KEY` |

### 8.3 Prompt 工程

反馈生成的 prompt 分为两层：

- **System Prompt**：定义角色（英语培训机构助教）、字数要求（150-200字）、语言风格、内容结构、按表现等级个性化
- **User Prompt**：包含课程内容、学生姓名、表现等级、课堂表现描述、额外要求

### 8.4 降级策略

当豆包 API 不可用时（网络错误、API Key 未配置等），自动降级到本地模板拼接兜底，确保功能不中断。

### 8.5 可用模型

| 模型 ID | 名称 | 特点 |
|---------|------|------|
| `doubao-1-5-pro-32k` | Doubao 1.5 Pro | 旗舰模型，生成质量最高 |
| `doubao-1-5-lite-32k` | Doubao 1.5 Lite | 轻量模型，响应更快 |
| `doubao-pro-32k` | Doubao Pro | 通用版本，性价比高 |
| 自定义 Endpoint ID | - | 在火山方舟控制台创建 |

## 9. Phase 2 规划（剩余）

| 功能 | 说明 |
|------|----------|
| ~~真实 AI API 接入~~ | ✅ 已完成 — 接入豆包（火山方舟）大模型 API |
| 照片真实上传 | 接入 Cloudflare R2 存储，支持压缩/缩略图 |
| Chrome 扩展自动推送 | 开发浏览器扩展，自动将反馈填入机构网站对应位置 |
| 数据同步 | 前端 IndexedDB 与 D1 云端数据双向同步 |
| 导入/导出 | 支持 Excel 批量导入学生、导出成绩/反馈 |
| 考勤统计 | 自动生成考勤报表 |
| 家长端通知 | 推送完成后自动发送微信/短信通知 |

## 10. 注意事项

1. **Workers 类型隔离**：`src/workers` 目录使用 Cloudflare Workers 类型，与 React 类型冲突。在 `tsconfig.json` 中排除 `src/workers`，Worker 代码不经过前端 TypeScript 编译。
2. **Zustand setter 模式**：store 的 setter 使用直接赋值模式 `(list) => set({ list })`，不支持 callback 模式 `set(prev => ...)`。
3. **CSS 动画闭合标签**：添加 CSS 动画代码后务必检查 `</style>` 闭合标签，缺失会导致整个页面白屏。
4. **开发模式**：本地开发时点击登录页底部「开发模式（跳过登录）」按钮即可进入应用，默认跳转到移动端首页。
