#!/bin/bash
# 在「前端」文件夹启动开发服务器，供 Chrome 调用摄像头（须用 http 地址，不能双击 HTML）
cd "$(dirname "$0")"
export PORT="${PORT:-8765}"
if ! command -v node >/dev/null 2>&1; then
  osascript -e 'display alert "未找到 node，请先安装 Node.js 18+" as critical'
  exit 1
fi
if ! lsof -ti:"$PORT" >/dev/null 2>&1; then
  nohup npm start >/tmp/zhijiansu-http.log 2>&1 &
  sleep 2
fi
open "http://127.0.0.1:${PORT}/digital.html"
