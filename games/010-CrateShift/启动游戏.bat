@echo off
chcp 65001 >nul
title HGame Library - crate-shift
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\..\scripts\start-library.ps1" -Game "crate-shift"
if errorlevel 1 pause
