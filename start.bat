@echo off
chcp 65001 >nul
title HGame Library
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-library.ps1"
if errorlevel 1 pause
