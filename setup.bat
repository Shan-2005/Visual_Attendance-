@echo off
title Setup - VisionAttend AI
echo ============================================================
echo  Installing Dependencies for VisionAttend AI
echo ============================================================

cd /d "%~dp0"

echo Creating virtual environment...
python -m venv venv

echo Installing required Python packages...
venv\Scripts\python.exe -m pip install -r requirements.txt

echo.
echo ============================================================
echo  Setup Completed Successfully!
echo  You can now double-click 'run.bat' to launch the system.
echo ============================================================
pause
