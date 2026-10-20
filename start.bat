@echo off
cd /d "%~dp0"
start "NHL API" /min cmd /k "npm run dev:api"
start "NHL Web" /min cmd /k "npm run dev:web"
timeout /t 15 /nobreak >nul
start http://localhost:5173
