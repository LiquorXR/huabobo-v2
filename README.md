# huabobo-v2

Standard layout (no Chinese directory names):

```
huabobo-v2/
  backend/          # Express + Mongo API (was 后台代码)
    src/            # index.js, config.js, db.js, routes/, models/, middleware/, utils/
    public/admin/   # admin console (vendor/ = three.js + built thumb bundle)
    scripts/        # check-deps.js, build-admin-thumb.mjs, admin-thumb-entry.mjs
    uploads/        # runtime uploads (gitignored, only .gitkeep tracked)
    start.sh / start.bat        # replaces 启动服务.command
    start-macos.sh              # original macOS starter (reference)
    install.sh / package.json / .nvmrc / .env.example
  frontend/         # MPA static site (was 前端)
    *.html css/ js/ images/ models/ scripts/
    start.sh / start.bat        # python http.server :8765 (replaces 本地服务.command)
    start-macos.sh              # original macOS starter (reference)
    ARCHITECTURE.md
  assets/           # NOT in git: manual model drop (see assets/README.md)
    model-library/  # gitignored; upload manually after deploy (v1/, v2/, *.glb/*.obj)
  scripts/          # (reserved for repo-level helpers)
```

## Quick start (new machine)

```bash
# backend
cd backend
cp .env.example .env   # fill MONGODB_URI, JWT_SECRET, etc.
npm install
npm start              # or ./start.sh (Windows: start.bat)

# frontend (another terminal)
cd frontend
./start.sh             # Windows: start.bat
# open http://127.0.0.1:8765/digital.html
```

Notes:
- Old `__MACOSX/`, all `.DS_Store`, and `backend/node_modules/` were removed.
- `backend/.env` was kept (contains local secrets); never commit it.
- `backend/public/admin/vendor/` is kept (runtime dependency for 3D preview).
- Chinese `.glb/.obj` basenames under `assets/model-library/` were intentionally kept (local only, gitignored).
