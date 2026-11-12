#!/bin/bash
# Frontend dev server via npm (zero-dep static server in scripts/serve.js)
# Serves ./frontend so Chrome can use camera over http (don't double-click HTML).
cd "$(dirname "$0")"
export PORT="${PORT:-8765}"
if ! command -v node >/dev/null 2>&1; then
  echo "node not found, please install Node.js >= 18" >&2
  exit 1
fi
echo "Serving frontend on http://127.0.0.1:${PORT}/digital.html"
echo "Press Ctrl+C to stop."
npm start
