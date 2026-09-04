@echo off
setlocal
title Testify - Local Dev Server
cd /d "%~dp0"

echo.
echo  ==========================================
echo    T E S T I F Y
echo    Smarter Interviews. Better Decisions.
echo  ==========================================
echo.

rem -- 1. Make sure Node.js is installed -------------------------------
where node >nul 2>nul
if errorlevel 1 (
    echo  [ERROR] Node.js was not found on this machine.
    echo          Install Node.js 18 or newer from https://nodejs.org
    echo          then run this script again.
    echo.
    pause
    exit /b 1
)

rem -- 2. Install dependencies on first run ----------------------------
if not exist node_modules (
    echo  [1/3] Installing dependencies - first run only, takes a minute...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo  [ERROR] npm install failed. Check the output above.
        pause
        exit /b 1
    )
    echo.
) else (
    echo  [1/3] Dependencies already installed.
)

rem -- 3. Make sure the .env file exists -------------------------------
if not exist .env (
    copy .env.example .env >nul
    echo  [2/3] No .env file found - created one from .env.example.
    echo.
    echo         Paste your Supabase URL and anon key into the .env file
    echo         that just opened, save it, then run this script again.
    echo         You can find both in the Supabase dashboard under
    echo         Project Settings then API. Full guide: SETUP.md
    echo.
    start notepad .env
    pause
    exit /b 0
)
echo  [2/3] Environment file found.

rem -- 4. Start the dev server and open the browser --------------------
echo  [3/3] Starting the dev server...
echo.
echo         Testify will open at http://localhost:5173
echo         Keep this window open. Press Ctrl+C here to stop.
echo.
start "" cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:5173"
call npm run dev

echo.
pause
