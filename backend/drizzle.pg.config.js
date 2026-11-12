/** @type {import('drizzle-kit').Config} */
module.exports = {
  schema: './src/db/schema.pg.js',
  out: './drizzle/pg',
  dialect: 'postgresql',
  verbose: true,
  strict: true
};
