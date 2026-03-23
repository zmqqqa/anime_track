const fs = require('fs');
const path = require('path');
const { config: loadEnv } = require('dotenv');

function resolveProjectRoot() {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, 'package.json'))) {
    return cwd;
  }

  let currentDir = __dirname;
  while (true) {
    if (fs.existsSync(path.join(currentDir, 'package.json'))) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
  }

  return path.join(__dirname, '../..');
}

const projectRoot = resolveProjectRoot();

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