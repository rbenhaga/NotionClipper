# 🎯 RÈGLES AI - Clipper Pro (App Desktop)

## ⚠️ Règles Critiques pour Agents AI

### Mode de Travail Obligatoire
1. **TOUJOURS** proposer un plan AVANT d'implémenter
2. **JAMAIS** modifier plusieurs fichiers sans validation
3. **MODIFICATIONS MINIMALES** : ne toucher que le code nécessaire
4. **REVIEW OBLIGATOIRE** : attendre validation avant chaque étape

### Fichiers Protégés (NE JAMAIS MODIFIER sans demande explicite)
- `package.json`, `pnpm-workspace.yaml`
- `tsconfig.json`, `tsconfig.base.json`
- `vite.config.ts`, `electron.vite.config.ts`
- `.env`, `.env.example`
- Fichiers de routing/navigation

### Fichiers Autorisés (travail autonome possible)
- Composants React (`src/components/`, `src/pages/`)
- Services et hooks (`src/services/`, `src/hooks/`)
- Tests (`*.test.ts`, `*.spec.ts`)
- Documentation (`*.md` sauf README principal)

### Stratégie de Modification
```
1. Lire le fichier complet
2. Identifier le bloc EXACT à modifier
3. Proposer le changement MINIMAL
4. Attendre validation
5. Appliquer
```

## Architecture

**Type:** Monorepo pnpm avec architecture Hexagonale/Adapter

```
ClipperPro/
├── apps/
│   ├── notion-clipper-app/     # Electron + React
│   └── notion-clipper-extension/ # Chrome Extension (WXT)
├── packages/
│   ├── core-shared/            # Logique métier PURE (pas de Node.js!)
│   ├── core-electron/          # Services Electron
│   ├── ui/                     # Composants React
│   ├── adapters-electron/      # Adapters Electron
│   └── i18n/                   # Traductions
└── backend/                    # Backend local (NON UTILISÉ - voir NotionClipperWeb)
```

## Règles Strictes

### 1. Séparation des Packages
- **`core-shared`** : JAMAIS d'imports Node.js (`fs`, `path`, `crypto`)
- **`ui`** : JAMAIS d'appels directs API Notion ou File System
- **`adapters-*`** : Seul lieu pour code spécifique plateforme

### 2. Backend
- L'app utilise **NotionClipperWeb/backend** (pas le backend local)
- URL configurée via `VITE_BACKEND_API_URL`
- OAuth via deep linking (`notion-clipper://auth/callback`)
- Erreurs OAuth transmises via deep link: `notion-clipper://auth/callback?error=xxx`

### 2.1 Base de Données (Contraintes)
- `check_auth_provider`: auth_provider IN ('google', 'notion', 'email')
- Tier en MAJUSCULES: FREE, PREMIUM, GRACE_PERIOD
- 1 workspace Notion = 1 compte utilisateur (anti-abus permanent)

### 3. Quotas Freemium
- FREE: 100 clips/mois, 10 fichiers, 60min focus/compact
- PREMIUM: Illimité
- Toujours vérifier quota AVANT action
- Toujours tracker usage APRÈS succès

### 4. Sécurité
- Tokens Notion chiffrés (AES-256-GCM)
- JWT pour authentification
- Vérification Electron (bloque accès navigateur)

### 5. Éviter la Dette Technique
- **Code propre dès le départ** : Pas de "quick fix" temporaires qui restent
- **Nommage explicite** : Variables/fonctions auto-documentées
- **Pas de code mort** : Supprimer le code commenté ou inutilisé
- **DRY (Don't Repeat Yourself)** : Factoriser le code dupliqué
- **Single Responsibility** : Une fonction = une responsabilité
- **Gestion d'erreurs complète** : Toujours gérer les cas d'erreur
- **Types stricts** : Jamais de `any`, toujours typer explicitement
- **Tests pour code critique** : Fonctions métier testées
- **Documentation inline** : Commenter le "pourquoi", pas le "quoi"
- **Fallbacks gracieux** : Gérer les cas où les APIs/services sont indisponibles
- **Backward compatibility** : Penser à la rétrocompatibilité lors des changements

### 6. Code Style TypeScript/React/Tailwind
- TypeScript strict, jamais de `any`
- `async/await` (jamais `.then()`)
- Logger: `import { logger } from '@notion-clipper/core-shared'`
- Jamais de `console.log` en production

### 7. Conventions React
- Composants = fonctions (jamais de classes)
- Props toujours typées avec interface
- Hooks pour toute logique d'état
- Pas d'inline CSS, uniquement TailwindCSS
- Composants responsive par défaut
- Nommage: `PascalCase` pour composants, `camelCase` pour hooks

### 8. Structure des Composants
```tsx
// 1. Imports
import { useState } from 'react';
import type { ComponentProps } from './types';

// 2. Interface Props
interface MyComponentProps {
  title: string;
  onAction?: () => void;
}

// 3. Composant
export function MyComponent({ title, onAction }: MyComponentProps) {
  // 4. Hooks en premier
  const [state, setState] = useState(false);
  
  // 5. Handlers
  const handleClick = () => { /* ... */ };
  
  // 6. Render
  return <div className="...">{title}</div>;
}
```

## Commandes

```bash
# Développement
pnpm dev

# Build
pnpm build

# Tests
pnpm --filter @notion-clipper/ui test
```

## Points d'Attention

1. **Focus Mode** : Tracking temps automatique (1min intervals)
2. **Compact Mode** : Idem
3. **File Upload** : Vérifier quota avant, tracker après
4. **Offline Mode** : Premium uniquement


## 🔄 Workflows Recommandés

### Nouvelle Fonctionnalité
```
1. "Fais un plan d'implémentation pour [feature]"
2. Valider/modifier le plan
3. "Implémente l'étape 1 uniquement"
4. Review → Valider
5. Répéter pour chaque étape
```

### Refactoring
```
1. "Analyse [fichier] et propose un plan de refactoring"
2. Valider le plan
3. "Applique modification 1 uniquement"
4. Tester → Valider → Suivant
```

### Debug
```
1. "Analyse cette erreur: [erreur]"
2. "Propose des solutions sans modifier le code"
3. Choisir la solution
4. "Applique la solution choisie"
```

## 📝 Prompts Optimisés

### Pour nouvelle feature
> "Tu vas implémenter [feature] pour Clipper Pro (Electron/React/TS/Tailwind). 
> AVANT toute action, écris un plan détaillé avec: étapes, fichiers touchés, risques.
> Tu respectes les RULES.md. Modifications minimales et localisées uniquement."

### Pour correction bug
> "Bug: [description]. Stack: Electron + React + TS.
> 1. Analyse la cause probable
> 2. Propose 2-3 solutions
> 3. Attends ma validation avant de modifier"

### Pour refactoring
> "Refactore [composant/fichier] en respectant:
> - Architecture hexagonale du projet
> - Séparation core-shared (pas de Node.js)
> - Conventions TypeScript strict
> Plan d'abord, implémentation après validation."
