# Notion Clipper Pro 🚀

Application desktop moderne pour envoyer instantanément du contenu vers vos pages Notion.

![Notion Clipper Pro](./assets/screenshot.png)

## ✨ Fonctionnalités

- 📋 **Copier-coller intelligent** : Détecte automatiquement texte, images, vidéos, audio et tableaux
- 🎯 **Envoi rapide** : Raccourci clavier `Ctrl+Shift+C` pour un accès instantané  
- 📝 **Rendu Markdown** : Visualisation du contenu avec formatage Notion
- 🔄 **Synchronisation temps réel** : Mise à jour automatique des pages
- 🔐 **Sécurisé** : Chiffrement des clés API
- 🎨 **Interface moderne** : Design inspiré de Notion

## 📋 Prérequis

- **Node.js** 16+ et npm
- **Python** 3.8+
- **Compte Notion** avec une intégration API

## 🚀 Installation

1. **Cloner le repository**
   ```bash
   git clone https://github.com/yourusername/notion-clipper-pro.git
   cd notion-clipper-pro
   ```

2. **Installer les dépendances**
   ```bash
   npm run install:deps
   pip install -r requirements.txt
   ```

3. **Configuration**
   - Créer une intégration Notion sur https://www.notion.so/my-integrations
   - Copier le token d'intégration
   - L'app vous guidera lors du premier lancement

## 🎮 Utilisation

### Mode développement
```bash
npm run dev
# ou
./dev.sh (Mac/Linux)
./dev.bat (Windows)
```

### Mode production
```bash
npm run prod
```

### Build pour distribution
```bash
npm run build:win   # Windows
npm run build:mac   # macOS
npm run build:linux # Linux
```

## ⌨️ Raccourcis

- `Ctrl+Shift+C` : Ouvrir/fermer l'application
- `Enter` : Envoyer le contenu
- `Escape` : Fermer les dialogues

## 🏗️ Architecture

```
notion-clipper-pro/
├── src/
│   ├── electron/     # Application Electron
│   └── react/        # Interface React
├── backend/          # Modules Python
│   ├── config.py     # Configuration
│   ├── cache.py      # Gestion du cache
│   ├── routes.py     # API endpoints
│   └── utils.py      # Utilitaires
├── tests/            # Tests automatisés
└── assets/           # Ressources
```

## 🧪 Tests

```bash
# Tests backend
pytest

# Tests frontend
cd src/react && npm test
```

## 📝 Licence

MIT - Voir [LICENSE](./LICENSE)

## 🤝 Contribution

Les contributions sont bienvenues ! Voir [CONTRIBUTING.md](./CONTRIBUTING.md)