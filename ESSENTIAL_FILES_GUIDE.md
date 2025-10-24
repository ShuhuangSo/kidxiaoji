# 项目部署必备文件清单

本文档列出了 kid-growth-incentive-system 项目部署时必需的核心文件和文件夹，帮助您了解哪些是运行项目必不可少的组件。

## 一、核心配置文件

这些是项目运行和构建所必需的配置文件：

1. **package.json** - 定义项目依赖、脚本命令和元数据
2. **next.config.js** - Next.js 应用配置文件
3. **tsconfig.json** - TypeScript 配置文件
4. **next-env.d.ts** - Next.js 类型声明文件
5. **postcss.config.js** - PostCSS 配置（Tailwind CSS 依赖）
6. **tailwind.config.js** - Tailwind CSS 配置
7. **.gitignore** - Git 忽略规则文件（版本控制必需）

## 二、源代码目录

### 1. src/app/
Next.js App Router 架构的核心目录，包含页面、API 和布局：

- **src/app/layout.tsx** - 应用根布局组件
- **src/app/page.tsx** - 主页组件
- **src/app/api/** - API 路由（登录、用户数据等）
- **src/app/components/** - 页面级别组件
- **src/app/globals.css** - 全局样式

### 2. src/lib/
核心功能库和工具：

- **src/lib/db.ts** - 数据库连接和操作
- **src/lib/levelUtils.ts** - 等级计算工具
- **src/lib/system-settings.ts** - 系统设置

### 3. src/components/
可复用组件：

- **src/components/LotterySlotMachine.tsx** - 抽奖老虎机组件
- **src/components/LotteryWheel.tsx** - 抽奖转盘组件
- **src/components/icons.tsx** - 图标组件

## 三、静态资源

- **public/** - 静态资源文件夹
  - **public/avatars/** - 用户头像文件

## 四、数据库相关

- **db/** - SQLite 数据库文件目录（数据持久化必需）
- **src/lib/migrate-db.js** - 数据库迁移脚本

## 五、部署配置文件

根据部署方式不同，以下文件可选：

### Docker 部署
- **Dockerfile** - 容器构建文件
- **docker-compose.yml** - Docker Compose 配置

### Vercel 部署
- **VERCEL_DEPLOYMENT_GUIDE.md** - Vercel 部署指南（文档，非运行必需）

### Ubuntu 服务器部署
- **UBUNTU_DEPLOYMENT_GUIDE.md** - Ubuntu 部署指南（文档，非运行必需）

## 六、可选/非必需文件

以下文件在部署时通常不是必需的，可以根据需要决定是否包含：

1. **README.md** - 项目说明文档
2. **DOCKER_COMPOSE_DEPLOYMENT_GUIDE.md** - Docker Compose 部署指南
3. **cleanup_test_files.sh** - 测试文件清理脚本
4. **create_lottery_tables_manually.sql** - 手动创建表的 SQL 脚本
5. **tsconfig.tsbuildinfo** - TypeScript 构建缓存信息
6. **技术栈选择分析.md** 和 **项目顶层定义文档.md** - 项目分析文档
7. **test/** 和 **test-demo/** - 测试相关目录

## 七、最小部署集合

如果要创建最小化部署包，确保包含以下内容：

```
项目根目录/
├── package.json
├── next.config.js
├── tsconfig.json
├── next-env.d.ts
├── postcss.config.js
├── tailwind.config.js
├── public/
│   └── avatars/ （如果应用需要）
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── api/
│   │   └── globals.css
│   ├── lib/
│   │   ├── db.ts
│   │   └── [其他核心工具文件]
│   └── components/
│       └── [必要的UI组件]
├── db/ （如果使用SQLite）
└── .env （包含必要的环境变量）
```

## 八、环境变量

创建 `.env` 文件并配置以下必要的环境变量（如果项目需要）：

```
# 数据库路径（SQLite）
DATABASE_URL="./db/database.db"

# 会话密钥（用于安全性）
SECRET_KEY="your-secret-key-here"

# 其他项目特定的环境变量
```

---

通过只包含上述必要文件，您可以显著减小部署包的大小，同时确保项目能够正常运行。具体哪些文件是必需的，可能会根据项目的具体实现和功能需求有所调整。