# 儿童成长激励系统 (Kid Growth Incentive System)

一个基于Next.js构建的儿童成长激励系统，帮助家长和孩子建立良好的习惯养成机制。

## 技术栈

- **前端框架**: Next.js 13.5.6
- **语言**: TypeScript 5.3.3
- **样式**: Tailwind CSS
- **数据库**: SQLite
- **UI组件**: React 18.2.0

## 功能特性

- 用户管理和认证
- 任务完成和奖励系统
- 积分和能量管理
- 连胜日历和奖励机制
- 虚拟物品背包系统
- 管理员后台

## 本地开发

### 安装依赖

```bash
npm install
```

### 运行开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 查看应用。

### 构建生产版本

```bash
npm run build
```

## Vercel部署流程

### 准备工作

1. **创建GitHub/GitLab/Bitbucket仓库**
   - 登录您的GitHub账户
   - 创建一个新的空仓库
   - 复制仓库的HTTPS或SSH地址

2. **将本地项目推送到远程仓库**
   ```bash
   git remote add origin 您的仓库地址
   git add .
   git commit -m "初始提交"
   git push -u origin main
   ```

3. **准备环境变量**
   - 项目使用SQLite数据库，不需要额外的数据库配置
   - 如需要自定义配置，可创建环境变量文件

### Vercel部署步骤

1. **登录Vercel**
   - 访问 https://vercel.com/
   - 使用您的GitHub/GitLab/Bitbucket账户登录

2. **导入项目**
   - 点击"New Project"或"Import Project"
   - 选择"Import from Git Repository"
   - 从您的仓库列表中选择刚创建的仓库

3. **配置项目设置**
   - 项目名称: 可保持默认或自定义
   - Framework Preset: 选择"Next.js"
   - 构建命令: 保持默认 `npm run build`
   - 输出目录: 保持默认 `.next`
   - 根目录: 保持默认 `/`

4. **配置环境变量（可选）**
   - 如果您的项目需要环境变量，可以在"Environment Variables"部分添加
   - 例如: `NODE_ENV=production`

5. **点击"Deploy"**
   - Vercel将自动开始构建和部署过程
   - 部署完成后，您将获得一个URL

### 部署后配置

1. **访问部署的应用**
   - 部署完成后，点击提供的URL访问您的应用

2. **设置自定义域名（可选）**
   - 在Vercel项目设置中，进入"Domains"部分
   - 添加您的自定义域名并按照指引配置DNS

3. **监控和日志**
   - 在Vercel控制台查看部署日志和性能监控

### 注意事项

- **SQLite在Vercel上的限制**：
  - Vercel是无服务器平台，文件系统是临时性的
  - SQLite数据不会持久保存，生产环境建议迁移到外部数据库服务
  - 推荐使用Supabase、Neon PostgreSQL或PlanetScale MySQL

- **数据库迁移建议**：
  - 将SQLite数据导出
  - 在外部数据库服务中创建相同的表结构
  - 更新`src/lib/db.ts`中的数据库连接配置

## 维护和更新

1. **更新项目**
   - 在本地开发并测试更改
   - 提交更改到Git仓库
   - Vercel将自动检测更改并重新部署

2. **监控应用状态**
   - 使用Vercel的监控功能查看应用性能
   - 检查日志以排查任何问题

## 许可证

MIT License