/**
 * reset_metadata_fields.js
 *
 * 清空指定的 anime 元数据字段，为后续按顺序回填做准备。
 *
 * Usage:
 *   node scripts/repair/reset_metadata_fields.js --fields=originalTitle,premiereDate [--write] [--ids=1,2,3]
 *
 * 默认 dry-run 模式，加 --write 才真正执行。
 */

const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const FIELD_COLUMN_MAP = {
  originalTitle: 'original_title',
  premiereDate: 'premiere_date',
  coverUrl: 'coverUrl',
  score: 'score',
  totalEpisodes: 'totalEpisodes',
  durationMinutes: 'durationMinutes',
  summary: 'summary',
  tags: 'tags',
  cast: 'cast',
  castAliases: 'cast_aliases',
  isFinished: 'isFinished',
};

function printHelp() {
  console.log('Usage: node scripts/repair/reset_metadata_fields.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --fields=a,b        Fields to clear (required)');
  console.log('  --write             Apply changes (default is dry-run)');
  console.log('  --ids=1,2,3         Only reset specific anime IDs');
  console.log('  --help              Show this message');
  console.log('');
  console.log(`Available fields: ${Object.keys(FIELD_COLUMN_MAP).join(', ')}`);
}

function parseArgs(argv) {
  const options = { dryRun: true, fields: [], ids: undefined };

  for (const arg of argv) {
    if (arg === '--help') {
      printHelp();
      process.exit(0);
    }
    if (arg === '--write') {
      options.dryRun = false;
      continue;
    }
    if (arg.startsWith('--fields=')) {
      const requested = arg.slice('--fields='.length).split(',').map((s) => s.trim()).filter(Boolean);
      const invalid = requested.filter((f) => !FIELD_COLUMN_MAP[f]);
      if (invalid.length > 0) {
        throw new Error(`Unknown fields: ${invalid.join(', ')}. Allowed: ${Object.keys(FIELD_COLUMN_MAP).join(', ')}`);
      }
      options.fields = requested;
      continue;
    }
    if (arg.startsWith('--ids=')) {
      options.ids = arg.slice('--ids='.length).split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0);
      if (options.ids.length === 0) options.ids = undefined;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  if (options.fields.length === 0) {
    throw new Error('--fields is required. Example: --fields=originalTitle,premiereDate');
  }

  return options;
}

function createDbConfig() {
  const { MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_DATABASE } = process.env;
  if (!MYSQL_HOST || !MYSQL_PORT || !MYSQL_USER || !MYSQL_DATABASE) {
    throw new Error('Missing MYSQL_HOST / MYSQL_PORT / MYSQL_USER / MYSQL_DATABASE in environment');
  }
  return {
    host: MYSQL_HOST,
    port: Number(MYSQL_PORT),
    user: MYSQL_USER,
    password: process.env.MYSQL_PASSWORD || '',
    database: MYSQL_DATABASE,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  const columns = options.fields.map((f) => FIELD_COLUMN_MAP[f]);
  const sets = columns.map((col) => `${col} = NULL`).join(', ');

  let whereClause = '';
  const params = [];
  if (options.ids) {
    whereClause = ` WHERE id IN (${options.ids.map(() => '?').join(', ')})`;
    params.push(...options.ids);
  }

  const sql = `UPDATE anime SET ${sets}, updatedAt = NOW()${whereClause}`;

  console.log(`Fields to clear: ${options.fields.join(', ')}`);
  console.log(`Columns: ${columns.join(', ')}`);
  if (options.ids) {
    console.log(`Targeting IDs: ${options.ids.join(', ')}`);
  } else {
    console.log('Targeting: ALL anime rows');
  }
  console.log(`Mode: ${options.dryRun ? 'dry-run' : 'WRITE'}`);
  console.log(`SQL: ${sql}`);

  if (options.dryRun) {
    console.log('\n[dry-run] No changes made. Add --write to execute.');
    return;
  }

  const connection = await mysql.createConnection(createDbConfig());
  try {
    const [result] = await connection.execute(sql, params);
    console.log(`\nDone. ${result.affectedRows} rows updated.`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
