@echo off
chcp 65001 >nul
title HGame Library - card-lab
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\..\scripts\start-library.ps1" -Game "card-lab"
if errorlevel 1 pause
