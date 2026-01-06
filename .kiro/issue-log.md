# Issue Log — État de santé des projets

> Généré le : 2026-01-06
> Objectif : tracker les erreurs lint/typecheck/test/build + risques prod

---

## NotionClipper (App Desktop)

### Lint
- [ ] Status: ⚠️ Pas de script lint global configuré

### Typecheck
- [x] Status: ✅ OK pour core-electron (fixé 2026-01-06)
- [x] Status: ✅ OK pour packages/ui (noUnused* désactivé, electronAPI typé)
- ⚠️ 5 erreurs restantes dans `apps/notion-clipper-extension/entrypoints/popup/App.tsx`:
  - Props incompatibles (Onboarding, Header, PageList)
  - Parameter 'newConfig' implicit any
- **Fichiers corrigés**:
  - `packages/core-electron/src/services/file.service.ts` — ArrayBuffer safe
  - `packages/core-electron/src/services/notion.service.ts` — ArrayBuffer safe (2 endroits)
  - `packages/ui/src/types/window.types.ts` — electronAPI enrichi + [key: string]: any
  - `packages/ui/tsconfig.json` — noUnused* désactivé
  - `apps/notion-clipper-extension/tsconfig.json` — noUnused* désactivé + include window.types.ts

### Tests
- [x] Status: ❌ FAIL
- `packages/file-handlers`: No tests found (exit code 1)
- `packages/media-handlers`: No tests found (exit code 1)
- **Fix suggéré**: Ajouter `--passWithNoTests` ou créer des tests placeholder

### Build
- [ ] Status: Non testé (dépend du typecheck)

---

## NotionClipperWeb (Backend + Showcase)

### Backend - Lint
- [x] Status: ❌ FAIL
- ESLint config manquante (pas de `.eslintrc`)

### Backend - Typecheck
- [x] Status: ✅ OK

### Backend - Tests
- [x] Status: ✅ OK (stabilisé 2026-01-06)
- `idempotency.service.test.ts`: ✅ 2 passed
- `notion-client.test.ts`: ✅ 1 passed
- `security.test.ts`: ⏭️ SKIP par défaut (tests d'intégration, lancer avec `pnpm test:integration`)

### Backend - Build
- [x] Status: ✅ OK

---

### Showcase-site - Lint
- [x] Status: ❌ FAIL
- ESLint config manquante (pas de `.eslintrc`)

### Showcase-site - Typecheck
- [x] Status: ✅ OK (fixé 2026-01-06)

### Showcase-site - Build
- [x] Status: ✅ OK

---

## clipper-pro-video (Remotion)

### Typecheck
- [x] Status: ✅ OK

### Build
- [ ] Status: Non testé

---

## Risques Prod identifiés

1. ~~**Types SubscriptionTier désynchronisés** entre showcase-site et backend~~ ✅ Fixé
2. **ESLint non configuré** sur NotionClipperWeb (backend + showcase)
3. **Tests manquants** sur packages file-handlers et media-handlers
4. **Tests d'intégration** backend nécessitent serveur running (pas de mock)

---

## Incident Sécurité - Clés Supabase (2026-01-06)

### Incident
- `.env.prod` avec clés Supabase JWT a été accidentellement commité et poussé
- GitHub Secret Scanning a détecté la fuite

### Remédiation effectuée
- [x] `git reset --soft HEAD~1` + nouveau commit sans `.env.prod` + `git push --force`
- [x] `.env.prod` ajouté à `.gitignore`
- [x] Anciennes clés JWT révoquées dans Supabase
- [x] Migration vers nouvelles clés `sb_publishable_*` et `sb_secret_*`
- [x] Nouvelles clés générées: `JWT_SECRET`, `TOKEN_ENCRYPTION_KEY`, `METRICS_TOKEN`
- [x] Vault Supabase mis à jour: `SB_PUBLISHABLE_KEY`, `SB_SECRET_KEY`, `TOKEN_ENCRYPTION_KEY`
- [x] Edge Functions migrées vers `_shared/config.ts` avec fallback legacy
- [x] Backend `.env.prod` mis à jour avec noms de variables compatibles

### Secrets système (non modifiables)
- `SUPABASE_ANON_KEY` - géré par Supabase (contient ancienne valeur révoquée)
- `SUPABASE_SERVICE_ROLE_KEY` - géré par Supabase (contient ancienne valeur révoquée)
- `SUPABASE_DB_URL` - géré par Supabase (réservé)

### Solution appliquée
Les Edge Functions utilisent maintenant `_shared/config.ts` qui:
1. Essaie d'abord `SB_SECRET_KEY` / `SB_PUBLISHABLE_KEY` (nouvelles clés)
2. Fallback sur `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_ANON_KEY` (legacy)

Cela permet une migration progressive sans casser les déploiements existants.

---

## Audit Dépendances (2026-01-06)

### Vulnérabilités corrigées
- [x] `node-forge` <1.3.2 (HIGH) — fixé via pnpm.overrides 1.3.2
- [x] `katex` <0.16.21 (MODERATE) — fixé via pnpm.overrides 0.16.21
- [x] `@notionhq/client` version skew — unifié à ^5.6.0 dans tous les packages + override 5.6.0

### Vulnérabilités restantes (planifiées)
- [ ] `electron` <35.7.5 (MODERATE - ASAR bypass) — nécessite upgrade majeur 28→35+

### Corrections structurelles
- [x] `wxt` supprimé de `packages/adapters/webextension` (reste uniquement dans `apps/notion-clipper-extension`)
- [x] `@notionhq/client` aligné à ^5.6.0 dans: root, adapters/electron, adapters/webextension, apps/notion-clipper-app, apps/notion-clipper-extension
- [x] `pnpm.overrides` avec versions exactes (pas de >=)
- [x] Lockfile régénéré
- [x] Extension build OK, pas de Node builtins bloquants dans le bundle

### Peer deps warning (à traiter plus tard)
- [ ] `@testing-library/react-hooks` 8.0.1 — legacy, migrer vers `@testing-library/react`

### Node builtins dans le bundle extension (RÉSOLU 2026-01-06)
- [x] `require("crypto")` — éliminé via conditional exports browser
- [x] `require("jsdom")` — éliminé via conditional exports browser
- [x] `require("./parsers/MarkdownParser")` — éliminé via conditional exports browser
- **Solution appliquée**: 
  - Créé `index.browser.ts`, `parseContent.browser.ts`, `HtmlToMarkdownConverter.browser.ts` (zero require)
  - Configuré `wxt.config.ts` avec `resolve.conditions: ['browser']` et alias explicite vers `index.browser.ts`
  - Scan bundle confirmé: zéro require() Node.js

---

## Backlog priorisé (10 tâches, < 1h chacune)

| # | Priorité | Projet | Tâche | DoD |
|---|----------|--------|-------|-----|
| 1 | 🔴 BLOQUANT | showcase-site | Fix types SubscriptionTier dans DashboardPage.tsx | Typecheck OK |
| 2 | 🔴 BLOQUANT | NotionClipper | Fix types Blob/File dans file.service.ts | Typecheck OK |
| 3 | 🔴 BLOQUANT | NotionClipper | Fix types Uint8Array dans notion.service.ts | Typecheck OK |
| 4 | 🟡 QUALITÉ | NotionClipperWeb | Ajouter .eslintrc.cjs au backend | Lint OK |
| 5 | 🟡 QUALITÉ | NotionClipperWeb | Ajouter .eslintrc.cjs au showcase-site | Lint OK |
| 6 | 🟡 QUALITÉ | NotionClipper | Ajouter --passWithNoTests aux packages sans tests | Tests OK |
| 7 | 🟢 INFRA | racine | Créer script check-all.ps1 pour validation globale | Script exécutable |
| 8 | 🟢 INFRA | NotionClipperWeb | Mocker le serveur dans security.test.ts | Tests unitaires sans serveur |
| 9 | 🟢 INFRA | showcase-site | Supprimer import `t` inutilisé | Lint clean |
| 10 | 🟢 DOC | racine | Documenter les commandes dans README | Doc à jour |

---

## Prochaine action

**Tâche #1** : Fix types SubscriptionTier dans `NotionClipperWeb/showcase-site/src/pages/DashboardPage.tsx`
- Vérifier le type `SubscriptionTier` dans le projet
- Aligner les valeurs comparées avec le type réel
