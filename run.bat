@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies...
  npm install
)
echo Starting control-platform...
npm run dev -- --host 0.0.0.0 --port 3000
pause
