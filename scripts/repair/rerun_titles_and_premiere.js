/**
 * rerun_titles_and_premiere.js
 *
 * 一键执行以下流程：
 * 1. 清空 anime.original_title 和 anime.premiere_date
 * 2. 重新补 original_title（默认不改 title）
 * 3. 重新补 premiere_date
 *
 * 默认 dry-run；加 --write 才真正写库。
 *
 * Usage:
 *   node scripts/repair/rerun_titles_and_premiere.js [options]
 *
 * Options:
 *   --write             真正执行写入（默认 dry-run）
 *   --ids=1,2,3         只处理指定 anime ID
 *   --limit=N           限制补全脚本最多处理 N 条
 *   --concurrency=3     enrich_titles / enrich_premiere_dates 并发数
 *   --update-title      允许 enrich_titles 同步更新 title（默认只补 original_title）
 *   --min-confidence=70 传给 enrich_titles
 *   --strict-review     传给 enrich_titles
 *   --no-ai             传给 enrich_premiere_dates
 *   --ai-only           传给 enrich_premiere_dates
 *   --help              显示帮助
 */

const path = require('path');
const { spawn } = require('child_process');
const { projectRoot } = require('../shared/db_env');

function printHelp() {
  console.log('Usage: node scripts/repair/rerun_titles_and_premiere.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --write             真正执行写入（默认 dry-run）');
  console.log('  --ids=1,2,3         只处理指定 anime ID');
  console.log('  --limit=N           限制补全脚本最多处理 N 条');
  console.log('  --concurrency=3     enrich_titles / enrich_premiere_dates 并发数');
  console.log('  --update-title      允许 enrich_titles 同步更新 title（默认只补 original_title）');
  console.log('  --min-confidence=70 传给 enrich_titles');
  console.log('  --strict-review     传给 enrich_titles');
  console.log('  --no-ai             传给 enrich_premiere_dates');
  console.log('  --ai-only           传给 enrich_premiere_dates');
  console.log('  --help              显示帮助');
}

function parseArgs(argv) {
  const options = {
    dryRun: true,
    ids: undefined,
    limit: undefined,
    concurrency: undefined,
    updateTitle: false,
    minConfidence: undefined,
    strictReview: false,
    noAi: false,
    aiOnly: false,
  };

  for (const arg of argv) {
    if (arg === '--help') {
      printHelp();
      process.exit(0);
    }
    if (arg === '--write') {
      options.dryRun = false;
      continue;
    }
    if (arg === '--update-title') {
      options.updateTitle = true;
      continue;
    }
    if (arg === '--strict-review') {
      options.strictReview = true;
      continue;
    }
    if (arg === '--no-ai') {
      options.noAi = true;
      continue;
    }
    if (arg === '--ai-only') {
      options.aiOnly = true;
      continue;
    }
    if (arg.startsWith('--ids=')) {
      options.ids = arg.slice(6);
      continue;
    }
    if (arg.startsWith('--limit=')) {
      const value = Number(arg.slice(8));
      if (value > 0) {
        options.limit = value;
      }
      continue;
    }
    if (arg.startsWith('--concurrency=')) {
      const value = Number(arg.slice(14));
      if (value > 0) {
        options.concurrency = value;
      }
      continue;
    }
    if (arg.startsWith('--min-confidence=')) {
      const value = Number(arg.slice(17));
      if (Number.isFinite(value)) {
        options.minConfidence = value;
      }
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  if (options.noAi && options.aiOnly) {
    throw new Error('--no-ai 和 --ai-only 不能同时使用');
  }

  return options;
}

function runNodeScript(relativeScriptPath, args, label) {
  const absoluteScriptPath = path.join(projectRoot, relativeScriptPath);

  return new Promise((resolve, reject) => {
    console.log(`\n=== ${label} ===`);
    console.log(`node ${relativeScriptPath} ${args.join(' ')}`.trim());

    const child = spawn(process.execPath, [absoluteScriptPath, ...args], {
      cwd: projectRoot,
      stdio: 'inherit',
      env: process.env,
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${label} 失败，退出码 ${code}`));
    });
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  const sharedArgs = [];
  if (!options.dryRun) {
    sharedArgs.push('--write');
  }
  if (options.ids) {
    sharedArgs.push(`--ids=${options.ids}`);
  }

  const resetArgs = [
    '--fields=originalTitle,premiereDate',
    ...sharedArgs,
  ];

  const titlesArgs = [...sharedArgs];
  if (!options.updateTitle) {
    titlesArgs.push('--no-update-title');
  }
  if (options.limit) {
    titlesArgs.push(`--limit=${options.limit}`);
  }
  if (options.concurrency) {
    titlesArgs.push(`--concurrency=${options.concurrency}`);
  }
  if (options.minConfidence !== undefined) {
    titlesArgs.push(`--min-confidence=${options.minConfidence}`);
  }
  if (options.strictReview) {
    titlesArgs.push('--strict-review');
  }

  const premiereArgs = [...sharedArgs];
  if (options.limit) {
    premiereArgs.push(`--limit=${options.limit}`);
  }
  if (options.concurrency) {
    premiereArgs.push(`--concurrency=${options.concurrency}`);
  }
  if (options.noAi) {
    premiereArgs.push('--no-ai');
  }
  if (options.aiOnly) {
    premiereArgs.push('--ai-only');
  }

  console.log('标题与开播日期重跑流水线');
  console.log(`模式: ${options.dryRun ? 'dry-run' : 'WRITE'}`);
  if (options.ids) {
    console.log(`目标 ID: ${options.ids}`);
  } else {
    console.log('目标: 全部 anime');
  }

  await runNodeScript('scripts/repair/reset_metadata_fields.js', resetArgs, '步骤 1/3 清空字段');
  await runNodeScript('scripts/enrich/enrich_titles.js', titlesArgs, '步骤 2/3 回填原名');
  await runNodeScript('scripts/enrich/enrich_premiere_dates.js', premiereArgs, '步骤 3/3 回填开播日期');

  console.log('\n流程完成。');
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});