# 服务器部署指南

项目部署到服务器上的完整流程。

## 前置条件

服务器上需要有：

- Node.js 20+
- npm
- MySQL
- PM2（`npm install -g pm2`）
- Git

## 第一次部署

### 1. 克隆项目

```bash
cd /home/ubuntu
git clone https://github.com/zmqqqa/AnimeTrack.git anime_track
cd anime_track
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
nano .env.local
```

填上服务器的 MySQL 信息：

```bash
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=你的密码
MYSQL_DATABASE=anime_track
NEXTAUTH_URL=https://你的域名
NEXTAUTH_SECRET=生成一个随机密钥
GUEST_USERNAME=guest
GUEST_PASSWORD=guest
```

> 生成随机密钥：`openssl rand -base64 32`

### 3. 初始化数据库

两种方式，任选一种：

**方式 A：用网页初始化**

```bash
npm run dev
# 打开 http://服务器IP:3000/setup，点一键初始化
# 初始化完成后 Ctrl+C 停掉 dev
```

**方式 B：用命令行初始化**

```bash
npm run db:init-with-anime-data
```

### 4. 构建并启动

```bash
npm run build
pm2 start ecosystem.config.js
```

生产环境默认只监听 `127.0.0.1:3000`，需要通过 Nginx 这类反向代理对外提供 `80/443`，不要直接把 `3000` 暴露到公网。

### 5. 设置 PM2 开机自启

```bash
pm2 save
pm2 startup
# 按照输出的提示执行那条 sudo 命令
```

## 日常更新部署

本地开发完、代码推到 Git 之后，在服务器上跑一条命令就行：

```bash
npm run deploy:prod
```

这条命令会自动：

1. 检查工作区是不是干净的（有没有没提交的改动）
2. 拉最新代码
3. 如果依赖变了就重新安装
4. 构建
5. 重启 PM2
6. 做一次健康检查

如果要自定义分支或应用名：

```bash
DEPLOY_BRANCH=develop npm run deploy:prod
```

## PM2 常用操作

```bash
pm2 status                    # 看运行状态
pm2 logs anime-track          # 看日志
pm2 logs anime-track --lines 100   # 看最近 100 行日志
pm2 restart anime-track       # 重启
pm2 stop anime-track          # 停止
pm2 delete anime-track        # 删除进程
```

如果修改了 `ecosystem.config.js` 里的运行模式或监听地址，建议先删除旧进程再按配置重建，避免沿用旧的 PM2 mode：

```bash
pm2 delete anime-track
pm2 start ecosystem.config.js
```

## 改了 .env.local 之后怎么刷新

改完 `.env.local` 之后，需要重启服务才能生效。

**如果是生产环境（PM2 管理的）：**

```bash
pm2 restart ecosystem.config.js --only anime-track --update-env
```

`--update-env` 会让 PM2 重新读取环境变量。

**如果是开发模式：**

直接 `Ctrl+C` 停掉 `npm run dev`，然后重新跑。Next.js 的 dev 模式不会自动读取改过的 `.env.local`，必须重启。

**如果只改了前端不涉及环境变量：**

开发模式下会自动热更新，不用重启。

## 部署注意事项

- **不要在生产服务器上直接改代码**。改代码应该在本地改，测好了推到 Git，然后在服务器上 `npm run deploy:prod`。因为构建过程中 `.next` 目录会处于半成品状态，这时候 PM2 如果重启就会挂。
- 如果部署失败了，可以先看看 `pm2 logs`，一般能看到具体报错。
- `ecosystem.config.js` 里限制了内存 300M，超过会自动重启，正常使用够了。

## 配合定时备份

部署到服务器后建议配合定时备份一起用，具体看 [BACKUP.md](BACKUP.md)。
