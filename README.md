# Notion Clipper Pro

Application de bureau moderne pour envoyer rapidement du contenu vers Notion. Capturez texte, images, liens et plus encore depuis votre presse-papiers directement vers vos pages Notion.

## ✨ Fonctionnalités

- 📋 **Capture automatique du presse-papiers** - Détecte automatiquement le contenu copié
- 🎯 **Envoi ciblé** - Choisissez précisément où envoyer votre contenu dans Notion
- 📝 **Support Markdown avancé** - Parser unifié pour tous types de contenu
- 🖼️ **Gestion des images** - Upload automatique des images via ImgBB
- 🔄 **Synchronisation en temps réel** - Cache intelligent et mise à jour automatique
- ⌨️ **Raccourcis globaux** - `Ctrl+Shift+C` (Windows/Linux) ou `Cmd+Shift+C` (macOS)
- 🎨 **Interface moderne** - Design sombre élégant avec animations fluides
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
cd NotionClipperPro

# Installer les dépendances
npm run install:all

# Installer les dépendances Python
pip install -r requirements.txt
```

### Migration depuis une version antérieure

Si vous avez une version antérieure installée, exécutez le script de migration :

```bash
python migrate.py
```

Ce script va :
- Créer une sauvegarde de votre configuration
- Nettoyer les fichiers obsolètes
- Mettre à jour les dépendances
- Optimiser la structure du projet

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

3. **Page de prévisualisation** (nouveau) :
   - La page de preview est maintenant créée automatiquement
   - Vous pouvez spécifier une page parent dans les paramètres

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

### Tests

```bash
# Tests backend Python
npm run test:backend

# Tests frontend React
npm run test:frontend

# Tous les tests
npm test
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
│   │   ├── main.js       # Process principal avec handlers IPC
│   │   └── preload.js    # Bridge sécurisé optimisé
│   └── react/            # Interface utilisateur
│       ├── src/
│       │   ├── components/  # Composants modulaires
│       │   ├── hooks/       # Hooks personnalisés
│       │   └── utils/       # Utilitaires
│       └── public/
├── backend/              # Serveur Python Flask
│   ├── config.py        # Configuration sécurisée
│   ├── cache.py         # Système de cache
│   ├── enhanced_content_parser.py # Parser unifié
│   └── utils.py         # Gestion presse-papiers
├── tests/               # Tests unitaires
├── assets/              # Ressources (icônes, etc.)
└── notion_backend.py    # Point d'entrée backend optimisé
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

## 📄 Licence

Distribué sous licence MIT. Voir `LICENSE` pour plus d'informations.

## 🙏 Remerciements

- [Notion API](https://developers.notion.com/)
- [Electron](https://www.electronjs.org/)
- [React](https://reactjs.org/)
- [Flask](https://flask.palletsprojects.com/)
- Tous les contributeurs du projet

---

Fait avec ❤️ par l'équipe Notion Clipper Pro