@echo off
echo === Build de Notion Clipper Pro ===
echo.

echo [1] Installation de react-scripts...
npm install react-scripts --save-dev

echo.
echo [2] Copie des fichiers React...
if not exist "src\App.jsx" (
    echo ERREUR: src\App.jsx manquant!
    echo Copiez App.jsx et App.css dans le dossier src\
    pause
    exit /b 1
)

echo.
echo [3] Build de l'interface React...
npx react-scripts build

echo.
echo [+] Build termine!
echo Vous pouvez maintenant lancer avec start.bat
pause