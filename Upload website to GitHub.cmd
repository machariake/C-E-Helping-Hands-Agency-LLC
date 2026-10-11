@echo off
title Upload C&E website to GitHub
cd /d "%~dp0GitHub upload"
echo Uploading the prepared website source. Private records are excluded.
echo Complete GitHub sign-in if prompted.
git -c http.sslBackend=openssl push -u origin main
if errorlevel 1 (
 echo Upload did not complete. Please share the error message with Codex.
) else (
 echo Upload completed successfully.
)
pause
