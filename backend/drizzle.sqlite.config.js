/** @type {import('drizzle-kit').Config} */
module.exports = {
  schema: './src/db/schema.sqlite.js',
  out: './drizzle/sqlite',
  dialect: 'sqlite',
  verbose: true,
  strict: true
};
