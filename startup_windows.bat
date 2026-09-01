@echo off
setlocal enabledelayedexpansion
title Desktop Buddy - Startup

set PROJECT_ROOT=%~dp0
set BACKEND_PORT=8000
set FRONTEND_PORT=3000

echo ========================================================
echo 🐾 Starting Desktop Buddy...
echo ========================================================

:: We will just use the default ports for Windows to keep it simple and stable.
set NEXT_PUBLIC_API_URL=http://localhost:%BACKEND_PORT%

echo [1/3] Launching FastAPI Backend on port %BACKEND_PORT%...
cd "%PROJECT_ROOT%backend"
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
)
start "Desktop Buddy - Backend" cmd /c "python -m uvicorn main:app --host 0.0.0.0 --port %BACKEND_PORT% --reload"

echo [2/3] Launching Next.js UI on port %FRONTEND_PORT%...
cd "%PROJECT_ROOT%frontend"
start "Desktop Buddy - Frontend" cmd /c "npm run dev -- -p %FRONTEND_PORT%"

:: Wait a bit for servers to start
echo Waiting for servers to initialize...
timeout /t 10 /nobreak >nul

echo [3/3] Launching Electron Desktop Pet Widget...
cd "%PROJECT_ROOT%electron-desktop"
set ELECTRON_DEV=true
start "Desktop Buddy - Electron" cmd /c "npx electron ."

echo.
echo ========================================================
echo ✨ Desktop Buddy App is running!
echo  Desktop: Floating Widget + System Tray
echo  Web Mirror: http://localhost:%FRONTEND_PORT%
echo  Backend: http://localhost:%BACKEND_PORT%
echo ========================================================
echo You can close this console window now.
pause
