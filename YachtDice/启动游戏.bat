@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 请先安装 Node.js 22 或更新版本，再运行本文件。
  pause
  exit /b 1
)
echo 快艇骰子正在启动。请保留此窗口，关闭窗口即可停止服务。
echo 浏览器地址：http://127.0.0.1:43170
start "" /b powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:43170'"
node server.mjs
pause
