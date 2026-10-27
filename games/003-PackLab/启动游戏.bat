@echo off
chcp 65001 >nul
title HGame Library - pack-lab
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\..\scripts\start-library.ps1" -Game "pack-lab"
if errorlevel 1 pause
