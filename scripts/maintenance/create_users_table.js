
const mysql = require('mysql2/promise');
const { createDbConfig } = require('./db_env');

async function run() {
  try {
    const conn = await mysql.createConnection(createDbConfig());
    console.log('Connected to MySQL.');
    
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100),
        role VARCHAR(20) DEFAULT 'user',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    
    await conn.execute(createTableSql);
    console.log('Users table created or already exists.');
    await conn.end();
  } catch (err) {
    console.error('Error creating table:', err);
  }
}

run();
