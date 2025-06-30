#!/bin/bash
echo "🚀 Démarrage de Notion Clipper Pro en mode développement..."

# Démarrer le backend Python en arrière-plan
echo "🐍 Démarrage du backend Python..."
python notion_backend.py &
BACKEND_PID=$!

# Attendre que le backend démarre
sleep 3

# Démarrer React en mode développement
echo "⚛️  Démarrage du serveur React..."
cd src/react && npm start &
REACT_PID=$!

# Attendre que React démarre
sleep 5

# Démarrer Electron
echo "⚡ Démarrage d'Electron..."
npm run start:electron

# Nettoyer les processus à la fin
kill $BACKEND_PID $REACT_PID
