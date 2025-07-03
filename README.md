# Notion Clipper Pro

Application de bureau moderne pour envoyer rapidement du contenu vers Notion. Capturez texte, images, liens et plus encore depuis votre presse-papiers directement vers vos pages Notion.

![Notion Clipper Pro](assets/screenshot.png)

## ✨ Fonctionnalités

- 📋 **Capture automatique du presse-papiers** - Détecte automatiquement le contenu copié
- 🎯 **Envoi ciblé** - Choisissez précisément où envoyer votre contenu dans Notion
- 📝 **Support Markdown** - Convertit automatiquement le Markdown en blocs Notion
- 🖼️ **Gestion des images** - Upload automatique des images via ImgBB
- 🔄 **Synchronisation en temps réel** - Cache intelligent et mise à jour automatique
- ⌨️ **Raccourcis globaux** - `Ctrl+Shift+C` (Windows/Linux) ou `Cmd+Shift+C` (macOS)
- 🎨 **Interface moderne** - Design sombre élégant avec animations fluides
- 💾 **Minimize to tray** - L'application reste accessible dans la barre système

## 🚀 Installation

### Prérequis

- Node.js 18+ et npm
- Python 3.8+
- Git

### Installation depuis les sources

```bash
# Cloner le dépôt
git clone https://github.com/yourusername/NotionClipperPro.git
cd NotionClipperPro

# Installer les dépendances
npm run install:all

# Installer les dépendances Python
pip install -r requirements.txt
```

### Configuration

1. **Token Notion** :
   - Allez sur [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
   - Créez une nouvelle intégration
   - Copiez le token d'intégration
   - Ajoutez l'intégration à vos pages Notion

2. **Clé ImgBB** (optionnel) :
   - Créez un compte sur [https://imgbb.com](https://imgbb.com)
   - Obtenez une clé API gratuite
   - Permet l'upload automatique des images

## 🎮 Utilisation

### Mode développement

```bash
npm run dev
```

Lance simultanément :
- Backend Python sur http://localhost:5000
- Frontend React sur http://localhost:3000
- Application Electron

### Construction

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

### Raccourcis clavier

- `Ctrl+Shift+C` / `Cmd+Shift+C` - Afficher/Masquer l'application
- `Ctrl+V` / `Cmd+V` - Coller le contenu actuel
- `Ctrl+Enter` / `Cmd+Enter` - Envoyer vers Notion
- `Esc` - Masquer la fenêtre

## 🔧 Architecture

```
NotionClipperPro/
├── src/
│   ├── electron/          # Code principal Electron
│   │   ├── main.js       # Process principal
│   │   └── preload.js    # Bridge sécurisé
│   └── react/            # Interface utilisateur
│       ├── src/
│       └── public/
├── backend/              # Serveur Python Flask
│   ├── config.py        # Configuration sécurisée
│   ├── cache.py         # Système de cache
│   ├── martian_parser.py # Parser Markdown→Notion
│   └── utils.py         # Gestion presse-papiers
├── assets/              # Ressources (icônes, etc.)
└── notion_backend.py    # Point d'entrée backend
```

## 🧪 Tests

```bash
# Lancer les tests Python
cd backend && python -m pytest tests/

# Lancer les tests avec coverage
pytest --cov=backend tests/
```

## 🛠️ Développement

### Ajout de nouvelles fonctionnalités

1. **Backend** : Ajouter des routes dans `notion_backend.py`
2. **Frontend** : Modifier `src/react/src/App.jsx`
3. **Electron** : Étendre `src/electron/main.js` pour les fonctionnalités système

### Debugging

- Ouvrir les DevTools : `Ctrl+Shift+I` en mode dev
- Logs backend : Vérifier la console Python
- Logs Electron : Vérifier la console de l'application

## 📦 Distribution

Les builds sont générés dans le dossier `dist-electron/` :
- Windows : `.exe` installer
- macOS : `.dmg` 
- Linux : `.AppImage`

## 🤝 Contribution

1. Fork le projet
2. Créez votre branche (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📄 Licence

Distribué sous licence MIT. Voir `LICENSE` pour plus d'informations.

## 🙏 Remerciements

- [Notion API](https://developers.notion.com/)
- [Electron](https://www.electronjs.org/)
- [React](https://reactjs.org/)
- [Flask](https://flask.palletsprojects.com/)

---

Fait avec ❤️