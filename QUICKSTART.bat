@echo off
REM Email Verifier Platform - Quick Start Script for Windows

title Email Verifier Platform - Quick Start
echo.
echo ======================================
echo Email Verifier Platform - Quick Start
echo ======================================
echo.

REM Backend setup
echo [BACKEND] Setting up backend...
cd backend

if not exist .env (
    echo [BACKEND] Creating .env from .env.example
    copy .env.example .env
    echo [BACKEND] .env created
    echo.
    echo [WARNING] Edit backend\.env and set a secure API_KEY
) else (
    echo [BACKEND] .env already exists
)

if not exist node_modules (
    echo [BACKEND] Installing dependencies...
    call npm install
    echo [BACKEND] Dependencies installed
) else (
    echo [BACKEND] Dependencies already installed
)

REM Create upload/download directories
if not exist uploads mkdir uploads
if not exist downloads mkdir downloads
echo [BACKEND] Created upload and download directories

echo.
cd ..

REM Frontend setup
echo [FRONTEND] Setting up frontend...
cd frontend

if not exist .env (
    echo [FRONTEND] Creating .env from .env.example
    copy .env.example .env
    echo [FRONTEND] .env created
    echo.
    echo [WARNING] Edit frontend\.env and use the same API_KEY from backend
) else (
    echo [FRONTEND] .env already exists
)

if not exist node_modules (
    echo [FRONTEND] Installing dependencies...
    call npm install
    echo [FRONTEND] Dependencies installed
) else (
    echo [FRONTEND] Dependencies already installed
)

echo.
cd ..

echo.
echo ======================================
echo Setup complete!
echo ======================================
echo.
echo [NEXT STEPS]
echo 1. Edit backend\.env and set a secure API_KEY
echo 2. Edit frontend\.env and use the same API_KEY
echo.
echo [START THE APPLICATION]
echo.
echo Terminal 1 ^(Backend^):
echo   cd backend
echo   npm run dev
echo.
echo Terminal 2 ^(Frontend^):
echo   cd frontend
echo   npm run dev
echo.
echo [DOCUMENTATION]
echo   - Read SETUP.md for detailed setup instructions
echo   - Read README.md for project overview
echo   - Read ARCHITECTURE.md for technical details
echo.
pause
