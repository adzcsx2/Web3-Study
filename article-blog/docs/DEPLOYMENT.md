# Next.js 多环境部署指南

## 🎯 项目概述

本项目支持多环境部署，包括开发、测试和生产环境。

## 📁 环境配置文件

-  `.env.development` - 开发环境配置
-  `.env.test` - 测试环境配置
-  `.env.production` - 生产环境配置

## 🚀 构建命令

### 开发环境

```bash
npm run dev                    # 开发模式启动
```

### 测试版构建

```bash
npm run build:test             # 构建测试版
npm run start:test             # 启动测试版 (端口: 3001)

# 或者使用部署脚本
./deploy.sh local-test
```

### 生产版构建

```bash
npm run build:production       # 构建生产版
npm run start:production       # 启动生产版 (端口: 3000)

# 或者使用部署脚本
./deploy.sh local-production
```

## 🖥️ 服务器部署

### 前提条件

服务器需要安装：

-  Node.js (>= 18.0.0)
-  PM2 (进程管理器)
-  Nginx (可选，用于反向代理)

```bash
# 安装 PM2
npm install -g pm2

# 安装 Nginx (Ubuntu/Debian)
sudo apt install nginx
```

### 部署步骤

1. **修改部署脚本配置**
   编辑 `deploy.sh` 文件中的服务器信息：

   ```bash
   SERVER_USER="your-username"      # 服务器用户名
   SERVER_HOST="your-server-ip"     # 服务器IP地址
   SERVER_PATH="/var/www/app"       # 部署路径
   ```

2. **部署测试版**

   ```bash
   ./deploy.sh test
   ```

3. **部署生产版**
   ```bash
   ./deploy.sh production
   ```

### 手动部署步骤

如果不使用自动部署脚本，可以手动执行以下步骤：

#### 1. 本地构建

```bash
# 测试版
npm run build:test

# 生产版
npm run build:production
```

#### 2. 创建部署包

```bash
# 打包必要文件
tar -czf deployment.tar.gz \
    .next/ \
    public/ \
    package.json \
    package-lock.json \
    next.config.ts \
    .env.test \
    .env.production \
    ecosystem.config.json
```

#### 3. 上传到服务器

```bash
scp deployment.tar.gz user@server:/var/www/app/
```

#### 4. 服务器部署

```bash
# 连接到服务器
ssh user@server

# 解压文件
cd /var/www/app
tar -xzf deployment.tar.gz

# 安装依赖
npm ci --production

# 启动服务（直接使用对应环境的配置文件）
pm2 start ecosystem.config.json --only app-test        # 测试版
# 或
pm2 start ecosystem.config.json --only app-production  # 生产版
```

## 🔧 PM2 管理命令

```bash
# 查看所有进程
pm2 list

# 查看测试版日志
pm2 logs app-test

# 查看生产版日志
pm2 logs app-production

# 重启服务
pm2 restart app-test
pm2 restart app-production

# 停止服务
pm2 stop app-test
pm2 stop app-production

# 删除进程
pm2 delete app-test
pm2 delete app-production

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup
```

## 🌐 Nginx 配置 (可选)

创建 Nginx 配置文件 `/etc/nginx/sites-available/app`:

```nginx
# 测试版配置
server {
    listen 80;
    server_name test.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# 生产版配置
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 📊 环境对比

| 环境 | 端口 | API 地址             | 调试模式 | 进程数 | PM2 进程名     |
| ---- | ---- | -------------------- | -------- | ------ | -------------- |
| 开发 | 3000 | dev-api.example.com  | ✅       | 1      | -              |
| 测试 | 3001 | test-api.example.com | ✅       | 1      | app-test       |
| 生产 | 3000 | api.example.com      | ❌       | max    | app-production |

## 📝 注意事项

1. **环境变量**：确保各环境的 API 地址和密钥配置正确
2. **端口冲突**：测试版使用 3001 端口，生产版使用 3000 端口
3. **日志管理**：PM2 会自动管理日志轮换，定期清理旧日志
4. **备份策略**：每次部署前会自动备份当前版本
5. **权限设置**：确保服务器用户有足够权限访问部署目录
6. **防火墙**：确保服务器防火墙允许相应端口访问

## 🔍 故障排查

### 常见问题

1. **构建失败**

   ```bash
   # 清理缓存重新构建
   rm -rf .next node_modules package-lock.json
   npm install
   npm run build:production
   ```

2. **PM2 进程无法启动**

   ```bash
   # 检查端口占用
   netstat -tlnp | grep :3000

   # 查看详细错误日志
   pm2 logs book-system-production --lines 50
   ```

3. **环境变量未生效**
   -  确认对应环境的配置文件（`.env.test` 或 `.env.production`）是否存在且配置正确
   -  重启 PM2 进程
   ```bash
   pm2 restart book-system-production
   ```
