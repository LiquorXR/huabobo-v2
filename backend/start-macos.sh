#!/bin/bash
cd "$(dirname "$0")"
# 需要 Node.js >= v22（better-sqlite3 v13 要求）
node -v 2>/dev/null || { echo "请先安装 Node.js v22 或更高版本"; exit 1; }
if [ ! -d "node_modules" ]; then
  echo "正在安装依赖…"
  npm install
fi
echo "启动后台 http://127.0.0.1:3000"
echo "管理后台 http://127.0.0.1:3000/admin/"
npm start
