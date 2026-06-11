@echo off
echo =========================================
echo       Prompt Studio - Start Script
echo =========================================
echo.
echo Starting Server...
echo (Please do not close this window)
echo.
echo Opening http://localhost:33333 in your browser shortly...
echo.
start http://localhost:33333
npm run dev
pause
