# 指间塑 — 胶东花饽饽文化传播平台

在线展示花饽饽作品、新闻资讯与合作手艺人，支持用户自己动手做面塑 DIY 并分享到数字化展厅。

本文档只讲两件事：**怎么部署上线**，**部署好后怎么用**。

---

## 一、部署方式

### 方式一：服务器正式部署（推荐）

一台 VPS + 一个域名即可，全程 Docker，不需要宝塔、不用手工配 Nginx。

**准备工作**

1. 一台能连公网的服务器（1 核 2G 起），已安装 Docker（含 `docker compose` 插件）
2. 一个域名，已做 DNS 解析指向服务器 IP（例如 `www.example.com` → 服务器 IP）
3. 服务器放行 80 / 443 端口，浏览器能用 HTTPS 访问

**部署步骤**

```bash
# 1. 拿到代码
git clone <本仓库地址> huabobo-v2
cd huabobo-v2

# 2. 填写配置
cp .env.example .env
# 用记事本 / vi 打开 .env，只填 3 项（去掉行首 # 再填）：
# DOMAIN=你的域名（如 www.example.com，不要加 https://）
# POSTGRES_PASSWORD=一个随机强密码
# JWT_SECRET=一串随机长字符串

# 3. 启动（首次会自动建库、导入示例数据、申请 HTTPS 证书）
docker compose up -d --build

# 4. 验证
curl https://你的域名/api/health
# 返回 {"ok":true,"db":"connected",...} 即成功
```

之后直接访问：

| 用途 | 地址 |
|------|------|
| 网站首页 | `https://你的域名` |
| 管理后台 | `https://你的域名/admin/` |
| 管理员初始账号 | `admin` / `zhijiansu@admin`（首次登录后立即改密码） |

**日常维护（记住 3 条就够）**

```bash
docker compose up -d --build        # 更新代码后重新部署
docker compose logs -f backend      # 看后端日志，出问题先看这个
docker compose ps                   # 三个容器都 Up 才算正常
```

**可选功能：数字人语音 / 识图点评**

不填也能用（会自动降级为浏览器发音 + 本地规则）。需要时在 `.env` 里追加后重启即可：

```bash
# OPENAI_API_KEY=sk-开头，任一 OpenAI 兼容站
# OPENAI_BASE_URL=服务商 Base URL（如智谱 https://open.bigmodel.cn/api/paas/v4）
# OPENAI_VISION_MODEL=识图模型 ID
# OPENAI_TEXT_MODEL=文本模型 ID
docker compose up -d --build
```

### 方式二：本地体验（不上线、自己看看）

只需要 Node.js 22 以上。

```bash
# 后端（新开一个终端）
cd backend
cp .env.example .env
npm install
npm start
# 看到监听 3000 即成功

# 前端（再开一个终端）
cd frontend
npm start
# 浏览器打开 http://127.0.0.1:8765
```

管理后台地址：`http://127.0.0.1:3000/admin/`，账号同上。

---

## 二、使用方法

### 1. 访客（不用注册）

- 首页：了解平台，看推荐作品和资讯入口
- 数字化展厅（`展厅`）：浏览大家分享的作品，给作品点赞、留言
- 新闻资讯：看平台动态，点标题进详情
- 合作手艺人：看手艺人介绍，点进个人主页看他的作品
- 关于我们 / 公益 / 花样：了解花饽饽文化和公益项目

### 2. 注册用户（前台右上角 注册 / 登录）

1. 注册一个账号并登录
2. 进 `DIY 工作台`：
   - 先过摄像头授权页（浏览器会要摄像头权限；线上必须用 HTTPS 打开，本地用 `127.0.0.1` 打开）
   - 选一个模型开始捏面塑，做好后点保存（存为草稿）或发布（分享到数字化展厅）
3. 进 `我的`：看自己的主页、草稿和已发布作品
4. 在展厅里给喜欢的作品点赞、留言，留言会显示在作品详情页

### 3. 管理员（`https://你的域名/admin/`）

1. 用 `admin` 账号登录，**第一件事是改密码**
2. 日常操作都在后台左侧菜单：
   - 新闻：发布 / 修改 / 删除前台看到的资讯
   - 合作艺人：新增 / 修改前台展示的手艺人
   - 作品与留言：查看用户发布的作品，删除不当留言
   - 模型库：上传 DIY 工作台用的 `.glb` 模型（可顺手传一张缩略图，没有也行，打开一次会自动补）
   - 关于我们：修改前台“关于我们”页面的文字和图片
   - 用户：查注册用户、重置密码
3. 发布的东西前台实时生效，不用重启

---

## 三、对不上时先看这里

| 现象 | 先查什么 |
|------|----------|
| 打开管理后台登录报 `Failed to fetch` | 必须用 `https://你的域名/admin/` 打开，不要用 IP+端口；再查 `docker compose ps` 三容器是否都 Up |
| `https://你的域名/api/health` 打不开 | `docker compose logs backend` 看报错，多半是 `.env` 里 DOMAIN / 密码写错 |
| 管理后台图片不显示 | `.env` 里 `DOMAIN` 必须和当前访问的域名一致，改完 `docker compose up -d --build` |
| 摄像头打不开 | 浏览器只允许 HTTPS 或 `http://127.0.0.1` 用摄像头，换对应地址重进 |
| 更新代码后图片没了 | 属正常：上传文件存在数据卷里，`git pull` 后只跑 `docker compose up -d --build`，不要删卷 |
