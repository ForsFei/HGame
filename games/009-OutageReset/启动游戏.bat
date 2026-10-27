@echo off
chcp 65001 >nul
title HGame Library - outage-reset
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\..\scripts\start-library.ps1" -Game "outage-reset"
if errorlevel 1 pause
