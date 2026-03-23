const fs = require('fs');
const path = require('path');
const { config: loadEnv } = require('dotenv');

const projectRoot = path.join(__dirname, '../..');

let loaded = false;

function loadDatabaseEnv() {
  if (loaded) {
    return;
  }

  for (const fileName of ['.env.local', '.env']) {
    const filePath = path.join(projectRoot, fileName);
    if (fs.existsSync(filePath)) {
      loadEnv({ path: filePath, override: false });
    }
  }

  loaded = true;
}

function requireEnv(name) {
  loadDatabaseEnv();

  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function createDbConfig(overrides = {}) {
  return {
    host: requireEnv('MYSQL_HOST'),
    port: Number(requireEnv('MYSQL_PORT')),
    user: requireEnv('MYSQL_USER'),
    password: requireEnv('MYSQL_PASSWORD'),
    database: requireEnv('MYSQL_DATABASE'),
    charset: 'utf8mb4',
    ...overrides,
  };
}

module.exports = {
  projectRoot,
  loadDatabaseEnv,
  requireEnv,
  createDbConfig,
};