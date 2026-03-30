# Repair 常用命令

这个目录主要放数据修复和重跑脚本。

## 当前最常用

### 1. 清空原名和开播日期

默认先 dry-run 预览：

```bash
node scripts/repair/reset_metadata_fields.js --fields=originalTitle,premiereDate
```

确认后真正执行：

```bash
node scripts/repair/reset_metadata_fields.js --fields=originalTitle,premiereDate --write
```

如果只处理指定条目：

```bash
node scripts/repair/reset_metadata_fields.js --fields=originalTitle,premiereDate --ids=44,46,47 --write
```

### 2. 补充原名

默认只补 `original_title`，不改现有 `title`。

先 dry-run：

```bash
node scripts/enrich/enrich_titles.js --no-update-title
```

真正写入：

```bash
node scripts/enrich/enrich_titles.js --write --no-update-title
```

如果只处理指定条目：

```bash
node scripts/enrich/enrich_titles.js --write --no-update-title --ids=44,46,47
```

如果只想跑少量记录试试：

```bash
node scripts/enrich/enrich_titles.js --write --no-update-title --limit=20
```

## 常用两步流程

先清空，再补原名：

```bash
node scripts/repair/reset_metadata_fields.js --fields=originalTitle,premiereDate --write
node scripts/enrich/enrich_titles.js --write --no-update-title
```

## 一条命令版本

如果之后要连开播日期一起重跑，可以直接用：

```bash
npm run repair:rerun-titles-premiere -- --write
```

这个命令会依次执行：

1. 清空 `original_title` 和 `premiere_date`
2. 重跑原名补全
3. 重跑开播日期补全