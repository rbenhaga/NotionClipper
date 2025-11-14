# CLAUDE.MD - Documentation Technique Complète
## Notion Clipper - Apple/Notion Design Overhaul

> **Session ID**: `claude/apple-notion-design-overhaul-017ZfqJ6aV8P1spVi7DYv4wD`
> **Date**: 2025-11-14
> **Objectif**: Correction des bugs critiques + Refonte UI/UX Apple/Notion

---

## 📋 TABLE DES MATIÈRES

1. [Architecture du Projet](#architecture)
2. [Bugs Critiques Corrigés](#bugs-corrigés)
3. [Design System Apple/Notion](#design-system)
4. [Patterns de Code](#patterns)
5. [Pièges à Éviter](#pièges)
6. [Guide de Développement](#guide)
7. [Commandes Utiles](#commandes)

---

## 🏗️ ARCHITECTURE DU PROJET {#architecture}

### Structure Monorepo (pnpm workspaces)

```
NotionClipper/
├── apps/
│   ├── notion-clipper-app/          # Application Electron
│   │   ├── src/electron/            # Main process (Node.js)
│   │   │   ├── ipc/                 # IPC handlers
│   │   │   │   └── notion.ipc.ts    # ⚠️ IMPORTANT: Utiliser import() pour ESM
│   │   │   └── main.ts
│   │   └── src/react/               # Renderer process (React)
│   │       └── App.tsx              # Point d'entrée UI
│   └── notion-clipper-extension/    # Extension navigateur
│
├── packages/
│   ├── core-shared/                 # ⭐ Core business logic
│   │   ├── src/services/
│   │   │   └── subscription.service.ts  # ⚠️ Retourner FREE au lieu de null
│   │   └── src/types/
│   │
│   ├── ui/                          # ⭐ Components React (ESM MODULE)
│   │   ├── package.json             # ⚠️ "type": "module" - Utiliser import()
│   │   ├── src/components/
│   │   │   ├── auth/AuthScreen.tsx  # ⚠️ Nécessite supabaseUrl+Key
│   │   │   ├── panels/ConfigPanel.tsx
│   │   │   ├── editor/ContentEditor.tsx
│   │   │   └── onboarding/Onboarding.tsx
│   │   ├── src/services/
│   │   │   └── AuthDataManager.ts   # Source de vérité auth
│   │   └── dist/index.js            # Build ESM
│   │
│   └── i18n/                        # Internationalisation
│
└── supabase/
    └── functions/                   # Edge Functions
        ├── get-notion-token/
        ├── save-notion-connection/
        ├── get-user-by-workspace/   # ⚠️ Utilisé pour auto-reconnect
        └── create-user/
```

### Flux d'Authentification

```
┌─────────────────────────────────────────────────────────────────┐
│                     AUTHENTIFICATION FLOW                        │
└─────────────────────────────────────────────────────────────────┘

1. AuthScreen (UI)
   ├─ Google OAuth → Google popup → userId + email + avatarUrl
   ├─ Notion OAuth → Notion popup → workspaceId + token
   └─ Email/Password → Supabase Auth → userId + email

2. AuthDataManager (Service)
   ├─ saveAuthData() → Supabase (user_profiles + notion_connections)
   ├─ loadAuthData() → Cascade: Memory → Supabase → Electron → localStorage
   └─ loadNotionConnection() → Edge Function (get-notion-token)

3. Onboarding
   ├─ Étape 1: Auth (Google/Notion/Email)
   ├─ Étape 2: Notion Connection (si pas déjà via OAuth)
   └─ Étape 3: Premium (Trial/Pay/Stay Free)

4. App.tsx
   └─ handleCompleteOnboarding() → Reinitialize NotionService + Load Pages
```

### Subscription Architecture

```
SubscriptionService (core-shared)
    ↓
EdgeFunctionService
    ↓
Supabase Edge Functions
    ├─ get-subscription      (with auto-create FREE)
    ├─ create-checkout       (Stripe integration)
    ├─ create-portal-session (Customer portal)
    └─ track-usage           (Quota enforcement)
```

---

## 🐛 BUGS CRITIQUES CORRIGÉS {#bugs-corrigés}

### BUG #1: ES Module Error (BLOQUAIT L'ENVOI) ✅

**Symptôme**:
```
Error: require() of ES Module C:\...\packages\ui\dist\index.js not supported
```

**Cause**:
Le package `@notion-clipper/ui` est un module ESM (`"type": "module"`) mais `notion.ipc.ts` essayait de l'importer avec `require()` (CommonJS).

**Fichier**: `apps/notion-clipper-app/src/electron/ipc/notion.ipc.ts:360`

**Fix**:
```typescript
// ❌ AVANT
const { authDataManager } = require('@notion-clipper/ui');

// ✅ APRÈS
const { authDataManager } = await import('@notion-clipper/ui');
```

**Leçon**: Toujours utiliser `import()` dynamique pour les packages ESM dans le main process Electron.

---

### BUG #2: get-user-by-workspace URL undefined ✅

**Symptôme**:
```
POST http://localhost:3000/undefined/functions/v1/get-user-by-workspace
```

**Cause**:
`AuthScreen` recevait `supabaseClient` mais **pas** `supabaseUrl` ni `supabaseKey`, donc les Edge Functions calls échouaient.

**Fichiers modifiés**:
1. `packages/ui/src/components/onboarding/Onboarding.tsx`
   - Ajout props: `supabaseUrl?: string; supabaseKey?: string;`
2. `packages/ui/src/components/auth/AuthScreen.tsx`
   - Utilise maintenant ces props pour les Edge Function calls
3. `apps/notion-clipper-app/src/react/src/App.tsx`
   - Passe `supabaseUrl={supabaseUrl}` et `supabaseKey={supabaseAnonKey}`

**Fix**:
```typescript
// Dans Onboarding.tsx
<AuthScreen
    supabaseClient={supabaseClient}
    supabaseUrl={supabaseUrl}      // ✅ AJOUTÉ
    supabaseKey={supabaseKey}      // ✅ AJOUTÉ
    onAuthSuccess={handleAuthSuccess}
    onError={(error) => setTokenError(error)}
/>
```

**Leçon**: Toujours passer les credentials Supabase complets aux composants qui appellent des Edge Functions.

---

### BUG #3: Subscription retourne null ✅

**Symptôme**:
```
[SubscriptionService] No subscription found, returning null
```

**Cause**:
Si l'utilisateur n'a pas de subscription en DB, le service retournait `null` au lieu de créer un tier FREE par défaut.

**Fichier**: `packages/core-shared/src/services/subscription.service.ts:248`

**Fix**:
```typescript
// ✅ APRÈS
if (!this.currentSubscription) {
  console.warn('[SubscriptionService] No subscription found, creating default FREE tier');

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  this.currentSubscription = {
    id: 'default-free',
    user_id: authData?.userId || 'unknown',
    tier: SubscriptionTier.FREE,
    status: SubscriptionStatus.ACTIVE,
    created_at: now,
    updated_at: now,
    current_period_start: now,
    current_period_end: periodEnd,
    is_grace_period: false,
    metadata: { ephemeral: true }
  };

  this.lastCacheUpdate = Date.now();
}
```

**Leçon**: Toujours avoir un fallback valide pour éviter les `null` qui causent des erreurs en cascade.

---

### BUG #4: Carte Notion workspace redondante ✅

**Problème**: Dans ConfigPanel, il y avait 2 endroits qui affichaient le workspace Notion :
1. Section "Compte" → Carte workspace avec point vert
2. Section "Connexion" → Badge "Connecté"

**Fix**: Suppression de la carte redondante (lignes 397-423 de ConfigPanel.tsx)

---

### BUG #5: Photo de profil manquante ✅

**Problème**: Pas de fallback élégant quand la photo de profil n'est pas disponible.

**Fix**: Implémentation d'un système Apple-like avec initiales colorées :

```typescript
// 🎨 Generate initials from name (Apple-like)
const getInitials = (name: string): string => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// 🎨 Generate consistent color from name
const getAvatarColor = (name: string): string => {
  const colors = [
    'from-blue-500 to-blue-600',
    'from-purple-500 to-purple-600',
    // ... 8 autres couleurs
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};
```

**Résultat**: Avatar coloré avec initiales (style Apple Contacts) + fallback automatique si l'image échoue.

---

## 🎨 DESIGN SYSTEM APPLE/NOTION {#design-system}

### Principes de Design

**Apple**:
- Minimalisme radical
- Espacements généreux (multiples de 4px: 8, 12, 16, 24)
- Typography: -apple-system, SF Pro
- Couleurs neutres: Grays (50-900)
- Animations subtiles (200ms cubic-bezier)
- Ombres légères: shadow-sm, shadow-md
- Bordures: 1px solid, arrondis 12-16px

**Notion**:
- Cards épurées avec hover states
- Icônes simples (lucide-react, 16-20px)
- Hiérarchie visuelle claire
- White space important
- Transitions fluides
- States visuels: hover, active, disabled

### Palette de Couleurs

```css
/* Light Mode */
--background: #fafafa
--surface: #ffffff
--border: rgb(229 231 235)  /* gray-200 */
--text-primary: rgb(17 24 39)  /* gray-900 */
--text-secondary: rgb(107 114 128)  /* gray-500 */
--accent: rgb(17 24 39)  /* gray-900 */

/* Dark Mode */
--background: #191919
--surface: #202020
--border: rgb(55 65 81)  /* gray-700 */
--text-primary: rgb(255 255 255)
--text-secondary: rgb(156 163 175)  /* gray-400 */
--accent: rgb(255 255 255)
```

### Typography Scale

```css
/* Headings */
h1: 24px font-bold
h2: 20px font-semibold
h3: 16px font-semibold

/* Body */
body: 14px font-normal
small: 12px font-normal
tiny: 11px font-medium

/* Special */
button: 14px font-medium
input: 14px font-normal
```

### Spacing Scale

```
4px  → gap-1, p-1, m-1
8px  → gap-2, p-2, m-2
12px → gap-3, p-3, m-3
16px → gap-4, p-4, m-4
20px → gap-5, p-5, m-5
24px → gap-6, p-6, m-6
```

### Component Patterns

**Button**:
```tsx
<button className="
  px-4 py-2.5 rounded-xl
  bg-gray-900 text-white
  hover:bg-black
  transition-all duration-200
  shadow-sm hover:shadow-md
  font-medium text-sm
">
  Send to Notion
</button>
```

**Card**:
```tsx
<div className="
  bg-white dark:bg-gray-800
  rounded-2xl
  border border-gray-100 dark:border-gray-700
  shadow-sm
  p-6
  hover:shadow-md
  transition-all duration-200
">
  {/* Content */}
</div>
```

**Input**:
```tsx
<input className="
  w-full px-4 py-3
  bg-white dark:bg-gray-800
  border border-gray-200 dark:border-gray-700
  rounded-xl
  text-sm
  focus:outline-none
  focus:ring-2 focus:ring-gray-900
  transition-all
" />
```

---

## 🧩 PATTERNS DE CODE {#patterns}

### Pattern: Lazy Import ESM dans Electron Main Process

```typescript
// ❌ NE PAS FAIRE
const { authDataManager } = require('@notion-clipper/ui');

// ✅ FAIRE
const { authDataManager } = await import('@notion-clipper/ui');
```

### Pattern: Props Cascade pour Supabase

```typescript
// App.tsx (source)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

<Onboarding
  supabaseClient={supabaseClient}
  supabaseUrl={supabaseUrl}
  supabaseKey={supabaseKey}
/>

// Onboarding.tsx (intermédiaire)
<AuthScreen
  supabaseClient={supabaseClient}
  supabaseUrl={supabaseUrl}
  supabaseKey={supabaseKey}
/>

// AuthScreen.tsx (consommateur)
const checkResponse = await fetch(
  `${supabaseUrl}/functions/v1/get-user-by-workspace`,
  {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  }
);
```

### Pattern: Subscription Service avec Fallback

```typescript
async getCurrentSubscription(): Promise<Subscription | null> {
  // 1. Check cache
  if (cache && !expired) return cache;

  // 2. Try Edge Function
  try {
    const result = await edgeFunctionService.getSubscription(userId);
    return result.subscription;
  } catch (error) {
    // Edge Function failed
  }

  // 3. Try direct DB
  await this.loadCurrentSubscription();

  // 4. Fallback to default FREE tier
  if (!this.currentSubscription) {
    this.currentSubscription = createDefaultFreeTier();
  }

  return this.currentSubscription;
}
```

### Pattern: Avatar avec Initiales Apple-like

```typescript
const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const getAvatarColor = (name: string): string => {
  const colors = [/* 10 gradients */];
  const hash = name.split('').reduce(
    (acc, char) => char.charCodeAt(0) + ((acc << 5) - acc),
    0
  );
  return colors[Math.abs(hash) % colors.length];
};

<div className={`bg-gradient-to-br ${getAvatarColor(name)}`}>
  <span className="text-white font-semibold">{getInitials(name)}</span>
</div>
```

---

## ⚠️ PIÈGES À ÉVITER {#pièges}

### 1. ESM vs CommonJS

❌ **Piège**: Utiliser `require()` pour importer `@notion-clipper/ui`
✅ **Solution**: Utiliser `await import()` dans le main process Electron

### 2. Supabase Props manquantes

❌ **Piège**: Oublier de passer `supabaseUrl` et `supabaseKey` aux composants qui appellent des Edge Functions
✅ **Solution**: Toujours passer les 3: `supabaseClient`, `supabaseUrl`, `supabaseKey`

### 3. Subscription null

❌ **Piège**: Retourner `null` quand pas de subscription
✅ **Solution**: Toujours retourner au minimum un tier FREE par défaut

### 4. Avatar fallback basique

❌ **Piège**: Juste afficher une icône User quand pas de photo
✅ **Solution**: Utiliser initiales colorées style Apple

### 5. Redondance UI

❌ **Piège**: Afficher la même information à plusieurs endroits
✅ **Solution**: Un seul endroit clair pour chaque information

### 6. Promises non awaited

❌ **Piège**: Appeler des fonctions async sans `await`
✅ **Solution**: Toujours `await` ou gérer avec `.then()/.catch()`

### 7. Type inference incorrecte

❌ **Piège**: Utiliser `any` partout
✅ **Solution**: Utiliser les types stricts de `@notion-clipper/core-shared`

---

## 📖 GUIDE DE DÉVELOPPEMENT {#guide}

### Ajouter un nouveau composant

1. Créer dans `packages/ui/src/components/`
2. Suivre les patterns Apple/Notion (voir Design System)
3. Exporter dans `packages/ui/src/components/index.ts`
4. TypeScript strict: pas de `any`

### Modifier l'authentification

1. **TOUJOURS** utiliser `AuthDataManager` comme source de vérité
2. Sauvegarder dans les 3 sources: Supabase + Electron + localStorage
3. Tester les 3 providers: Google, Notion, Email
4. Vérifier que `supabaseUrl` et `supabaseKey` sont bien passés

### Ajouter une nouvelle Edge Function

1. Créer dans `supabase/functions/[nom]/index.ts`
2. Utiliser `SERVICE_ROLE_KEY` pour bypasser RLS si nécessaire
3. Ajouter retry logic avec `fetchWithRetry()` côté client
4. Tester avec et sans authentification

### Modifier le système de subscription

1. Modifier `SubscriptionService` dans `core-shared`
2. S'assurer qu'il retourne toujours un tier (FREE minimum)
3. Mettre à jour les types dans `subscription.types.ts`
4. Tester les quotas (FREE vs PREMIUM)

---

## 🔧 COMMANDES UTILES {#commandes}

### Développement

```bash
# Installer toutes les dépendances
pnpm install

# Build tous les packages
pnpm build

# Dev mode (watch)
pnpm dev

# Lancer l'app Electron
cd apps/notion-clipper-app
pnpm dev
```

### Git

```bash
# Statut
git status

# Commit
git add .
git commit -m "fix(auth): resolve ES Module error and subscription null issues"

# Push
git push -u origin claude/apple-notion-design-overhaul-017ZfqJ6aV8P1spVi7DYv4wD
```

### Tests

```bash
# Run tests
pnpm test

# Type checking
pnpm typecheck
```

---

## 🎯 PROCHAINES ÉTAPES

### UI/UX Refactoring (À faire)

1. **ContentEditor** (priority)
   - Améliorer spacing (padding: 24px → 32px)
   - Typography: font-size 14px → 15px pour meilleure lisibilité
   - Animations au hover sur les boutons
   - Border-radius: 12px → 16px pour cards

2. **DestinationsCarousel**
   - Cards plus épurées (moins de border, plus de shadow)
   - Transitions fluides (scale on hover: 1 → 1.02)
   - Hiérarchie visuelle améliorée

3. **FileCarousel**
   - Previews plus grandes (80px → 120px)
   - Meilleure gestion des types de fichiers (icônes dédiées)
   - Animations de suppression (fade + slide out)

4. **UnifiedWorkspace**
   - Layout plus aéré (gap: 16px → 24px)
   - Typography scale cohérente
   - Dark mode perfectionné

### Performance Optimizations

- Lazy loading des composants lourds
- Memoization des calculs coûteux
- Virtual scrolling pour grandes listes
- Debounce sur les inputs

### Documentation

- ✅ CLAUDE.MD (ce fichier)
- README.md mis à jour
- JSDoc sur fonctions critiques
- Storybook pour components

---

## 📝 CHANGELOG

### 2025-11-14 - Session: apple-notion-design-overhaul

**Bugs Fixes**:
- ✅ Fix ES Module error in `notion.ipc.ts` (require → import)
- ✅ Fix `get-user-by-workspace` undefined URL (add supabaseUrl/Key props)
- ✅ Fix subscription returns null (create default FREE tier)
- ✅ Remove redundant Notion workspace card in ConfigPanel
- ✅ Implement Apple-like avatar with initials fallback

**Improvements**:
- ✅ Generate comprehensive CLAUDE.MD documentation
- 🔄 ContentEditor UI/UX refactoring (pending)
- 🔄 DestinationsCarousel redesign (pending)
- 🔄 FileCarousel improvements (pending)

---

## 🚀 PHILOSOPHIE DE DÉVELOPPEMENT

> "Steve Jobs aurait-il validé ce code ?"

**Critères d'excellence**:
1. **Simplicité radicale** - Pas de complexité inutile
2. **Attention aux détails** - Chaque pixel compte
3. **Performance** - Rapide et fluide
4. **Cohérence** - Design system strict
5. **Fiabilité** - Pas de bugs, toujours un fallback
6. **Clarté** - Code lisible = code maintenable

**Quote favorite**:
> "Design is not just what it looks like and feels like. Design is how it works." - Steve Jobs

---

## 📞 CONTACT & SUPPORT

Pour toute question sur ce code, référencez ce document et la session ID: `claude/apple-notion-design-overhaul-017ZfqJ6aV8P1spVi7DYv4wD`

**Dernière mise à jour**: 2025-11-14 par Claude (Sonnet 4.5)
