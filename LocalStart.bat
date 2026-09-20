@echo off
setlocal
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js and npm are required to start COMRADCOM.
  echo Install the current Node.js LTS release, then run this file again.
  pause
  exit /b 1
)

echo Starting COMRADCOM locally on port 6542...
echo Open http://localhost:6542 in this computer's browser.
call npm run dev
pause
