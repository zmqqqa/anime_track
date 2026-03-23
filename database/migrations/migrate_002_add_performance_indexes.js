const mysql = require('mysql2/promise');
const { createDbConfig } = require('../../scripts/maintenance/db_env');

async function main() {
  const connection = await mysql.createConnection(createDbConfig());

  console.log('Connected to database for performance indexing.');

  try {
    const skipErrorsExecute = async (sql) => {
      try {
        await connection.execute(sql);
        console.log(`Success: ${sql}`);
      } catch (e) {
        if (e.code === 'ER_DUP_KEYNAME') {
          console.log(`Skipped (already exists): ${sql}`);
        } else {
          console.error(`Error executing ${sql}:`, e.message);
        }
      }
    };

    const indexQueries = [
      "ALTER TABLE anime ADD INDEX idx_anime_status (status)",
      "ALTER TABLE anime ADD INDEX idx_anime_updatedAt (updatedAt)",
      "ALTER TABLE watch_history ADD INDEX idx_watch_history_animeId (animeId)",
      "ALTER TABLE watch_history ADD INDEX idx_watch_history_watchedAt (watchedAt)",
      "ALTER TABLE users ADD INDEX idx_users_role (role)"
    ];

    for (const query of indexQueries) {
      await skipErrorsExecute(query);
    }

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await connection.end();
  }
}

main();
