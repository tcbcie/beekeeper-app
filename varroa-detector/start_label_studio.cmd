@echo off
REM ============================================
REM Label Studio Startup Script
REM ============================================
REM
REM This script starts Label Studio for annotating
REM varroa mite images for the ML training pipeline.
REM
REM Prerequisites:
REM   1. Create virtual environment: python -m venv venv
REM   2. Activate and install: venv\Scripts\activate && pip install label-studio
REM
REM Usage:
REM   Just double-click this file or run from command prompt
REM
REM Default URL: http://localhost:8080
REM ============================================

echo.
echo ========================================
echo   Starting Label Studio
echo ========================================
echo.

REM Change to the script's directory
cd /d "%~dp0"

REM Check if venv exists
if not exist "venv\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found!
    echo.
    echo Please create it first:
    echo   python -m venv venv
    echo   venv\Scripts\activate
    echo   pip install label-studio
    echo.
    pause
    exit /b 1
)

REM Activate the virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Check if label-studio is installed
where label-studio >nul 2>&1
if errorlevel 1 (
    echo ERROR: label-studio is not installed!
    echo.
    echo Please install it:
    echo   pip install label-studio
    echo.
    pause
    exit /b 1
)

REM ============================================
REM Environment Variables
REM ============================================

REM Enable serving local files (required for loading images from disk)
set LABEL_STUDIO_LOCAL_FILES_SERVING_ENABLED=true

REM Set the root directory for local files (the data folder)
set LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT=%~dp0data

REM Optional: Set a specific port (default is 8080)
REM set LABEL_STUDIO_PORT=8080

REM Optional: Disable signup for single-user setup
REM set LABEL_STUDIO_DISABLE_SIGNUP_WITHOUT_LINK=true

REM Optional: Set database location (default is in user home)
REM set LABEL_STUDIO_DATABASE=sqlite:///%~dp0data\label_studio.db

echo.
echo Environment configured:
echo   LOCAL_FILES_SERVING: enabled
echo   DOCUMENT_ROOT: %LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT%
echo.
echo Starting Label Studio on http://localhost:8080
echo Press Ctrl+C to stop
echo.

REM Start Label Studio
label-studio start

REM Deactivate on exit
deactivate
