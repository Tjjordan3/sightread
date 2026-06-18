@echo off
cd /d "%~dp0.."
if "%SERPER_API_KEY%"=="" (
  echo WARNING: SERPER_API_KEY is not set. Set it before starting:
  echo   set SERPER_API_KEY=your_key_from_serper.dev
)
echo Starting Sightread search proxy on http://127.0.0.1:8789
node server\search-proxy.mjs
