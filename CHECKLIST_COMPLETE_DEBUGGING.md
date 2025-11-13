# ✅ CHECKLIST COMPLÈTE DE DÉBOGAGE - Authentification Notion

**Objectif :** Identifier et corriger TOUS les problèmes du flow d'authentification Notion.

**Symptôme actuel :** "No Notion token found" après OAuth réussi

---

## 📋 ÉTAPE 1 : DIAGNOSTIC AUTOMATIQUE

```bash
# Exécuter le script de diagnostic complet
node scripts/diagnose-auth-flow.js
```

Ce script vérifie **automatiquement** :
- ✅ Variables d'environnement (.env)
- ✅ Edge Functions (existence des fichiers)
- ✅ Code AuthDataManager (utilise Edge Function ou requêtes directes?)
- ✅ Structure de la base de données
- ✅ Secrets Supabase
- ✅ Dépendances npm

**Suivez les recommandations affichées par le script.**

---

## 📋 ÉTAPE 2 : VÉRIFICATIONS MANUELLES

### 2.1 - Vérifier que le code est à jour

```bash
# Afficher le dernier commit
git log --oneline -1

# Doit afficher : e124385 fix(critical): use get-notion-token Edge Function to bypass RLS
```

**Si le commit est différent :**
```bash
git pull origin claude/apple-notion-design-review-011CV5MwA6DPopASD8voomTm
```

### 2.2 - Vérifier AuthDataManager.ts

```bash
# Vérifier que loadNotionConnection utilise l'Edge Function
grep -A 5 "get-notion-token" packages/ui/src/services/AuthDataManager.ts
```

**Attendu :** Doit afficher un appel à `fetchWithRetry` vers `get-notion-token`.

**Si ce n'est PAS le cas :** Le code n'est pas à jour, pull le dernier commit.

### 2.3 - Vérifier les Edge Functions

```bash
# Lister les Edge Functions
supabase functions list
```

**Attendu :**
```
NAME                      | CREATED AT                 | VERSION
save-notion-connection   | 2025-XX-XX XX:XX:XX       | X
get-notion-token         | 2025-XX-XX XX:XX:XX       | X
create-user              | 2025-XX-XX XX:XX:XX       | X
```

**Si `get-notion-token` est ABSENTE :**
```bash
supabase functions deploy get-notion-token
```

### 2.4 - Vérifier les secrets Supabase

```bash
# Lister les secrets
supabase secrets list
```

**Attendu :**
- `TOKEN_ENCRYPTION_KEY` doit être présente
- `NOTION_CLIENT_ID` doit être présente
- `NOTION_CLIENT_SECRET` doit être présente

**Si `TOKEN_ENCRYPTION_KEY` est ABSENTE :**
```bash
# Générer une clé
KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

# Configurer dans Supabase
supabase secrets set TOKEN_ENCRYPTION_KEY="$KEY"

# Ajouter au .env local
echo "VITE_TOKEN_ENCRYPTION_KEY=$KEY" >> .env
echo "VITE_TOKEN_ENCRYPTION_KEY=$KEY" >> apps/notion-clipper-app/src/react/.env

# Redéployer les Edge Functions
supabase functions deploy save-notion-connection
supabase functions deploy get-notion-token
```

### 2.5 - Vérifier les variables d'environnement locales

```bash
# Vérifier .env racine
grep VITE_TOKEN_ENCRYPTION_KEY .env

# Vérifier .env React
grep VITE_TOKEN_ENCRYPTION_KEY apps/notion-clipper-app/src/react/.env
```

**Les deux doivent avoir la MÊME valeur que TOKEN_ENCRYPTION_KEY dans Supabase !**

---

## 📋 ÉTAPE 3 : TESTER L'EDGE FUNCTION DIRECTEMENT

### 3.1 - Test de save-notion-connection

```bash
# Remplacer YOUR_USER_ID et YOUR_ANON_KEY
curl -X POST https://rijjtngbgahxdjflfyhi.supabase.co/functions/v1/save-notion-connection \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "userId": "YOUR_USER_ID",
    "workspaceId": "test-workspace",
    "workspaceName": "Test",
    "accessToken": "secret_test_token_12345",
    "isActive": true
  }'
```

**Attendu :** `{ "success": true, "connection": {...} }`

### 3.2 - Test de get-notion-token

```bash
# Remplacer YOUR_USER_ID et YOUR_ANON_KEY
curl -X POST https://rijjtngbgahxdjflfyhi.supabase.co/functions/v1/get-notion-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"userId": "YOUR_USER_ID"}'
```

**Attendu :** `{ "success": true, "token": "secret_...", "workspaceName": "..." }`

**Si erreur 404 :** Edge Function pas déployée → Déployer avec `supabase functions deploy get-notion-token`

**Si erreur 500 :** Vérifier les logs → `supabase functions logs get-notion-token`

---

## 📋 ÉTAPE 4 : NETTOYER ET REDÉMARRER

### 4.1 - Arrêter le serveur dev

```bash
# Ctrl+C dans le terminal du serveur
```

### 4.2 - Nettoyer le cache

```bash
# Supprimer node_modules/.vite
rm -rf node_modules/.vite

# Supprimer dist
rm -rf apps/notion-clipper-app/dist
rm -rf apps/notion-clipper-app/src/react/dist
```

### 4.3 - Redémarrer le serveur

```bash
# Redémarrer
pnpm dev:app
```

### 4.4 - Vider le cache du navigateur

1. Ouvrir DevTools (F12)
2. Aller dans Application → Clear Storage
3. Cliquer sur "Clear site data"
4. Recharger la page (Ctrl+R)

---

## 📋 ÉTAPE 5 : TESTER LE FLOW COMPLET

### 5.1 - Test avec nouvelles données

```bash
# Dans Electron, réinitialiser le config
# ou
# Dans le navigateur, ouvrir DevTools → Console :
localStorage.clear();
# Puis recharger
```

### 5.2 - Connexion Notion OAuth

1. Lancer l'app
2. Cliquer sur "Continue with Notion"
3. Autoriser l'accès Notion
4. Entrer l'email
5. Cliquer sur "Stay Free"

### 5.3 - Vérifier les logs (DevTools Console)

**Logs ATTENDUS après "Stay Free" :**

```
[AuthDataManager] 📖 Loading auth data... (force refresh)
[AuthDataManager] ✅ Loaded from Electron config
[AuthDataManager] 🔄 Loading Notion token from database...
[AuthDataManager] 📞 Calling get-notion-token Edge Function for user: xxx
[AuthDataManager] ✅ Notion token loaded from Edge Function (already decrypted server-side)
[AuthDataManager] 📖 Workspace: Rayane
[App] ✅ Auth data loaded: {hasNotionToken: true, ...}
[App] 🎯 NotionService initialized successfully
```

**Logs INCORRECTS (problèmes) :**

```
Failed to load resource: the server responded with a status of 406 ()
[AuthDataManager] ℹ️ No Notion connection found for user: xxx
[App] ℹ️ No Notion token found, skipping NotionService initialization
```

**Si vous voyez les logs incorrects :**
- ❌ L'Edge Function `get-notion-token` n'est PAS déployée
- ❌ OU le code n'a pas été recompilé (redémarrer le serveur)
- ❌ OU il y a un problème avec l'Edge Function (vérifier les logs)

---

## 📋 ÉTAPE 6 : VÉRIFIER LES LOGS DES EDGE FUNCTIONS

```bash
# Logs de get-notion-token
supabase functions logs get-notion-token --tail

# Logs de save-notion-connection
supabase functions logs save-notion-connection --tail
```

**Chercher des erreurs :**
- `ENCRYPTION_KEY is not defined`
- `Decryption failed`
- `No active Notion connection found`
- `User not found`

---

## 📋 ÉTAPE 7 : VÉRIFIER LA BASE DE DONNÉES

```bash
# Se connecter au dashboard Supabase
# Aller dans Table Editor → notion_connections

# Vérifier qu'une ligne existe pour l'utilisateur
# Colonnes attendues :
# - user_id (votre UUID)
# - workspace_id
# - workspace_name
# - access_token_encrypted (chaîne chiffrée, pas secret_xxx)
# - is_active (true)
```

**Si la table est vide :**
- Le token n'a JAMAIS été sauvegardé
- Problème dans `save-notion-connection` Edge Function
- Vérifier les logs : `supabase functions logs save-notion-connection`

**Si `access_token_encrypted` contient `secret_xxx` (en clair) :**
- Le token n'a PAS été chiffré
- `TOKEN_ENCRYPTION_KEY` absente dans Supabase Vault
- Configurer la clé et redéployer

---

## 🔧 CORRECTIONS POSSIBLES

### Correction 1 : Edge Function pas déployée

```bash
supabase functions deploy get-notion-token
```

### Correction 2 : Clé de chiffrement manquante

```bash
KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
supabase secrets set TOKEN_ENCRYPTION_KEY="$KEY"
echo "VITE_TOKEN_ENCRYPTION_KEY=$KEY" >> .env
echo "VITE_TOKEN_ENCRYPTION_KEY=$KEY" >> apps/notion-clipper-app/src/react/.env
supabase functions deploy save-notion-connection
supabase functions deploy get-notion-token
```

### Correction 3 : Code pas à jour

```bash
git pull origin claude/apple-notion-design-review-011CV5MwA6DPopASD8voomTm
pnpm install
pnpm dev:app
```

### Correction 4 : Cache navigateur

```
F12 → Application → Clear Storage → Clear site data
Ctrl+R
```

### Correction 5 : Nettoyer la base de données (DERNIER RECOURS)

```sql
-- Dans Supabase SQL Editor
DELETE FROM notion_connections WHERE user_id = 'YOUR_USER_ID';

-- Puis reconnecter Notion OAuth
```

---

## ✅ SUCCÈS - Comment savoir que ça fonctionne ?

**Logs console après connexion :**
```
✅ [AuthDataManager] ✅ Notion token loaded from Edge Function (already decrypted server-side)
✅ [App] ✅ Auth data loaded: {hasNotionToken: true, ...}
✅ [App] 🎯 NotionService initialized successfully
✅ [useInfinitePages] ✅ Loaded XX pages
```

**UI :**
- Les pages Notion s'affichent dans l'app
- Pas de message "Notion disconnected"
- Le quota s'affiche correctement

---

## 📞 SI RIEN NE FONCTIONNE

**Partagez ces informations :**

1. **Résultat du diagnostic :**
   ```bash
   node scripts/diagnose-auth-flow.js > diagnostic.txt
   ```

2. **Logs console complets** (F12 → Console → Tout copier)

3. **Logs des Edge Functions :**
   ```bash
   supabase functions logs get-notion-token --tail > logs-get-token.txt
   supabase functions logs save-notion-connection --tail > logs-save-token.txt
   ```

4. **Contenu de la table notion_connections** (depuis Supabase Dashboard)

5. **Dernier commit git :**
   ```bash
   git log --oneline -5
   ```
