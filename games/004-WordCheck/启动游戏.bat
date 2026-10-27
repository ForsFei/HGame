@echo off
chcp 65001 >nul
title HGame Library - word-check
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\..\scripts\start-library.ps1" -Game "word-check"
if errorlevel 1 pause
