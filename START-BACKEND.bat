@echo off
echo ========================================
echo School Management System - Startup
echo ========================================
echo.

echo [1/3] Checking if we're in the right directory...
cd /d P:\MyProject\BackEnd
echo Current directory: %cd%
echo.

echo [2/3] Starting Backend Server...
echo Port: 5001
echo.
npm start

echo.
echo [3/3] If you see "Server running on http://localhost:5001"
echo then the backend is working!
echo.
pause
