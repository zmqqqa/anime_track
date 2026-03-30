# 数据备份与恢复

## 备份方式一览

| 方式 | 命令 | 说明 |
|---|---|---|
| 定时备份 | `npm run db:scheduled-backup` | 配合 cron 用，自动轮转旧文件 |
| 全量备份 | `npm run db:full-backup` | 手动跑，导出 anime + history + users |
| 种子导出 | `npm run db:export-anime-seed` | 导出 anime + history 到 Git 种子文件 |
| mysqldump | `node scripts/db/backup_db.js` | 用 mysqldump 做完整备份 |

## 定时备份（推荐）

定时备份脚本每次运行会导出 `anime` 和 `watch_history` 两张表，生成一个带时间戳的 SQL 文件，并自动删掉超出保留数量的旧备份。

### 手动跑一次试试

```bash
npm run db:scheduled-backup
```

备份文件会出现在 `backups/` 目录下，文件名类似 `scheduled-backup-2026-03-26_10-30-00.sql`。

### 配置 cron 定时执行

每天凌晨 3 点自动备份：

```bash
crontab -e
```

加一行：

```
0 3 * * * cd /home/ubuntu/anime_track && /usr/bin/node scripts/db/scheduled_backup.js >> logs/backup.log 2>&1
```

> 注意用 node 的绝对路径（`which node` 可以查到），cron 环境里不一定有 PATH。

### 保留多少份

默认保留最近 **10 份**备份。比如每天备份一次，就是保留 10 天。超过 10 份后，最早的会被自动删掉。

如果想改保留数量，可以在运行时传参数：

```bash
node scripts/db/scheduled_backup.js --keep 30       # 保留最近 30 份
node scripts/db/scheduled_backup.js --keep 5        # 只保留最近 5 份
```

在 cron 里也可以加 `--keep` 参数。

### 不备份用户表

定时备份默认只备份 `anime` 和 `watch_history`，不包含 `users` 表。这样备份文件不含密码哈希，比较安全。

如果需要连用户表一起备份，用全量备份命令：

```bash
npm run db:full-backup
```

## 手动备份

### 全量备份（含用户表）

```bash
npm run db:full-backup
```

导出 anime + watch_history + users 三张表到 `backups/` 目录。

不想包含用户表：

```bash
node scripts/db/export_full_backup.js --no-users
```

### 种子文件导出

```bash
npm run db:export-anime-seed
```

这个会导出到 `database/seed_anime_data.sql`，适合提交到 Git 仓库做版本控制。

## 恢复数据

### 从备份文件恢复

如果数据库出了问题，可以用备份文件恢复：

```bash
npm run db:apply-sql -- backups/scheduled-backup-2026-03-26_10-30-00.sql
```

这条命令会执行备份文件里的 SQL，覆盖掉当前的 anime 和 watch_history 数据。

> **注意**：恢复操作会先清空再写入，执行前确认你选对了文件。

### 用备份文件做初始化

如果你要把数据迁移到另一台机器或者重新初始化：

1. 在新机器上克隆项目、配好 `.env.local`
2. 启动 `npm run dev`
3. 打开 `http://localhost:3000/setup` 做一键初始化（这会建库建表导入默认数据）
4. 然后用备份文件覆盖数据：

```bash
npm run db:apply-sql -- backups/你的备份文件.sql
```

或者跳过第 3 步的初始化，直接手动建表再导入：

```bash
npm run db:apply-sql -- database/schema.sql
npm run db:apply-sql -- backups/你的备份文件.sql
```

### 从 Git 种子文件恢复

如果备份文件不在了，但 Git 仓库里有最近一次导出的种子文件：

```bash
npm run db:init-with-anime-data
```

这会重建表结构并导入 `database/seed_anime_data.sql` 的数据。

## 本地开发的备份

本地开发一般不需要定时备份。如果数据搞乱了，直接用 `/setup` 页面重新初始化就行。

如果本地有一些自己录入的数据想保留，可以手动导出一份：

```bash
npm run db:export-anime-seed
# 或
npm run db:full-backup
```

然后把导出的文件存好就行。

## 服务器 vs 本地的备份策略

| | 服务器 | 本地开发 |
|---|---|---|
| 需要定时备份？ | 是，推荐每天一次 | 不需要 |
| 保留多少份？ | 10 份左右够了 | 手动导出就行 |
| 备份什么？ | anime + watch_history | 看需要 |
| 恢复方式 | `db:apply-sql` | `/setup` 或 `db:apply-sql` |

## 备份文件在哪

所有备份文件都在项目根目录的 `backups/` 文件夹下。这个文件夹已经在 `.gitignore` 里了，不会被提交到 Git。
