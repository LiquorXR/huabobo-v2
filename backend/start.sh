#!/bin/bash
# Backend starter (replaces old 启动服务.command)
set -e
cd "$(dirname "$0")"
# Requires Node.js >= v22 (see .nvmrc; better-sqlite3 v13 requires Node 22+)
node -v 2>/dev/null || { echo "Please install Node.js v22+"; exit 1; }
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi
echo "Backend http://0.0.0.0:3000 (see .env PORT)"
echo "Admin    http://127.0.0.1:3000/admin/"
npm start
