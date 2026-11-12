@echo off
REM Backend starter for Windows (replaces old 启动服务.command)
cd /d %~dp0
where node >nul 2>nul || (echo Please install Node.js v22+ & exit /b 1)
if not exist node_modules (
  echo Installing dependencies...
  npm install
)
echo Backend http://127.0.0.1:3000/
echo Admin   http://127.0.0.1:3000/admin/
npm start
