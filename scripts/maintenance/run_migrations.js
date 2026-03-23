const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { createDbConfig } = require('./db_env');

async function runMigrations() {
  const connection = await mysql.createConnection(createDbConfig({ multipleStatements: true }));

  const migrationsDir = path.join(__dirname, '../../database/migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  for (const file of files) {
    if (file.endsWith('.sql')) {
      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      try {
          await connection.query(sql);
          console.log(`Successfully ran ${file}`);
      } catch (err) {
          console.error(`Error running ${file}:`, err.message);
          // Continue or exit? usually exit on error for migrations
          process.exit(1);
      }
    }
  }

  await connection.end();
}

runMigrations().catch(err => {
  console.error(err);
  process.exit(1);
});
