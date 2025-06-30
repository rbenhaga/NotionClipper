@echo off
title Notion Clipper Pro

echo ====================================
echo    NOTION CLIPPER PRO - Demarrage
echo ====================================
echo.

REM Verifier si le backend est deja en cours
netstat -an | findstr :5000 >nul
if %errorlevel% == 0 (
    echo [!] Le port 5000 est deja utilise
    echo [!] Fermeture de l'instance precedente...
    taskkill /F /IM python.exe >nul 2>&1
    timeout /t 2 /nobreak >nul
)

REM Creer les icones si elles n'existent pas
if not exist "public\icon.png" (
    echo [*] Creation des icones...
    python create_icons.py
    if %errorlevel% neq 0 (
        echo [!] Impossible de creer les icones
        echo [!] Installez Pillow: pip install pillow
    )
)

echo [*] Demarrage du backend Python...
start /B python notion_backend.py

echo [*] Attente du demarrage du serveur...
:wait_server
timeout /t 1 /nobreak >nul
curl -s http://localhost:5000/api/pages >nul 2>&1
if %errorlevel% neq 0 goto wait_server

echo [+] Backend demarre avec succes!
echo.
echo [*] Demarrage de l'interface Electron...
echo.
echo ====================================
echo    Raccourcis disponibles:
echo    - Ctrl+Shift+C : Ouvrir
echo    - Escape : Fermer
echo    - Ctrl+R : Rafraichir
echo ====================================
echo.

npm start -- --dev

pause