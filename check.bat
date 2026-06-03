@echo off
cd /d "%~dp0"
echo === DIAGNOSTIC ===
echo.
echo Current folder:
cd
echo.
echo Python:
python --version
echo.
echo Node:
node --version
echo.
echo .env exists:
if exist "backend\.env" (echo YES) else (echo NO)
echo.
echo dist exists:
if exist "dist\index.html" (echo YES) else (echo NO)
echo.
pause
