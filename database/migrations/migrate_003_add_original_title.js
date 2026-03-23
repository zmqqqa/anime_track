const mysql = require('mysql2/promise');
const { createDbConfig } = require('../../scripts/maintenance/db_env');

async function main() {
  const connection = await mysql.createConnection(createDbConfig());

  console.log('Connected to database.');

  try {
    // Add original_title column
    console.log('Adding original_title column...');
    await connection.query(`
      ALTER TABLE anime
      ADD COLUMN original_title VARCHAR(255) AFTER title;
    `);
    console.log('original_title column added.');

    // Clear summary and totalEpisodes as requested
    console.log('Clearing summary and totalEpisodes...');
    await connection.query(`
      UPDATE anime
      SET summary = NULL, totalEpisodes = NULL, original_title = NULL;
    `);
    console.log('Fields cleared.');

  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Column original_title already exists.');
    } else {
      console.error('Error:', err);
    }
  } finally {
    await connection.end();
  }
}

main();
