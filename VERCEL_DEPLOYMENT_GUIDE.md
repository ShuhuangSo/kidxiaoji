# Vercel部署详细指南

## 项目概述

本项目是一个基于Next.js的儿童成长激励系统，使用SQLite作为数据库。在部署到Vercel时，需要注意SQLite在无服务器环境中的特殊限制。

## 准备工作

### 1. 版本控制设置

```bash
# 确保Git仓库已初始化
# 如果未初始化，请运行：
git init

# 确保已添加.gitignore文件
# 我们已创建了一个包含常见忽略项的.gitignore文件

# 提交所有文件
git add .
git commit -m "初始提交"
```

### 2. 创建远程仓库

在GitHub、GitLab或Bitbucket上创建一个新的空仓库，然后将本地仓库连接到远程仓库：

```bash
git remote add origin 您的仓库地址
git push -u origin main
```

## Vercel部署步骤

### 1. 登录Vercel

访问 [Vercel官网](https://vercel.com) 并使用您的Git账户登录。

### 2. 导入项目

- 点击右上角的"New Project"按钮
- 选择"Import from Git Repository"
- 从列表中选择您的项目仓库
- 点击"Import"

### 3. 配置项目设置

- **项目名称**: 可自定义或使用默认值
- **Framework Preset**: 选择"Next.js"
- **Root Directory**: 保持默认 `/`
- **Build Command**: 保持默认 `npm run build`
- **Output Directory**: 保持默认 `.next`

### 4. 配置环境变量

目前项目使用SQLite数据库，不需要额外的数据库配置。如果需要，可以添加以下环境变量：

| 环境变量 | 描述 | 默认值 |
|---------|------|--------|
| NODE_ENV | 运行环境 | production |
| NEXT_PUBLIC_API_URL | API基础URL | 空（使用相对路径） |

### 5. 部署项目

点击"Deploy"按钮，Vercel将开始构建和部署过程。部署完成后，您将获得一个URL来访问您的应用。

## SQLite在Vercel上的限制

**重要提示**：Vercel是一个无服务器平台，具有以下限制，这会影响SQLite的使用：

1. **临时文件系统**：
   - Vercel的文件系统是临时的，每次部署或函数调用后数据可能会丢失
   - SQLite数据库文件存储在临时文件系统中，不能保证数据持久化

2. **并发限制**：
   - 无服务器函数在不同实例上运行，可能会导致数据库锁和冲突

3. **冷启动问题**：
   - 每次请求可能会触发新的函数实例，导致数据库连接重建

## 数据库解决方案

### 选项1：迁移到外部数据库服务（推荐）

将SQLite迁移到以下外部数据库服务之一：

#### A. Supabase（PostgreSQL）

1. **创建Supabase项目**：
   - 访问 [Supabase](https://supabase.com)
   - 创建一个新的项目
   - 获取连接字符串

2. **修改数据库连接**：
   - 安装`pg`和`@vercel/postgres`包：
     ```bash
     npm install pg @vercel/postgres
     ```
   - 更新`src/lib/db.ts`文件：
     ```typescript
     // 替换SQLite连接为PostgreSQL
     import { createClient } from '@vercel/postgres';
     
     const client = createClient({
       connectionString: process.env.POSTGRES_URL
     });
     
     export async function initDatabase() {
       await client.connect();
       // 其余初始化逻辑...
       return client;
     }
     ```

3. **添加环境变量**：
   - 在Vercel项目设置中添加`POSTGRES_URL`环境变量

#### B. Neon PostgreSQL

Neon提供与Vercel良好集成的PostgreSQL服务，具有全球分布式部署选项。

#### C. PlanetScale MySQL

PlanetScale提供无服务器MySQL服务，与Vercel有良好的集成。

### 选项2：使用Vercel Edge Functions和Edge Cache（实验性）

对于某些用例，可以使用Edge Functions和Edge Cache来实现部分数据持久化，但这不是完整的数据库解决方案。

### 选项3：使用第三方数据存储服务

- **MongoDB Atlas**：文档数据库服务
- **Firebase Firestore**：实时数据库服务
- **Redis Cloud**：键值存储服务

## 部署后验证

部署完成后，验证以下内容：

1. 访问应用URL，确保页面正常加载
2. 测试基本功能，如用户登录、任务查看等
3. 检查Vercel控制台中的部署日志，查看是否有错误

## 持续集成/持续部署

Vercel会自动检测仓库中的更改并重新部署应用。您可以：

1. 创建新的分支进行开发
2. 推送到远程仓库
3. 在Vercel中创建预览部署
4. 合并到主分支时自动部署到生产环境

## 监控和日志

使用Vercel的监控功能查看：

- 部署历史
- 构建日志
- 运行时日志
- 性能指标

## 故障排除

### 常见问题

1. **构建失败**：
   - 检查package.json中的依赖是否正确
   - 确保TypeScript编译没有错误
   - 查看构建日志以获取详细错误信息

2. **数据库连接错误**：
   - 如果使用外部数据库，检查连接字符串和环境变量
   - 确保数据库服务允许来自Vercel的连接

3. **页面加载问题**：
   - 检查Next.js路由配置
   - 验证API路由是否正确响应

## 注意事项

- 对于生产环境，强烈建议迁移到外部数据库服务
- 定期备份重要数据
- 监控应用性能，特别是在流量增加时
- 考虑使用Vercel Analytics来跟踪用户行为

## 后续优化

1. 实现数据库迁移脚本
2. 设置自动化测试
3. 配置自定义域名
4. 添加CDN缓存
5. 实现CI/CD管道