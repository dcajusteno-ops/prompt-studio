@echo off
echo =========================================
echo       Prompt Studio - Start Script
echo =========================================
echo.

IF NOT EXIST node_modules (
    echo Installing dependencies for the first time...
    npm install
    echo.
)

echo Starting Server...
echo (Please do not close this window)
echo.
echo Opening http://localhost:33333 in your browser shortly...
echo.
start http://localhost:33333
npm run dev
pause
