@echo off
title PageTurners Development Environment

echo 🚀 Starting PageTurners Development Environment...
echo.

:: 1. Start Backend in the background
echo [SYSTEM] Starting Backend (Flask)...
cd pageturners-backend

:: Activate the Windows virtual environment
:: Note: Windows uses 'Scripts' instead of 'bin'
call venv\Scripts\activate

:: Start the Flask app in a separate background process
start /B python backend_app.py

cd ..

:: Give the backend a moment to connect to MongoDB
timeout /t 3 /nobreak > nul

:: 2. Start Frontend in the foreground
echo [SYSTEM] Starting Frontend (Vite)...
cd pageturners-frontend

:: This stays in the foreground so you can see Vite logs
npm run dev

:: After the frontend is closed (Ctrl+C), clean up
echo.
echo Stopping all services...
taskkill /IM python.exe /F >nul 2>&1
echo Backend stopped.
pause