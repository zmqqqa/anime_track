# AnimeTrack

一个个人用的动漫追番记录工具，用来管理自己看过、在看和想看的番剧。

项目代码完全由 AI 生成。

## 能做什么

### 追番管理

记录每一部番剧的观看状态（在看、已看完、已弃坑、计划看），跟踪集数进度。每次更新进度时会自动写入观看历史，不用额外操作。

### 仪表盘

首页是一个数据面板，可以看到：

- 各状态的番剧数量（饼图）
- 连续追番天数
- 每周观看速度
- 最近观看动态

### 番剧详情

每部番剧有独立的详情页，包含封面、简介、评分、标签、声优、首播日期等信息。这些信息可以手动填，也可以用 AI 一键补全。

### 时间线

按时间顺序回顾自己的观看记录，可以看到某一天看了哪些番的哪几集。

### 季度视图 & 图鉴

按播出季度（如 2024 年 1 月新番）分组浏览，或者在图鉴模式下以封面墙的形式总览所有番剧。

### AI 元数据补全

录入番剧时只需要输入名字（甚至可以用自然语言，比如"我之前看完了摇曳露营第一季"），系统会自动从 Bangumi 数据库和 AI 补全封面、日文原名、集数、简介、声优等信息。

### 登录与权限

支持本地账号登录，区分管理员和访客。访客可以浏览，管理员可以增删改。

## 快速开始

需要 Node.js 20+ 和 MySQL。

```bash
git clone https://github.com/zmqqqa/AnimeTrack.git
cd AnimeTrack
npm install
cp .env.example .env.local
# 编辑 .env.local，填上 MySQL 密码
npm run dev
```

然后浏览器打开 `http://localhost:3000/setup`，点一键初始化，再用 `guest / guest` 登录即可。

> 第一次部署？详细步骤见 [docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md)。

## 更多文档

| 文档 | 说明 |
|---|---|
| [本地部署指引](docs/LOCAL_SETUP.md) | 从零开始把项目跑起来，包含环境配置和常见问题 |
| [服务器部署](docs/DEPLOYMENT.md) | 部署到服务器、用 PM2 管理进程、日常更新流程 |
| [数据备份](docs/BACKUP.md) | 定时备份、手动备份、数据恢复 |
| [元数据维护](docs/METADATA_MAINTENANCE_PLAYBOOK.md) | 批量补全番剧信息的脚本用法 |
| [项目结构](docs/PROJECT_ARCHITECTURE.md) | 目录分工、数据表设计、数据流说明 |

## 技术栈

Next.js 14 / React 18 / TypeScript / Tailwind CSS / MySQL / NextAuth.js
