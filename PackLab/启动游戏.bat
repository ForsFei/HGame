@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Please install Node.js 22 or later.
 pause
 exit /b 1
)
echo PackLab: http://127.0.0.1:43172
start "" /b powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:43172'"
node server.mjs
pause
