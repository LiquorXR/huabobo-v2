#!/bin/bash
# Frontend static server (replaces old 本地服务.command, portable Linux/macOS/WSL)
# Serves ./frontend so Chrome can use camera over http (don't double-click HTML).
cd "$(dirname "$0")"
PORT=${PORT:-8765}
if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 not found, please install Python 3" >&2
  exit 1
fi
echo "Serving frontend on http://127.0.0.1:${PORT}/digital.html"
echo "Press Ctrl+C to stop."
python3 -m http.server "$PORT"
