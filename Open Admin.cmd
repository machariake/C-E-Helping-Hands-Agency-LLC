@echo off
cd /d "%~dp0"
node launch.mjs admin
if errorlevel 1 pause
