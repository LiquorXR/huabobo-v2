# huabobo-v2

Standard layout (no Chinese directory names):

```
huabobo-v2/
  backend/          # Express + Drizzle (PG prod / SQLite local)
    src/            # index.js, config.js, db/, routes/, middleware/, utils/
    public/admin/   # admin console (vendor/ = three.js + built thumb bundle)
    scripts/        # check-deps.js, smoke.js, build-admin-thumb.mjs, ...
    uploads/        # runtime uploads (gitignored, only .gitkeep tracked)
    drizzle/        # committed PG + SQLite migrations
    start.sh / start.bat
    install.sh / package.json / .nvmrc / .env.example
  frontend/         # MPA static site (was 前端)
    *.html css/ js/ images/ models/ scripts/
    start.sh / start.bat        # npm start（:8765，零依赖静态服务器 scripts/serve.js）
    ARCHITECTURE.md
  web/Caddyfile     # edge: auto HTTPS + static + /api reverse proxy
  docker-compose.yml  # 生产：web + backend + postgres:16
  assets/           # NOT in git: manual model drop (see assets/README.md)
    model-library/  # gitignored; upload manually after deploy (v1/, v2/, *.glb/*.obj)
```

## Quick start (new machine)

```bash
# backend（本地默认 SQLite，零配置）
cd backend
cp .env.example .env   # 默认 DATABASE_URL=file:./dev.db，一般不用改
npm install              # 需要 Node >= 22
npm run seed             # 可选：写入示例数据
npm start              # 或 ./start.sh（Windows: start.bat）

# frontend (another terminal, npm-based, zero deps)
cd frontend
npm start              # http://127.0.0.1:8765/digital.html（或 ./start.sh / start.bat）
```

## Production（Docker，不再需要宝塔）

```bash
cp .env.example .env   # 填写 DOMAIN / POSTGRES_PASSWORD / JWT_SECRET
docker compose up -d --build
curl https://你的域名/api/health
```

详见 `backend/README.md`「服务器部署」一节。VPS 只需 Docker + 80/443/DNS，无需宝塔、Nginx 手工配置、Node 常驻进程。

Notes:
- Old `__MACOSX/`, all `.DS_Store`, and `backend/node_modules/` were removed.
- `backend/.env` was kept (contains local secrets); never commit it.
- `backend/public/admin/vendor/` is kept (runtime dependency for 3D preview).
- Chinese `.glb/.obj` basenames under `assets/model-library/` were intentionally kept (local only, gitignored).
