@echo off
chcp 65001 >nul
title HGame Library - pixel-weave
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\..\scripts\start-library.ps1" -Game "pixel-weave"
if errorlevel 1 pause
