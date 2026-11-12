# 指间塑 — Node.js 后台 API

基于 **Express + Drizzle ORM**（生产 PostgreSQL / 本地 SQLite），为前端提供用户注册、新闻资讯、合作艺人、展厅作品、留言与管理员看板接口。

## 服务器地址（统一）

| 用途 | 地址 |
|------|------|
| **生产站点** | `https://你的域名`（Caddy 自动 HTTPS） |
| **API 根地址** | 同源 `/api`（Caddy 反代到后端 :3000） |
| **本地后端** | `http://127.0.0.1:3000` |
| **本地前端** | `http://127.0.0.1:8765` |
| 健康检查 | `GET /api/health` |
| **管理后台页面** | `https://你的域名/admin/`（本地：`http://127.0.0.1:3000/admin/`） |
| 管理员登录接口 | `POST /api/admin/login` |
| 上传文件访问 | `/uploads/...` |

管理员默认账号：`admin` / `zhijiansu@admin`

下文接口均以 `/api` 为根路径；生产环境拼接到你的域名后，本地调试拼接到 `http://127.0.0.1:3000`。

> 生产统一走 Docker + Caddy（同源 `/api`，无端口概念），本节的 IP:端口写法仅用于本地直连调试；`PUBLIC_BASE_URL` 由 compose 的 `DOMAIN` 自动生成。

### 绑定域名（HTTPS）必做

1. **手势 / 摄像头**：浏览器只允许在 **HTTPS**（或 `http://127.0.0.1`）下使用摄像头。生产 Caddy 自动签发证书，直接用 `https://域名` 访问即可。
2. **展厅点赞 / 留言**：HTTPS 页面不能直连 `http://IP:3000`（Mixed Content）。生产由 Caddy 把 **`/api`、`/uploads`、`/admin`** 反代到 `backend:3000`（见仓根 `docker-compose.yml` + `web/Caddyfile`），前端同源请求，无需手工配 Nginx。
3. 前端 `frontend/js/api-config.js` 已按同源解析（域名下请求 `location.origin`），无需上传零散文件。
4. 浏览器访问 `https://你的域名/api/health` 应返回 `{"ok":true,...}`。

## 环境要求

- **Node.js v22 及以上**（better-sqlite3 v13 要求 Node 22+；`nvm install 22 && nvm use 22`，见 `.nvmrc`）
- 生产：PostgreSQL 16（`DATABASE_URL=postgres://USER:PASS@127.0.0.1:5432/mydb`）；本地：SQLite 零依赖（`DATABASE_URL=file:./dev.db`，默认）

检查版本：

```bash
node -v   # 应 >= v22
```

## 快速开始

```bash
cd backend
cp .env.example .env
# 编辑 .env，填写 DATABASE_URL（生产填 postgres 连接串，本地默认 file:./dev.db 即可）
npm install
npm run seed    # 可选：写入示例数据
npm start       # 或 npm run dev
```

## 服务器部署（Docker，生产唯一方式）

不再使用宝塔面板。生产统一走仓根 `docker-compose.yml`（Caddy 自动 HTTPS + Node 后端 + PostgreSQL）：

```bash
cp .env.example .env   # 填写 DOMAIN / POSTGRES_PASSWORD / JWT_SECRET
docker compose up -d --build
curl https://你的域名/api/health   # {"ok":true,"db":"connected"}
```

说明：

- 首次启动自动执行 drizzle 迁移并写入示例数据（新闻/艺人/分类/关于页），无需手动 `npm run seed`。
- 上传文件落 `uploads-data` 卷，更新镜像不丢失；数据库在 `pgdata` 卷。
- 日常更新：`git pull && docker compose up -d --build`。
- 查看日志：`docker compose logs -f backend`；进库检查：`docker compose exec postgres psql -U mydb -d mydb`。
- 备份：`docker compose exec postgres pg_dump -U mydb mydb > dump.sql` + 卷备份 `uploads-data`（见运维手册）。

服务地址：`https://你的域名`（前台）与 `https://你的域名/admin/`（管理后台）。

若管理后台图片不显示，检查 `.env` 中 `DOMAIN` 是否为当前域名（`PUBLIC_BASE_URL` 由此拼接）。

### 管理后台没有新闻 / 合作艺人？

前端页面上的 **3 条新闻、3 位合作艺人** 原先写在 HTML / 本地 `db-seed.js` 里，**不会自动进入数据库**。

服务在 **成功连接数据库后** 会自动写入与前端一致的示例数据（见 `src/seedContent.js`）。也可手动执行：

```bash
cd backend   # 后台项目目录（本地开发；Docker 部署会自动播种，无需手动执行）
npm run seed
```

然后 **重启 backend 容器**（`docker compose restart backend`），刷新管理后台即可看到 3 条新闻、3 位艺人。

### 登录出现「Failed to fetch」时

1. 服务器上执行 `curl http://127.0.0.1:3000/api/health`（进 backend 容器网络前先确认服务本身）或 `docker compose ps` 看三容器是否都 Up；  
   - 能返回 `{"ok":true,...}` → 后台已启动，再试管理页登录。  
   - 打不开 → `docker compose logs backend` 看报错（常见是 `DATABASE_URL` 配错或 postgres 未 healthy）。
2. 管理页请用 **HTTPS 域名** 打开：`https://你的域名/admin/`，确认浏览器地址栏是锁形图标（摄像头/上传要求 HTTPS）。
3. 管理页登录区展开「无法登录？检查 API 地址」，确认 API 为同源（`https://你的域名`，由前端 `api-config.js` 自动解析，无需手填 IP:端口）。
4. 更新代码后执行 `git pull && docker compose up -d --build` 即可，无需手动传文件、手动重启。

## 管理员账号（写在程序内）

| 项 | 默认值 |
|----|--------|
| 用户名 | `admin` |
| 密码 | `zhijiansu@admin` |

可通过环境变量 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 覆盖。

登录后请在请求头携带：

```http
Authorization: Bearer <token>
```

## 接口一览

**根地址：** ``

### 0. 健康检查（公开）

| 方法 | 完整地址 |
|------|----------|
| GET | `/api/health` |

响应含 `ok`、`db`（connected/disconnected）、`uploadDir`、`uploadFileCount`。

### 数字人 AI（公开，需配 key；未配则前端自动降级）

| 方法 | 说明 |
|------|------|
| POST `/api/tts/speak` | 豆包 TTS：Body `{ text }`，返回 `audio/mpeg`。需 `DOUBAO_TTS_API_KEY` + `DOUBAO_TTS_SPEAKER` |
| POST `/api/vision/identify` | 实物识图：Body `{ image: dataURL }`，返回 `{ motif, craft, light }`。需 `ARK_API_KEY` + `ARK_VISION_MODEL` |
| POST `/api/review/text` | 点评文案：Body `{ context }`，返回 `{ text }`。需 `ARK_API_KEY` + `ARK_TEXT_MODEL` |

---

### 1. 管理员

| 方法 | 完整地址 | 说明 |
|------|----------|------|
| POST | `/api/admin/login` | 登录，Body：`{ "username", "password" }` |
| GET | `/api/admin/dashboard` | 数据看板（需 `Authorization: Bearer <token>`） |

管理后台页面：`/admin/`

---

### 2. 用户（注册 / 登录 / 资料）

| 方法 | 完整地址 | 说明 |
|------|----------|------|
| POST | `/api/users/register` | 注册 `{ username, password, nickname }`（用户名 2-20 字） |
| POST | `/api/users/login` | 登录 `{ username, password }` |
| GET | `/api/users/:id` | 用户公开资料 |
| PATCH / POST | `/api/users/:id/profile` | 修改昵称 `{ nickname }` |
| POST | `/api/users/:id/avatar` | 上传头像，`multipart` 字段 `avatar` |

**管理员：**

| 方法 | 完整地址 |
|------|----------|
| GET | `/api/admin/users?page=1&limit=20&keyword=` |
| DELETE | `/api/admin/users/:id` |
| PATCH | `/api/admin/users/:id/password` — Body：`{ "newPassword" }` |

---

### 3. 新闻资讯

| 方法 | 完整地址 | 权限 |
|------|----------|------|
| GET | `/api/news?page=1&limit=10` | 公开列表 |
| GET | `/api/news/:id` | 公开详情 |
| POST | `/api/admin/news` | 管理员发布 |
| PUT | `/api/admin/news/:id` | 管理员修改 |
| DELETE | `/api/admin/news/:id` | 管理员删除 |

发布/修改：`multipart/form-data` — `title`、`summary`、`content`、`publishedAt`、`image`

---

### 4. 合作艺人

| 方法 | 完整地址 | 权限 |
|------|----------|------|
| GET | `/api/artisans` | 公开列表 |
| GET | `/api/artisans/:id` | 公开详情 |
| POST | `/api/admin/artisans` | 管理员新增 |
| PUT | `/api/admin/artisans/:id` | 管理员修改 |
| DELETE | `/api/admin/artisans/:id` | 管理员删除 |

---

### 5. 展厅作品

| 方法 | 完整地址 | 说明 |
|------|----------|------|
| GET | `/api/works` | 已发布列表；`?userId=&includeDraft=1` 查某用户含草稿 |
| GET | `/api/works/:id` | 单件作品详情 |
| POST | `/api/works` | 保存/发布（DIY 作品集）；JSON 或 `multipart` 字段 `cover` |
| DELETE | `/api/works/:id?userId=` | 删除自己的作品 |

Body 常用字段：`userId`、`title`、`tag`、`desc`、`publish`、`workType`（`model` / `ar_snapshot`）、`image` / `imageKeep`、`id`（更新时）

---

### 6. 留言与点赞（数字化展厅互动）

| 方法 | 完整地址 | 说明 |
|------|----------|------|
| GET | `/api/engagement?workIds=id1,id2&viewerId=` | 批量点赞数、留言数、是否已赞、留言列表 |
| POST | `/api/engagement/like` | 点赞/取消 `{ workId, userId }` |
| GET | `/api/comments?workId=` | 某作品留言列表 |
| POST | `/api/comments` | 发表留言 `{ workId, userId, text }` |
| GET | `/api/admin/comments` | 管理员留言列表 |
| DELETE | `/api/admin/comments/:id` | 管理员删除留言 |

---

### 7. DIY 工作台模型库

| 方法 | 完整地址 | 说明 |
|------|----------|------|
| GET | `/api/studio-models` | 前台模型库列表（GLB） |
| GET | `/api/admin/studio-models` | 管理员列表 |
| POST | `/api/admin/studio-models` | 上传 GLB + 缩略图 |
| PUT | `/api/admin/studio-models/:id` | 修改 |
| DELETE | `/api/admin/studio-models/:id` | 删除 |

上传字段：`glb`（必填）、`thumbnail`（可选）、`name`、`desc`、`sortOrder`

---

### 8. 关于我们

| 方法 | 完整地址 | 说明 |
|------|----------|------|
| GET | `/api/about` | 公开页面数据 |
| GET | `/api/admin/about` | 管理员读取 |
| PUT | `/api/admin/about` | 管理员保存（含图片上传） |

---

## 数据库连接示例

`.env` 中（二选一，密码含 `@` 需编码为 `%40`）：

```env
# 本地开发（默认，可不填）
DATABASE_URL=file:./dev.db
# 生产 PostgreSQL
# DATABASE_URL=postgres://mydb:YOUR_PASSWORD@127.0.0.1:5432/mydb
PORT=3000
JWT_SECRET=请改为随机长字符串
PUBLIC_BASE_URL=
```

## 上传文件

图片、GLB 模型保存在 **`uploads/`** 目录（不在 Git 仓库内），数据库只存路径如 `/uploads/models/xxx.glb`。

访问示例：`/uploads/news/xxx.jpg`

### 为什么重启/更新后台后图片会消失？

常见原因：**更新代码时整包覆盖**，项目内的 `uploads/` 被清空或替换；数据库里仍有路径，但磁盘文件已不存在。

**推荐做法（生产环境必做）：**

1. 在服务器创建独立数据目录（不要放在会随代码部署删除的位置）：

```bash
sudo mkdir -p /var/lib/zhijiansu/uploads
sudo chown -R 你的运行用户:你的运行用户 /var/lib/zhijiansu
```

2. 若已有旧上传文件，先迁移：

```bash
cp -a /path/to/旧后台/uploads/. /var/lib/zhijiansu/uploads/
```

3. 在 `.env` 中指定（**绝对路径**）：

```env
UPLOAD_DIR=/var/lib/zhijiansu/uploads
```

4. 重启 Node 后检查：

```bash
curl /api/health
# 查看 uploadDir 与 uploadFileCount 是否正常
```

**更新后台代码时请注意：**

- 只替换 `src/`、`public/`、`package.json` 等，**不要删除** `uploads/` 或 `UPLOAD_DIR` 指向的目录
- 不要用「删整个项目再解压新包」的方式部署，除非已配置 `UPLOAD_DIR` 在外部目录
- `uploads/*` 已在 `.gitignore` 中，Git 拉代码不会带上传文件，但也不会删除服务器上已有文件

## 与前端对接

frontend `js/api-config.js` 已配置：

```javascript
ZJS.API_BASE = '';
ZJS.USE_BACKEND = true;
```

静态网站与 API 不在同域时，后台已开启 `cors`。若前端部署在 `http://127.0.0.1:8765` 其他端口，直接打开页面即可请求上述接口。

| 前端页面 | 使用的接口（根地址 ``） |
|----------|------------------------------------------------|
| register.html / login.html | `POST /api/users/register`、`POST /api/users/login` |
| profile.html | `GET /api/users/:id`、`PATCH /api/users/:id/profile`、`POST /api/users/:id/avatar` |
| news.html | `GET /api/news` |
| news-detail.html | `GET /api/news/:id` |
| artisans.html | `GET /api/artisans` |
| artisan-co.html | `GET /api/artisans/:id` |
| gallery.html | `GET /api/works`、`GET /api/engagement`、`POST /api/engagement/like`、`POST /api/comments` |
| work.html | `GET /api/works/:id`、`GET /api/engagement`、`POST /api/comments` |
| studio.html | `GET /api/studio-models`、`POST /api/works` |
| about.html | `GET /api/about` |
| 管理后台 | `/admin/` → `POST /api/admin/login` 及 `/api/admin/*` |

## 常见错误

| 报错 | 处理 |
|------|------|
| `Cannot find module 'express'` | 在项目根目录执行 `npm install` |
| 连接失败（`ECONNREFUSED` / 认证失败） | 生产检查 PostgreSQL 是否启动、`.env` 中 `DATABASE_URL` 是否正确；本地默认 SQLite 无需服务 |
| 密码含 `@` | 连接串里写成 `%40` |
| 重启后图片/模型缩略图 404 | 配置 `UPLOAD_DIR` 到项目外持久目录；更新代码勿删 uploads；见上文「上传文件」 |
