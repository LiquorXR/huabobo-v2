const { sqliteTable, text, integer, uniqueIndex } = require('drizzle-orm/sqlite-core');

/** SQLite schema. Mirrors schema.pg.js exactly (same tables/columns/keys).
 *  Timestamps are INTEGER millis. JSON-ish fields are TEXT (app serializes).
 *  Booleans are INTEGER 0/1 with boolean mode (reads as true/false).
 */
const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  phone: text('phone').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  nickname: text('nickname').notNull().default('新用户'),
  handle: text('handle').notNull().default(''),
  avatar: text('avatar').notNull().default('images/author-user-me.jpg'),
  bio: text('bio').notNull().default(''),
  type: text('type').notNull().default('member'),
  joinDate: text('join_date').notNull().default(''),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull()
});

const works = sqliteTable('works', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  image: text('image').notNull().default(''),
  tag: text('tag').notNull().default(''),
  desc: text('desc').notNull().default(''),
  publishedAt: integer('published_at', { mode: 'number' }),
  status: text('status').notNull().default('draft'),
  workType: text('work_type').notNull().default('model'),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull()
});

const comments = sqliteTable('comments', {
  id: text('id').primaryKey(),
  workId: text('work_id')
    .notNull()
    .references(() => works.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull()
});

const likes = sqliteTable(
  'likes',
  {
    id: text('id').primaryKey(),
    workId: text('work_id')
      .notNull()
      .references(() => works.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'number' }).notNull()
  },
  (t) => [uniqueIndex('likes_work_user_unique').on(t.workId, t.userId)]
);

const news = sqliteTable('news', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  image: text('image').notNull().default(''),
  summary: text('summary').notNull().default(''),
  content: text('content').notNull().default(''),
  publishedAt: integer('published_at', { mode: 'number' }).notNull(),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull()
});

const artisans = sqliteTable('artisans', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  title: text('title').notNull().default(''),
  bio: text('bio').notNull().default(''),
  image: text('image').notNull().default(''),
  tags: text('tags').notNull().default('[]'),
  sortOrder: integer('sort_order').notNull().default(0),
  portfolio: text('portfolio').notNull().default('[]'),
  contact: text('contact').notNull().default('{}'),
  wechat: text('wechat').notNull().default('{}'),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull()
});

const studioModelCategories = sqliteTable('studio_model_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  sortOrder: integer('sort_order').notNull().default(0),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull()
});

const studioModels = sqliteTable('studio_models', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  desc: text('desc').notNull().default(''),
  glbUrl: text('glb_url').notNull(),
  thumbnail: text('thumbnail').notNull().default(''),
  categoryId: text('category_id').references(() => studioModelCategories.id),
  sortOrder: integer('sort_order').notNull().default(0),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull()
});

const aboutPages = sqliteTable('about_pages', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  heroTitle: text('hero_title').notNull().default('关于我们'),
  heroSubtitle: text('hero_subtitle').notNull().default(''),
  introTitle: text('intro_title').notNull().default('平台简介'),
  introText: text('intro_text').notNull().default(''),
  introImage: text('intro_image').notNull().default(''),
  values: text('values').notNull().default('[]'),
  printSectionTitle: text('print_section_title').notNull().default('可打印作品展示'),
  printSectionDesc: text('print_section_desc').notNull().default(''),
  printWorks: text('print_works').notNull().default('[]'),
  joinTitle: text('join_title').notNull().default('加入我们'),
  joinText: text('join_text').notNull().default(''),
  contact: text('contact').notNull().default('{}'),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull()
});

module.exports = {
  users,
  works,
  comments,
  likes,
  news,
  artisans,
  studioModels,
  studioModelCategories,
  aboutPages
};
