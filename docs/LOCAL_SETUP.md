# 本地部署指引

这份文档面向不太熟悉代码或前端项目的人，目标是把项目 clone 到本地后，尽快跑起来并看到带示例数据的页面。

## 你需要准备什么

1. Node.js 20 或更高版本
2. npm
3. 一个本地 MySQL 实例

如果你没有 MySQL，这个项目暂时还不能直接“零配置打开就看”。但你不需要手动执行 SQL，只要把 MySQL 跑起来即可。

## 第一步：克隆项目

```bash
git clone https://github.com/zmqqqa/AnimeTrack.git
cd AnimeTrack
```

## 第二步：安装依赖

```bash
npm install
```

## 第三步：准备环境变量

复制一份环境变量模板：

```bash
cp .env.example .env.local
```

至少把下面这些值填好：

```bash
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=你的 MySQL 密码
MYSQL_DATABASE=anime_track
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=随便生成一段随机字符串
GUEST_USERNAME=guest
GUEST_PASSWORD=guest
```

说明：

1. `AI_API_KEY` 可以先不填（也兼容旧的 `DEEPSEEK_API_KEY`）
2. 不填 AI key 也能打开页面、登录、导入示例数据
3. 只是 AI 补全功能暂时不会工作

## 第四步：启动项目

```bash
npm run dev
```

启动后，打开：

```text
http://localhost:3000/setup
```

## 第五步：一键初始化数据库

在 `/setup` 页面点击：

```text
一键初始化数据库与示例数据
```

它会自动完成这三件事：

1. 创建 `MYSQL_DATABASE`
2. 执行 [database/schema.sql](../database/schema.sql)
3. 导入 [database/seed_anime_data.sql](../database/seed_anime_data.sql)

示例数据只包含：

1. `anime`
2. `watch_history`

不会导入：

1. `users`

## 第六步：登录查看页面

初始化完成后，打开：

```text
http://localhost:3000/login
```

使用访客账号登录：

```text
用户名: guest
密码: guest
```

这样你就能直接看到已经带内容的页面。

## 如果没找到入口

你可以直接访问下面这个地址：

```text
http://localhost:3000/setup
```

此外，项目里也提供了两个可见入口：

1. 登录页底部的“打开初始化向导 /setup”
2. 侧边栏底部的“本地初始化 /setup”按钮

## 常见问题

### 1. 页面能打开，但初始化失败

通常是 `.env.local` 里的 MySQL 配置不对。

优先检查：

1. `MYSQL_HOST`
2. `MYSQL_PORT`
3. `MYSQL_USER`
4. `MYSQL_PASSWORD`
5. `MYSQL_DATABASE`

### 2. MySQL 有了，但还是建库失败

说明你当前 MySQL 用户没有创建数据库的权限。

这时可以手动先建库：

```sql
CREATE DATABASE anime_track CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

然后回到 `/setup` 页面再点一次初始化。

### 3. 不想用访客登录

也可以到注册页自己创建一个账号：

```text
http://localhost:3000/register
```

## 最短路径版

如果你只想最快看到页面：

```bash
git clone https://github.com/zmqqqa/AnimeTrack.git
cd AnimeTrack
npm install
cp .env.example .env.local
npm run dev
```

然后浏览器打开：

```text
http://localhost:3000/setup
```

点一下初始化，再用 `guest / guest` 登录。