@echo off
cd /d "%~dp0.."
if "%TAVILY_API_KEY%"=="" (
  echo WARNING: TAVILY_API_KEY is not set. Set it before starting:
  echo   set TAVILY_API_KEY=your_key_from_app.tavily.com
)
echo Starting Sightread search proxy on http://127.0.0.1:8789
node server\search-proxy.mjs
