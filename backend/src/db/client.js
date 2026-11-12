const fs = require('fs');
const path = require('path');
const { drizzle: drizzlePg } = require('drizzle-orm/node-postgres');
const { drizzle: drizzleSqlite } = require('drizzle-orm/better-sqlite3');
const { migrate: migratePg } = require('drizzle-orm/node-postgres/migrator');
const { migrate: migrateSqlite } = require('drizzle-orm/better-sqlite3/migrator');
const { Pool } = require('pg');
const Database = require('better-sqlite3');
const config = require('../config');

function provider() {
  const url = String(config.databaseUrl || '');
  if (/^postgres(ql)?:\/\//i.test(url)) return 'pg';
  return 'sqlite';
}

function sqliteFile() {
  const url = String(config.databaseUrl || '');
  const m = url.match(/^file:(.+)$/i);
  const rel = m ? m[1].trim() : './dev.db';
  return path.isAbsolute(rel) ? rel : path.resolve(process.cwd(), rel);
}

let pgPool = null;
let sqliteHandle = null;

async function connectDb() {
  if (provider() === 'pg') {
    const schema = require('./schema.pg');
    pgPool = new Pool({
      connectionString: config.databaseUrl,
      connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 30000,
      max: 10
    });
    await pgPool.query('SELECT 1');
    const db = drizzlePg(pgPool, { schema });
    await migratePg(db, { migrationsFolder: path.join(__dirname, '..', '..', 'drizzle', 'pg') });
    console.log('[db] PostgreSQL 已连接并完成迁移检查');
    module.exports.db = db;
    module.exports.schema = schema;
  } else {
    const schema = require('./schema.sqlite');
    const file = sqliteFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    sqliteHandle = new Database(file);
    sqliteHandle.pragma('journal_mode = WAL');
    sqliteHandle.pragma('foreign_keys = ON');
    const db = drizzleSqlite(sqliteHandle, { schema });
    migrateSqlite(db, { migrationsFolder: path.join(__dirname, '..', '..', 'drizzle', 'sqlite') });
    console.log('[db] SQLite 已连接 ' + file);
    module.exports.db = db;
    module.exports.schema = schema;
  }
  module.exports.ready = true;
}

function isDbReady() {
  return !!module.exports.ready;
}

module.exports = { connectDb, isDbReady, provider, db: null, schema: null, ready: false };
