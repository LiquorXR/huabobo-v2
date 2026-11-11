#!/bin/bash
# 在「前端」文件夹启动简易网页服务，供 Chrome 调用摄像头（须用 http 地址，不能双击 HTML）
cd "$(dirname "$0")"
PORT=8765
if ! command -v python3 >/dev/null 2>&1; then
  osascript -e 'display alert "未找到 python3，请先安装 Python 3" as critical'
  exit 1
fi
if ! lsof -ti:"$PORT" >/dev/null 2>&1; then
  nohup python3 -m http.server "$PORT" >/tmp/zhijiansu-http.log 2>&1 &
  sleep 1
fi
open "http://127.0.0.1:${PORT}/digital.html"
