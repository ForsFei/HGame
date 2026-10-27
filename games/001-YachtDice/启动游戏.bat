@echo off
chcp 65001 >nul
title HGame Library - yacht-dice
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\..\scripts\start-library.ps1" -Game "yacht-dice"
if errorlevel 1 pause
