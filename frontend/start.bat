@echo off
REM Frontend dev server via npm (zero-dep static server in scripts/serve.js)
cd /d %~dp0
if "%PORT%"=="" set PORT=8765
where node >nul 2>nul || (echo Please install Node.js v18+ & exit /b 1)
echo Serving frontend on http://127.0.0.1:%PORT%/digital.html
npm start
