@echo off
title VisionAttend AI - Classroom Attendance System
echo ============================================================
echo  Starting VisionAttend AI Classroom Attendance System
echo ============================================================

:: Check if virtual environment exists
if exist "%~dp0venv\Scripts\python.exe" (
    echo Using local virtual environment...
    set "PYTHON_EXE=%~dp0venv\Scripts\python.exe"
) else (
    echo Using global Python...
    set "PYTHON_EXE=python"
)

:: Open browser after 2 seconds
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://127.0.0.1:5500"

:: Launch Flask server
cd /d "%~dp0"
"%PYTHON_EXE%" app.py

pause
