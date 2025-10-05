# Notion Clipper Pro - Monorepo

Application de bureau moderne pour envoyer rapidement du contenu vers Notion. Capturez texte, images, liens et plus encore depuis votre presse-papiers directement vers vos pages Notion.

> 🚀 **Nouveau**: Architecture monorepo avec pnpm workspaces pour une meilleure organisation du code.

## ✨ Fonctionnalités

- 📋 **Capture automatique du presse-papiers** - Détecte automatiquement le contenu copié
- 🎯 **Envoi ciblé** - Choisissez précisément où envoyer votre contenu dans Notion
- 📝 **Support Markdown avancé** - Parser unifié pour tous types de contenu
- 🖼️ **Gestion des images** - Upload automatique des images directement vers Notion
- 🔄 **Synchronisation en temps réel** - Cache intelligent et mise à jour automatique
- ⌨️ **Raccourcis globaux** - `Ctrl+Shift+C` (Windows/Linux) ou `Cmd+Shift+C` (macOS)
- 🎨 **Interface moderne** - Design élégant avec animations fluides
- 💾 **Minimize to tray** - L'application reste accessible dans la barre système
- 🚀 **Performance optimisée** - Architecture modulaire et code refactorisé

## 🚀 Installation

### Prérequis

- Node.js 18+ et npm
- Python 3.8+
- Git

### Installation depuis les sources

```bash
# Cloner le dépôt
git clone https://github.com/rbenhaga/NotionClipper.git
cd NotionClipper

# Installer pnpm (si pas déjà installé)
npm install -g pnpm

# Installer toutes les dépendances du monorepo
pnpm install

# Installer les dépendances Python
pip install -r requirements.txt
```

### Configuration

1. **Token Notion** :
   - Allez sur [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
   - Créez une nouvelle intégration
   - Copiez le token d'intégration
   - Ajoutez l'intégration à vos pages Notion

2. (Plus besoin d'ImgBB) L'upload d'images utilise désormais l'API Notion directement.

## 🎮 Utilisation

### Mode développement

```bash
# Démarrer l'application en mode développement
pnpm dev
```

Lance simultanément :
- Backend Python sur http://localhost:5000
- Frontend React sur http://localhost:3000  
- Application Electron

### Construction

```bash
# Construire l'application
pnpm build
```

### Tests

```bash
# Lancer tous les tests
pnpm test

# Nettoyer les builds
pnpm clean
```

### Raccourcis clavier

- `Ctrl+Shift+C` / `Cmd+Shift+C` - Afficher/Masquer l'application
- `Ctrl+V` / `Cmd+V` - Coller le contenu actuel
- `Ctrl+Enter` / `Cmd+Enter` - Envoyer vers Notion
- `Esc` - Masquer la fenêtre

## 🔧 Architecture Monorepo

```
NotionClipper/
├── pnpm-workspace.yaml     # Configuration workspace pnpm
├── package.json            # Configuration monorepo root
├── apps/                   # Applications
│   └── notion-clipper-app/ # Application principale
│       ├── package.json    # Dépendances app
│       ├── src/
│       │   ├── electron/   # Code principal Electron
│       │   │   ├── main.js # Process principal avec handlers IPC
│       │   │   └── preload.js # Bridge sécurisé optimisé
│       │   └── react/      # Interface utilisateur
│       │       ├── src/
│       │       │   ├── components/ # Composants modulaires
│       │       │   ├── hooks/      # Hooks personnalisés
│       │       │   └── utils/      # Utilitaires
│       │       └── public/
│       └── assets/         # Ressources (icônes, etc.)
├── packages/               # Packages partagés (futurs)
├── backend/                # Serveur Python Flask
│   ├── config.py          # Configuration sécurisée
│   ├── cache.py           # Système de cache
│   ├── enhanced_content_parser.py # Parser unifié
│   └── utils.py           # Gestion presse-papiers
├── tests/                 # Tests unitaires
└── notion_backend.py      # Point d'entrée backend optimisé
```

## 🆕 Améliorations récentes

### Performance
- ⚡ Parser de contenu unifié (suppression des doublons)
- 🗑️ Suppression des dépendances non utilisées (-30% taille bundle)
- 🔄 Handlers IPC complets pour une meilleure réactivité

### Fiabilité  
- ✅ Tests unitaires corrigés et étendus
- 🛡️ Gestion d'erreurs améliorée
- 📊 SSE optimisé pour les mises à jour temps réel

### Maintenabilité
- 📁 Architecture React modulaire
- 🧹 Code nettoyé et documenté
- 🔧 Configuration simplifiée

## 🧪 Développement

### Structure des composants

Le projet utilise maintenant une architecture modulaire :

```
components/
├── common/        # Composants réutilisables
├── layout/        # Mise en page
├── pages/         # Gestion des pages Notion
├── settings/      # Configuration
├── editor/        # Édition de contenu
└── onboarding/    # Première utilisation
```

### Ajout de nouvelles fonctionnalités

1. **Backend** : Étendre `notion_backend.py` ou créer un nouveau module
2. **Frontend** : Créer un nouveau composant dans le dossier approprié
3. **Electron** : Ajouter les handlers IPC nécessaires dans `main.js`

### Debugging

- Ouvrir les DevTools : `Ctrl+Shift+I` en mode dev
- Logs backend : Console Python avec niveaux de log
- Logs Electron : Console de l'application
- Tests : `npm test` pour lancer toute la suite

## 📦 Distribution

Les builds sont générés dans le dossier `dist-electron/` :
- Windows : `.exe` installer NSIS
- macOS : `.dmg` avec signature
- Linux : `.AppImage` portable

## 🤝 Contribution

1. Fork le projet
2. Créez votre branche (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

### Guidelines

- Suivre la structure modulaire existante
- Ajouter des tests pour les nouvelles fonctionnalités
- Documenter les changements dans le CHANGELOG
- Utiliser les hooks Git pour la validation du code

## 📜 Licence

**Propriétaire - Usage personnel uniquement**

Copyright © 2025 Rayane Ben Haga. Tous droits réservés.

## 🙏 Remerciements

- [Notion API](https://developers.notion.com/)
- [Electron](https://www.electronjs.org/)
- [React](https://reactjs.org/)
- [Flask](https://flask.palletsprojects.com/)
- Tous les contributeurs du projet

---

Fait avec ❤️ par l'équipe Notion Clipper Pro