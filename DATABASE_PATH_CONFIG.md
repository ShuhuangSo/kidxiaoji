# 数据库路径配置说明

## 问题分析

**问题：本地和服务器有相同的 ./db/database.db 文件，但数据不一样**

这个问题的根本原因是数据库文件路径配置不一致：

1. **Docker Compose 配置**：在 <mcfile name="docker-compose.yml" path="/Users/sushuhuang/Documents/code/kid/docker-compose.yml"></mcfile> 中，数据库目录被挂载为：
   ```yaml
   volumes:
     - ./db:/app/db
   ```
   这意味着容器内的 `/app/db` 目录映射到宿主机的 `./db` 目录。

2. **应用代码配置**：在 <mcfile name="db.ts" path="/Users/sushuhuang/Documents/code/kid/src/lib/db.ts"></mcfile> 中，数据库文件路径被设置为：
   ```typescript
   const DB_PATH = './database.db';
   ```
   这导致应用实际上在容器的根目录 `/app` 下创建和使用数据库文件，而不是在挂载的 `/app/db` 目录中。

## 修复方案

已将 <mcfile name="db.ts" path="/Users/sushuhuang/Documents/code/kid/src/lib/db.ts"></mcfile> 中的数据库路径修改为：
```typescript
const DB_PATH = './db/database.db';
```

这样应用就会使用正确的挂载目录中的数据库文件，确保本地和服务器数据的一致性。

## 数据同步建议

1. **数据迁移**：如果之前在容器根目录的数据库文件中有重要数据，需要将其迁移到正确的挂载位置。

2. **重新部署**：修改后需要重新构建并部署应用：
   ```bash
   ./deploy.sh
   ```

3. **验证数据**：部署后检查应用是否正确读取挂载目录中的数据库文件。

## 最佳实践

1. **路径一致性**：确保代码中的文件路径与 Docker 挂载配置保持一致。

2. **环境配置**：考虑使用环境变量来配置数据库路径，使其更加灵活。

3. **定期备份**：为重要数据建立定期备份机制。