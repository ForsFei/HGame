@echo off
chcp 65001 >nul
title HGame Library - node-sweep
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\..\scripts\start-library.ps1" -Game "node-sweep"
if errorlevel 1 pause
