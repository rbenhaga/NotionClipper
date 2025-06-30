@echo off
echo === Notion Clipper Pro - Mode Production ===
echo.

REM Fermer les anciennes instances
taskkill /F /IM python.exe >nul 2>&1

REM Démarrer le backend
echo [*] Backend Python...
start /B python notion_backend.py

REM Attendre le backend
timeout /t 2 /nobreak >nul

REM Démarrer Electron SANS --dev
echo [*] Interface Electron...
npm start

pause