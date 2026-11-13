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

function readJournalTags(folder) {
  try {
    const raw = fs.readFileSync(path.join(folder, 'meta', '_journal.json'), 'utf8');
    const j = JSON.parse(raw);
    return (j.entries || []).map(function (e) { return e && e.tag; }).filter(Boolean);
  } catch (e) {
    return [];
  }
}

function sqliteHasNewObjects(handle) {
  try {
    const cols = handle.prepare('PRAGMA table_info(works)').all();
    const hasStudio = (cols || []).some(function (c) { return c && c.name === 'studio'; });
    const mcols = handle.prepare('PRAGMA table_info(studio_models)').all();
    const hasCatIds = (mcols || []).some(function (c) { return c && c.name === 'category_ids'; });
    const tbl = handle.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='print_orders'").get();
    return !!(hasStudio && hasCatIds && tbl);
  } catch (e) {
    return false;
  }
}

function sqliteMarkMigrationsApplied(handle, tags) {
  handle.exec('CREATE TABLE IF NOT EXISTS "__drizzle_migrations" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "hash" TEXT NOT NULL, "created_at" NUMERIC)');
  const have = {};
  try {
    handle.prepare('SELECT hash FROM "__drizzle_migrations"').all().forEach(function (r) { have[r.hash] = true; });
  } catch (e) {}
  const stmt = handle.prepare('INSERT INTO "__drizzle_migrations" ("hash","created_at") VALUES (?, ?)');
  tags.forEach(function (t) {
    if (!have[t]) { try { stmt.run(t, Date.now()); } catch (e) {} }
  });
}

async function pgHasNewObjects(pool) {
  try {
    const r = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name IN ('works','studio_models') AND column_name IN ('studio','category_ids')"
    );
    const names = (r.rows || []).map(function (x) { return x.column_name; });
    const t = await pool.query("SELECT to_regclass('print_orders') AS c");
    return names.indexOf('studio') >= 0 && names.indexOf('category_ids') >= 0 && !!(t.rows[0] && t.rows[0].c);
  } catch (e) {
    return false;
  }
}

async function pgMarkMigrationsApplied(pool, tags) {
  try {
    await pool.query('CREATE TABLE IF NOT EXISTS "__drizzle_migrations" ("id" SERIAL PRIMARY KEY, "hash" text NOT NULL, "created_at" numeric)');
    const r = await pool.query('SELECT hash FROM "__drizzle_migrations"');
    const have = {};
    (r.rows || []).forEach(function (x) { have[x.hash] = true; });
    for (const t of tags) {
      if (!have[t]) await pool.query('INSERT INTO "__drizzle_migrations" ("hash","created_at") VALUES ($1,$2)', [t, Date.now()]);
    }
  } catch (e) {
    console.warn('[db] 迁移标记写入失败', e.message);
  }
}

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
    const pgFolder = path.join(__dirname, '..', '..', 'drizzle', 'pg');
    try {
      await migratePg(db, { migrationsFolder: pgFolder });
    } catch (e) {
      // 老库已含新列/新表（曾走运行时补丁）：标记迁移完成，避免重复执行报错
      if (await pgHasNewObjects(pgPool)) {
        await pgMarkMigrationsApplied(pgPool, readJournalTags(pgFolder));
        console.warn('[db] 检测到老库结构已是最新，已标记迁移完成：' + e.message);
      } else {
        throw e;
      }
    }
    try {
      await pgPool.query("ALTER TABLE works ADD COLUMN IF NOT EXISTS studio TEXT DEFAULT ''");
      await pgPool.query("ALTER TABLE studio_models ADD COLUMN IF NOT EXISTS category_ids TEXT DEFAULT '[]'");
      await pgPool.query("CREATE TABLE IF NOT EXISTS print_orders (id TEXT PRIMARY KEY NOT NULL, work_id TEXT DEFAULT '' NOT NULL, user_id TEXT DEFAULT '' NOT NULL, contact TEXT DEFAULT '' NOT NULL, note TEXT DEFAULT '' NOT NULL, status TEXT DEFAULT 'pending' NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL)");
    } catch (e) {
      console.warn('[db] 兼容列检查跳过', e.message);
    }
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
    const sqliteFolder = path.join(__dirname, '..', '..', 'drizzle', 'sqlite');
    try {
      migrateSqlite(db, { migrationsFolder: sqliteFolder });
    } catch (e) {
      if (sqliteHasNewObjects(sqliteHandle)) {
        sqliteMarkMigrationsApplied(sqliteHandle, readJournalTags(sqliteFolder));
        console.warn('[db] 检测到老库结构已是最新，已标记迁移完成：' + e.message);
      } else {
        throw e;
      }
    }
    try {
      var cols = sqliteHandle.prepare('PRAGMA table_info(works)').all();
      var hasStudio = (cols || []).some(function (c) { return c && c.name === 'studio'; });
      if (!hasStudio) sqliteHandle.exec("ALTER TABLE works ADD COLUMN studio TEXT DEFAULT ''");
      var mcols = sqliteHandle.prepare('PRAGMA table_info(studio_models)').all();
      var hasCatIds = (mcols || []).some(function (c) { return c && (c.name === 'category_ids' || c.name === 'categoryIds'); });
      if (!hasCatIds) sqliteHandle.exec("ALTER TABLE studio_models ADD COLUMN category_ids TEXT DEFAULT '[]'");
      sqliteHandle.exec("CREATE TABLE IF NOT EXISTS print_orders (id TEXT PRIMARY KEY NOT NULL, work_id TEXT DEFAULT '' NOT NULL, user_id TEXT DEFAULT '' NOT NULL, contact TEXT DEFAULT '' NOT NULL, note TEXT DEFAULT '' NOT NULL, status TEXT DEFAULT 'pending' NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)");
    } catch (e) {
      console.warn('[db] 兼容列检查跳过', e.message);
    }
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
