# 元数据维护手册

## 1. 维护范围

这份手册只覆盖动漫元数据批量维护，不覆盖用户账号、一次性数据修复或数据库结构迁移。

当前重点字段：

- `title` / `originalTitle`
- `premiereDate`
- `score`
- `totalEpisodes`
- `durationMinutes`
- `summary`
- `tags`
- `coverUrl`
- `cast` / `castAliases`
- `isFinished`

约束：

- 运行时共享提示词在 `lib/metadata/ai-metadata-source.js`，不要为了批处理任务去修改它。
- 写库前必须先跑 dry-run，并保留审计日志。
- `start_date` / `end_date` 继续视为人工维护字段，不纳入自动补全。

## 2. 脚本目录结构

```
scripts/
  shared/       公共模块
    db_env.js     数据库配置（被所有需要 DB 的脚本引用，也被 app/api/setup/bootstrap/ 导入）
  enrich/       元数据富化流水线（手动运行）
    enrich_titles.js     第 1 步：AI 标题标准化
    enrich_metadata.js   第 2 步：API + AI 元数据补全
    enrich_cast.js       第 3 步：声优信息补全
  db/           数据库管理
    apply_sql_files.js   通用 SQL 执行器
    run_migrations.js    迁移执行器
    backup_db.js         mysqldump 备份
    export_anime_seed.js 种子数据导出
    export_full_backup.js 全量数据导出
  deploy/       开发/生产部署
    dev_guard.js         开发环境守卫
    prod_build_guard.js  生产构建守卫
    prod_start_guard.js  生产启动守卫
    deploy_production.sh 一键部署脚本
    smoke_api_health.js  API 冒烟测试
  repair/       数据修复与诊断
    reset_metadata_fields.js         字段重置
    report_anime_metadata_status.js  元数据完整度报告
    fix_anime_progress.js            进度修复
```

### package.json 脚本映射

| npm 脚本 | 实际文件 |
|---|---|
| `dev:guard` | `scripts/deploy/dev_guard.js` |
| `build` | `scripts/deploy/prod_build_guard.js` |
| `start` | `scripts/deploy/prod_start_guard.js` |
| `deploy:prod` | `scripts/deploy/deploy_production.sh` |
| `test:smoke:api` | `scripts/deploy/smoke_api_health.js` |
| `db:apply-sql` | `scripts/db/apply_sql_files.js` |
| `db:init-with-anime-data` | `scripts/db/apply_sql_files.js` (schema + seed) |
| `db:export-anime-seed` | `scripts/db/export_anime_seed.js` |
| `db:full-backup` | `scripts/db/export_full_backup.js` |
| `anime:enrich-titles` | `scripts/enrich/enrich_titles.js` |
| `anime:enrich-titles:write` | `scripts/enrich/enrich_titles.js --write` |
| `anime:enrich-metadata` | `scripts/enrich/enrich_metadata.js` |
| `anime:enrich-metadata:write` | `scripts/enrich/enrich_metadata.js --write` |
| `anime:enrich-cast` | `scripts/enrich/enrich_cast.js` |
| `anime:enrich-cast:write` | `scripts/enrich/enrich_cast.js --write` |

## 3. 三步富化流水线

### 执行顺序

```
enrich_titles → enrich_metadata → enrich_cast
```

三个脚本有依赖关系：metadata 和 cast 依赖标题标准化后的准确名称去查外部 API，所以 titles 必须先跑。

### 第 1 步：enrich_titles（AI 标题标准化）

- 纯 AI 两阶段处理：先识别候选标题，再由第二轮 AI 审核候选是否可靠
- 低把握结果直接跳过，不为了“有答案”而强行写库
- 默认并发 3 路
- 选项：`--write`、`--force`、`--no-update-title`、`--limit=N`、`--ids=`、`--concurrency=3`、`--min-confidence=75`

### 第 2 步：enrich_metadata（元数据补全）

- 用标准化后的标题查 Bangumi API 补全 score、totalEpisodes、summary、tags 等
- 不足字段交给 AI 兜底
- 复用 `lib/metadata/provider-source.js` 和 `lib/metadata/merge-policy.js`
- 默认并发 3 路
- 选项：`--write`、`--force`、`--fields=`、`--no-ai`、`--ai-only`、`--limit=N`、`--ids=`、`--concurrency=3`

### 第 3 步：enrich_cast（声优信息）

- 从 Bangumi 获取声优列表
- 用 AI 生成中文别名
- 默认并发 3 路
- 选项：`--write`、`--force`、`--limit=N`、`--ids=`、`--concurrency=3`、`--no-aliases`

## 4. 批量操作标准流程

### 写库前

1. 先跑状态审计：`node scripts/repair/report_anime_metadata_status.js`
2. 小批量 dry-run：`node scripts/enrich/enrich_metadata.js --limit=5`
3. 检查输出日志，确认来源和候选值合理

### 写库时

1. 默认只补空值，不覆盖手工录入
2. 需要覆盖时用 `--force`，优先配合 `--ids` 或 `--limit`
3. 推荐命令：
   ```bash
   npm run anime:enrich-titles:write
   npm run anime:enrich-metadata:write
   npm run anime:enrich-cast:write
   ```

### 写库后

1. 再跑一次审计确认空值量下降
2. 抽样检查详情页展示
3. 稳定后导出种子：`npm run db:export-anime-seed`

## 5. 字段策略

### provider-first

优先走 Bangumi，AI 只做兜底：

- `originalTitle`、`coverUrl`、`score`、`totalEpisodes`、`premiereDate`、`cast`、`castAliases`、`isFinished`

注意：`score` 不接受 AI 生成值。

### ai-first

允许 AI 作为首选来源：

- `title`（标准化中文名）、`summary`、`tags`、`durationMinutes`
