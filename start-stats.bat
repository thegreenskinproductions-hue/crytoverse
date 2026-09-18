@echo off
title Crytoverse Statistics
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found on PATH.
  echo         Install Node.js from https://nodejs.org first.
  pause
  exit /b 1
)

echo Starting Crytoverse Statistics...
call npm run app
