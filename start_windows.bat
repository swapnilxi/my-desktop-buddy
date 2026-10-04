@echo off
setlocal enabledelayedexpansion
title Desktop Buddy - First-Time Setup

echo ========================================================
echo 🐾 Welcome to Desktop Buddy Setup! (Windows)
echo ========================================================
echo.

echo [1/4] Checking prerequisites...
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] python is required but not found in PATH.
    pause
    exit /b 1
)
echo [OK] Python found.

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm is required but not found in PATH.
    pause
    exit /b 1
)
echo [OK] NPM found.

echo.
echo [2/4] Installing Backend Dependencies (FastAPI)...
cd backend
if not exist venv (
    echo Creating virtual environment (venv)...
    python -m venv venv
)
call venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
echo [OK] Backend dependencies installed.
call venv\Scripts\deactivate.bat
cd ..

echo.
echo [3/4] Installing Frontend Dependencies (Next.js)...
cd frontend
call npm install
echo [OK] Frontend dependencies installed.
cd ..

echo.
echo [4/4] Installing Desktop App Dependencies (Electron)...
cd electron-desktop
call npm install
echo [OK] Electron dependencies installed.
cd ..

echo.
echo ========================================================
echo 🎉 Setup Complete! You are ready to go.
echo To start your Desktop Buddy, simply run:
echo   startup_windows.bat
echo ========================================================
pause
