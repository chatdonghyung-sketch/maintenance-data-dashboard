@echo off
cd /d "%~dp0"

echo.
echo  ============================================================
echo    MDD V4 - Starting...
echo  ============================================================
echo.

:: Python check
python --version >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Python not found.
    echo  Install Python from https://www.python.org
    echo  Check "Add Python to PATH" during install.
    pause
    exit /b 1
)

:: Create .env if missing
if not exist "backend\.env" (
    echo  First time setup - Enter database info:
    echo.
    set "U=postgres"
    set "H=localhost"
    set "Po=5432"
    set "N=mdd_db"
    set /p "U=  DB User     [postgres]  : "
    set /p "P=  DB Password             : "
    set /p "H=  DB Host     [localhost] : "
    set /p "Po=  DB Port    [5432]      : "
    set /p "N=  DB Name     [mdd_db]    : "
    echo DATABASE_URL=postgresql+asyncpg://%U%:%P%@%H%:%Po%/%N%> "backend\.env"
    echo.
    echo  backend\.env created.
    echo.
)

:: Install Python packages
echo  [1/2] Installing Python packages...
python -m pip install -r backend\requirements.txt -q
echo  Done.
echo.

:: Build if needed
if not exist "dist\index.html" (
    where npm >nul 2>&1
    if not errorlevel 1 (
        echo  [2/2] Building frontend...
        npm install
        npm run build
        echo  Done.
        echo.
    ) else (
        echo  ERROR: dist\index.html missing and npm not found.
        pause
        exit /b 1
    )
) else (
    echo  [2/2] Frontend ready.
    echo.
)

:: Start server
echo  ============================================================
echo    URL  : http://localhost:5000/ut-mech/
echo    STOP : Ctrl+C
echo  ============================================================
echo.

python start.py --no-build

echo.
echo  Server stopped.
pause
