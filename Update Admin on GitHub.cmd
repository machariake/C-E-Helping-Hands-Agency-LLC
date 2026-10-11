@echo off
cd /d "%~dp0"
echo Updating the public Admin sign-in page...
git add -- auth.mjs public/admin-auth.js
if errorlevel 1 goto failed
git commit --only auth.mjs public/admin-auth.js -m "Remove owner setup instructions from public admin sign-in"
if errorlevel 1 goto failed
git push origin HEAD
if errorlevel 1 goto failed
echo Update uploaded. Check the connected Vercel deployment for completion.
pause
exit /b 0
:failed
echo Update did not complete. Please share the error with Codex.
pause
exit /b 1
