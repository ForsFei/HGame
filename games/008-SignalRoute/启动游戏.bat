@echo off
chcp 65001 >nul
title HGame Library - signal-route
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\..\scripts\start-library.ps1" -Game "signal-route"
if errorlevel 1 pause
