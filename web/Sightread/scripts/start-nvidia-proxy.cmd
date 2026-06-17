@echo off
cd /d "%~dp0.."
echo Starting Sightread NVIDIA proxy on http://127.0.0.1:8788
echo Keep this window open, or run as a Windows Service / Task Scheduler job.
node server\nvidia-proxy.mjs
