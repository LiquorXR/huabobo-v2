# 指间塑 — Node.js 后台 API

基于 **Express + Drizzle ORM**（生产 PostgreSQL / 本地 SQLite），为前端提供用户注册、新闻资讯、合作艺人、展厅作品、留言与管理员看板接口。

## 服务器地址（统一）

| 用途 | 地址 |
|------|------|
| **服务器 IP** | `8.160.184.132` |
| **API 根地址** | `http://8.160.184.132:3000` |
| **前端静态站** | `http://8.160.184.132`（HTML 页面，端口以实际部署为准） |
| 健康检查 | `GET http://8.160.184.132:3000/api/health` |
| **管理后台页面** | `http://8.160.184.132:3000/admin/` |
| 管理员登录接口 | `POST http://8.160.184.132:3000/api/admin/login` |
| 上传文件访问 | `http://8.160.184.132:3000/uploads/...` |

管理员默认账号：`admin` / `zhijiansu@admin`

下文接口均以 **`http://8.160.184.132:3000`** 为根地址；路径栏也可只写 `/api/...`，自行拼接。

> 若 Nginx 将 API 反代到 80 端口（无 `:3000`），请把文档与配置中的 `http://8.160.184.132:3000` 改为 `http://8.160.184.132`，并同步 `.env` 的 `PUBLIC_BASE_URL` 与frontend `js/api-config.js`。

### 绑定域名（HTTPS）必做

1. **手势 / 摄像头**：浏览器只允许在 **HTTPS**（或 `http://127.0.0.1`）下使用摄像头。用 `http://域名` 打开会误提示「python3 -m http.server」——应改为 **SSL + https://域名**。
2. **展厅点赞 / 留言**：HTTPS 页面不能直连 `http://8.160.184.132:3000`（Mixed Content）。须在 Nginx 把 **`/api`、`/uploads`** 反代到本机 `127.0.0.1:3000`。示例见项目根目录 **`部署/nginx-域名与API反代.conf`**。
3. 上传最新 **`frontend/js/api-config.js`**、**`api-remote.js`**、**`work-engage.js`** 及后台 **`src/routes/engagement.js`** 后重启 Node。
4. 浏览器访问 `https://你的域名/api/health` 应返回 `{"ok":true,...}`。

## 环境要求

- **Node.js v16.9.0 及以上**（推荐与服务器一致使用 16.9.x；可用 `nvm use` 切换，见 `.nvmrc`）
- 生产：PostgreSQL 16（`DATABASE_URL=postgres://USER:PASS@127.0.0.1:5432/mydb`）；本地：SQLite 零依赖（`DATABASE_URL=file:./dev.db`，默认）

检查版本：

```bash
node -v   # 应 >= v16.9.0
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

## 服务器部署（宝塔 / /www/wwwroot/nodejs）

出现 `Cannot find module 'express'` 表示 **未安装依赖**，不是代码错误。

1. 将整个项目上传到服务器，目录需包含：
   - `package.json`
   - `src/`
   - `public/`
   - `.env`（可从 `.env.example` 复制）
   - **不要只上传 `src` 文件夹**

2. SSH 进入项目根目录后执行：

```bash
cd /www/wwwroot/nodejs
node -v          # 确认 >= v16.9.0
npm install      # 必须执行，会生成 node_modules
npm start
```

3. 宝塔「Node 项目」配置建议：
   - **项目路径**：`/www/wwwroot/nodejs`（有 `package.json` 的那一层）
   - **启动文件**：`src/index.js` 或启动命令填 `npm start`
   - **先**在终端对该目录执行一次 `npm install`

4. 若 `npm install` 很慢，可试国内镜像：

```bash
npm install --registry=https://registry.npmmirror.com
```

服务地址：`http://8.160.184.132:3000`

**管理后台**：http://8.160.184.132:3000/admin/

### 管理后台没有新闻 / 合作艺人？

前端页面上的 **3 条新闻、3 位合作艺人** 原先写在 HTML / 本地 `db-seed.js` 里，**不会自动进入数据库**。

服务在 **成功连接数据库后** 会自动写入与前端一致的示例数据（见 `src/seedContent.js`）。也可手动执行：

```bash
cd /www/wwwroot/nodejs   # 你的后台项目目录
npm run seed
```

然后 **重启 Node 项目**，刷新管理后台即可看到 3 条新闻、3 位艺人。

若管理后台图片不显示，在 `.env` 中设置前端站点地址（静态页所在域名）：

```env
FRONTEND_BASE_URL=http://8.160.184.132
```

### 登录出现「Failed to fetch」时

1. 浏览器先打开：http://8.160.184.132:3000/api/health  
   - 能返回 `{"ok":true,...}` → 后台已启动，再试管理页登录。  
   - 打不开 → 在服务器项目目录执行 `npm start`，并在云安全组/宝塔防火墙 **放行 3000 端口**。
2. 管理页请用 **带 3000 端口** 的地址打开：`http://8.160.184.132:3000/admin/`  
   不要用 `http://8.160.184.132/admin/`（80 端口）除非已配置 Nginx 反代到 3000。
3. 管理页登录区展开「无法登录？检查 API 地址」，确认 API 为 `http://8.160.184.132:3000`。
4. 更新代码后需重新上传 `public/admin/` 与 `src/index.js`，并在宝塔 Node 项目中 **重启** 服务。

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

**根地址：** `http://8.160.184.132:3000`

### 0. 健康检查（公开）

| 方法 | 完整地址 |
|------|----------|
| GET | `http://8.160.184.132:3000/api/health` |

响应含 `ok`、`db`（connected/disconnected）、`uploadDir`、`uploadFileCount`。

---

### 1. 管理员

| 方法 | 完整地址 | 说明 |
|------|----------|------|
| POST | `http://8.160.184.132:3000/api/admin/login` | 登录，Body：`{ "username", "password" }` |
| GET | `http://8.160.184.132:3000/api/admin/dashboard` | 数据看板（需 `Authorization: Bearer <token>`） |

管理后台页面：`http://8.160.184.132:3000/admin/`

---

### 2. 用户（注册 / 登录 / 资料）

| 方法 | 完整地址 | 说明 |
|------|----------|------|
| POST | `http://8.160.184.132:3000/api/users/register` | 注册 `{ phone, password, nickname }` |
| POST | `http://8.160.184.132:3000/api/users/login` | 登录 `{ phone, password }` |
| GET | `http://8.160.184.132:3000/api/users/:id` | 用户公开资料 |
| PATCH / POST | `http://8.160.184.132:3000/api/users/:id/profile` | 修改昵称 `{ nickname }` |
| POST | `http://8.160.184.132:3000/api/users/:id/avatar` | 上传头像，`multipart` 字段 `avatar` |

**管理员：**

| 方法 | 完整地址 |
|------|----------|
| GET | `http://8.160.184.132:3000/api/admin/users?page=1&limit=20&keyword=` |
| DELETE | `http://8.160.184.132:3000/api/admin/users/:id` |
| PATCH | `http://8.160.184.132:3000/api/admin/users/:id/password` — Body：`{ "newPassword" }` |

---

### 3. 新闻资讯

| 方法 | 完整地址 | 权限 |
|------|----------|------|
| GET | `http://8.160.184.132:3000/api/news?page=1&limit=10` | 公开列表 |
| GET | `http://8.160.184.132:3000/api/news/:id` | 公开详情 |
| POST | `http://8.160.184.132:3000/api/admin/news` | 管理员发布 |
| PUT | `http://8.160.184.132:3000/api/admin/news/:id` | 管理员修改 |
| DELETE | `http://8.160.184.132:3000/api/admin/news/:id` | 管理员删除 |

发布/修改：`multipart/form-data` — `title`、`summary`、`content`、`publishedAt`、`image`

---

### 4. 合作艺人

| 方法 | 完整地址 | 权限 |
|------|----------|------|
| GET | `http://8.160.184.132:3000/api/artisans` | 公开列表 |
| GET | `http://8.160.184.132:3000/api/artisans/:id` | 公开详情 |
| POST | `http://8.160.184.132:3000/api/admin/artisans` | 管理员新增 |
| PUT | `http://8.160.184.132:3000/api/admin/artisans/:id` | 管理员修改 |
| DELETE | `http://8.160.184.132:3000/api/admin/artisans/:id` | 管理员删除 |

---

### 5. 展厅作品

| 方法 | 完整地址 | 说明 |
|------|----------|------|
| GET | `http://8.160.184.132:3000/api/works` | 已发布列表；`?userId=&includeDraft=1` 查某用户含草稿 |
| GET | `http://8.160.184.132:3000/api/works/:id` | 单件作品详情 |
| POST | `http://8.160.184.132:3000/api/works` | 保存/发布（DIY 作品集）；JSON 或 `multipart` 字段 `cover` |
| DELETE | `http://8.160.184.132:3000/api/works/:id?userId=` | 删除自己的作品 |

Body 常用字段：`userId`、`title`、`tag`、`desc`、`publish`、`workType`（`model` / `ar_snapshot`）、`image` / `imageKeep`、`id`（更新时）

---

### 6. 留言与点赞（数字化展厅互动）

| 方法 | 完整地址 | 说明 |
|------|----------|------|
| GET | `http://8.160.184.132:3000/api/engagement?workIds=id1,id2&viewerId=` | 批量点赞数、留言数、是否已赞、留言列表 |
| POST | `http://8.160.184.132:3000/api/engagement/like` | 点赞/取消 `{ workId, userId }` |
| GET | `http://8.160.184.132:3000/api/comments?workId=` | 某作品留言列表 |
| POST | `http://8.160.184.132:3000/api/comments` | 发表留言 `{ workId, userId, text }` |
| GET | `http://8.160.184.132:3000/api/admin/comments` | 管理员留言列表 |
| DELETE | `http://8.160.184.132:3000/api/admin/comments/:id` | 管理员删除留言 |

---

### 7. DIY 工作台模型库

| 方法 | 完整地址 | 说明 |
|------|----------|------|
| GET | `http://8.160.184.132:3000/api/studio-models` | 前台模型库列表（GLB） |
| GET | `http://8.160.184.132:3000/api/admin/studio-models` | 管理员列表 |
| POST | `http://8.160.184.132:3000/api/admin/studio-models` | 上传 GLB + 缩略图 |
| PUT | `http://8.160.184.132:3000/api/admin/studio-models/:id` | 修改 |
| DELETE | `http://8.160.184.132:3000/api/admin/studio-models/:id` | 删除 |

上传字段：`glb`（必填）、`thumbnail`（可选）、`name`、`desc`、`sortOrder`

---

### 8. 关于我们

| 方法 | 完整地址 | 说明 |
|------|----------|------|
| GET | `http://8.160.184.132:3000/api/about` | 公开页面数据 |
| GET | `http://8.160.184.132:3000/api/admin/about` | 管理员读取 |
| PUT | `http://8.160.184.132:3000/api/admin/about` | 管理员保存（含图片上传） |

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
PUBLIC_BASE_URL=http://8.160.184.132:3000
```

## 上传文件

图片、GLB 模型保存在 **`uploads/`** 目录（不在 Git 仓库内），数据库只存路径如 `/uploads/models/xxx.glb`。

访问示例：`http://8.160.184.132:3000/uploads/news/xxx.jpg`

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
curl http://8.160.184.132:3000/api/health
# 查看 uploadDir 与 uploadFileCount 是否正常
```

**更新后台代码时请注意：**

- 只替换 `src/`、`public/`、`package.json` 等，**不要删除** `uploads/` 或 `UPLOAD_DIR` 指向的目录
- 不要用「删整个项目再解压新包」的方式部署，除非已配置 `UPLOAD_DIR` 在外部目录
- `uploads/*` 已在 `.gitignore` 中，Git 拉代码不会带上传文件，但也不会删除服务器上已有文件

## 与前端对接

frontend `js/api-config.js` 已配置：

```javascript
ZJS.API_BASE = 'http://8.160.184.132:3000';
ZJS.USE_BACKEND = true;
```

静态网站与 API 不在同域时，后台已开启 `cors`。若前端部署在 `http://8.160.184.132` 其他端口，直接打开页面即可请求上述接口。

| 前端页面 | 使用的接口（根地址 `http://8.160.184.132:3000`） |
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
| 管理后台 | `http://8.160.184.132:3000/admin/` → `POST /api/admin/login` 及 `/api/admin/*` |

## 常见错误

| 报错 | 处理 |
|------|------|
| `Cannot find module 'express'` | 在项目根目录执行 `npm install` |
| 连接失败（`ECONNREFUSED` / 认证失败） | 生产检查 PostgreSQL 是否启动、`.env` 中 `DATABASE_URL` 是否正确；本地默认 SQLite 无需服务 |
| 密码含 `@` | 连接串里写成 `%40` |
| 重启后图片/模型缩略图 404 | 配置 `UPLOAD_DIR` 到项目外持久目录；更新代码勿删 uploads；见上文「上传文件」 |
