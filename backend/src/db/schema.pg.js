const { pgTable, text, integer, bigint, boolean, uniqueIndex, index } = require('drizzle-orm/pg-core');

/** PostgreSQL schema. JS keys are camelCase, DB columns snake_case.
 *  IDs are TEXT primary keys (legacy ObjectId hex strings are kept as-is).
 *  Timestamps are BIGINT millis. JSON-ish fields are TEXT (app serializes).
 */
const users = pgTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  nickname: text('nickname').notNull().default('新用户'),
  handle: text('handle').notNull().default(''),
  avatar: text('avatar').notNull().default('images/author-user-me.jpg'),
  bio: text('bio').notNull().default(''),
  type: text('type').notNull().default('member'),
  joinDate: text('join_date').notNull().default(''),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
});

const works = pgTable('works', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  image: text('image').notNull().default(''),
  tag: text('tag').notNull().default(''),
  desc: text('desc').notNull().default(''),
  publishedAt: bigint('published_at', { mode: 'number' }),
  status: text('status').notNull().default('draft'),
  workType: text('work_type').notNull().default('model'),
  studio: text('studio').notNull().default(''),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
}, (t) => [index('works_status_published_idx').on(t.status, t.publishedAt)]);

const comments = pgTable('comments', {
  id: text('id').primaryKey(),
  workId: text('work_id')
    .notNull()
    .references(() => works.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
});

const likes = pgTable(
  'likes',
  {
    id: text('id').primaryKey(),
    workId: text('work_id')
      .notNull()
      .references(() => works.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: bigint('created_at', { mode: 'number' }).notNull()
  },
  (t) => [uniqueIndex('likes_work_user_unique').on(t.workId, t.userId)]
);

const news = pgTable('news', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  image: text('image').notNull().default(''),
  summary: text('summary').notNull().default(''),
  content: text('content').notNull().default(''),
  publishedAt: bigint('published_at', { mode: 'number' }).notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
});

const artisans = pgTable('artisans', {
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
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
});

const studioModelCategories = pgTable('studio_model_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  sortOrder: integer('sort_order').notNull().default(0),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
});

const studioModels = pgTable('studio_models', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  desc: text('desc').notNull().default(''),
  glbUrl: text('glb_url').notNull(),
  thumbnail: text('thumbnail').notNull().default(''),
  categoryId: text('category_id').references(() => studioModelCategories.id),
  categoryIds: text('category_ids').notNull().default('[]'),
  sortOrder: integer('sort_order').notNull().default(0),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
}, (t) => [index('studio_models_enabled_idx').on(t.enabled)]);

const aboutPages = pgTable('about_pages', {
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
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
});

const printOrders = pgTable('print_orders', {
  id: text('id').primaryKey(),
  workId: text('work_id').notNull().default(''),
  userId: text('user_id').notNull().default(''),
  contact: text('contact').notNull().default(''),
  note: text('note').notNull().default(''),
  status: text('status').notNull().default('pending'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
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
  aboutPages,
  printOrders
};
