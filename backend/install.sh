#!/bin/bash
# 在 backend/ 目录执行：bash install.sh
set -e
cd "$(dirname "$0")"
echo "当前目录: $(pwd)"
echo "Node 版本: $(node -v)"
if [ ! -f package.json ]; then
  echo "错误: 未找到 package.json，请确认在后台项目根目录执行"
  exit 1
fi
npm install --registry=https://registry.npmmirror.com
echo ""
echo "安装完成。接下来可执行: npm start"
