@echo off
REM Frontend static server for Windows (replaces old 本地服务.command)
cd /d %~dp0
set PORT=8765
where python >nul 2>nul || (echo Please install Python 3 & exit /b 1)
echo Serving frontend on http://127.0.0.1:%PORT%/digital.html
python -m http.server %PORT%
