#!/bin/bash
# Backend starter (replaces old 启动服务.command)
set -e
cd "$(dirname "$0")"
# Requires Node.js >= v16.9.0 (see .nvmrc)
node -v 2>/dev/null || { echo "Please install Node.js v16.9.0+"; exit 1; }
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi
echo "Backend http://0.0.0.0:3000 (see .env PORT)"
echo "Admin    http://127.0.0.1:3000/admin/"
npm start
