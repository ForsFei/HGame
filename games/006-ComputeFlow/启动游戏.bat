@echo off
chcp 65001 >nul
title HGame Library - compute-flow
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\..\scripts\start-library.ps1" -Game "compute-flow"
if errorlevel 1 pause
