const mysql = require('mysql2/promise');
const { createDbConfig } = require('../../scripts/maintenance/db_env');

async function main() {
  const connection = await mysql.createConnection(createDbConfig());

  console.log('Connected to database.');

  try {
    const queries = [
      "ALTER TABLE anime ADD COLUMN IF NOT EXISTS summary TEXT",
      "ALTER TABLE anime ADD COLUMN IF NOT EXISTS start_date DATE",
      "ALTER TABLE anime ADD COLUMN IF NOT EXISTS end_date DATE",
      "ALTER TABLE anime ADD COLUMN IF NOT EXISTS premiere_date DATE"
    ];

    for (const query of queries) {
      await connection.execute(query);
      console.log(`Executed: ${query}`);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await connection.end();
  }
}

main();
