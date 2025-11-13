# 🧪 Guide de Test - Authentification Notion

## 📋 Prérequis

Avant de tester, assurez-vous que :

1. ✅ La configuration du chiffrement est correcte :
   ```bash
   pnpm verify:encryption
   ```

2. ✅ L'Edge Function `save-notion-connection` est déployée :
   ```bash
   supabase functions list
   # Devrait afficher : save-notion-connection
   ```

3. ✅ Les packages sont buildés :
   ```bash
   pnpm build:packages
   ```

## 🧹 Étape 1 : Nettoyer la Base de Données

**Pourquoi ?** Les anciens tokens ont été chiffrés avec une ancienne clé (ou pas chiffrés du tout). Il faut les supprimer pour tester avec des tokens fraîchement chiffrés.

### Option A : Via SQL Editor (Recommandé)

1. Ouvrir le SQL Editor : https://supabase.com/dashboard/project/rijjtngbgahxdjflfyhi/sql/new
2. Copier-coller le contenu de `supabase/migrations/cleanup_user_data.sql`
3. Exécuter le script
4. Vérifier que tous les counts sont à 0

### Option B : Via CLI (Alternative)

```bash
# Se connecter à la base
supabase db reset --db-url "postgresql://postgres.rijjtngbgahxdjflfyhi:Rayane2003@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
```

## 🚀 Étape 2 : Démarrer l'Application

```bash
# IMPORTANT : Redémarrer complètement le serveur dev
# pour que VITE_TOKEN_ENCRYPTION_KEY soit chargée

# Arrêter le serveur actuel (Ctrl+C)
pnpm dev:app
```

## 🔍 Étape 3 : Tester le Flow d'Authentification

### 3.1 Ouvrir la Console Navigateur

- Appuyer sur `F12` pour ouvrir les DevTools
- Aller dans l'onglet "Console"
- Filtrer par "AuthDataManager" ou "save-notion-connection"

### 3.2 Se Connecter à Notion

1. Dans l'app, cliquer sur **"Connect Notion"**
2. Autoriser l'accès dans la popup Notion
3. Observer les logs dans la console

### 3.3 Logs Attendus

#### ✅ Logs de Succès

**Côté Serveur (Edge Function)** :
```
[save-notion-connection] Encrypting token for user: <userId>
[save-notion-connection] Token encrypted successfully
[save-notion-connection] Connection saved successfully
```

**Côté Client (AuthDataManager)** :
```
[AuthDataManager] 💾 Saving Notion connection for user: <userId>
[AuthDataManager] ✅ Notion connection saved via Edge Function
[AuthDataManager] 🔐 Attempting to decrypt Notion token...
[AuthDataManager] 🔑 Using encryption key from import.meta.env
[AuthDataManager] ✅ Token decrypted successfully
[AuthDataManager] 🎉 Notion token retrieved and decrypted
```

#### ❌ Logs d'Erreur Possibles

**Erreur 1 : Clé de chiffrement manquante**
```
[AuthDataManager] ❌ TOKEN_ENCRYPTION_KEY not found in environment
[AuthDataManager] 💡 Please set VITE_TOKEN_ENCRYPTION_KEY in your .env file
```
**Solution** : Vérifier que `VITE_TOKEN_ENCRYPTION_KEY` est dans `.env` et redémarrer le serveur

**Erreur 2 : Échec du déchiffrement**
```
[AuthDataManager] ❌ Failed to decrypt token: <error>
[AuthDataManager] 💡 This may indicate the token was corrupted or encrypted with a different key
```
**Solution** : Nettoyer la BDD et reconnecter Notion (les clés ne correspondent pas)

**Erreur 3 : Edge Function non trouvée**
```
[AuthDataManager] ❌ Error calling save-notion-connection: 404
```
**Solution** : Déployer l'Edge Function : `supabase functions deploy save-notion-connection`

## 🎯 Étape 4 : Vérifier dans la Base de Données

### Via Supabase Dashboard

1. Ouvrir : https://supabase.com/dashboard/project/rijjtngbgahxdjflfyhi/editor
2. Aller dans la table `notion_connections`
3. Vérifier qu'une ligne existe avec :
   - `user_id` : votre userId
   - `workspace_id` : votre workspace Notion
   - `access_token` : une longue chaîne base64 (token chiffré)
   - `is_active` : true

### Via SQL

```sql
SELECT 
  id,
  user_id,
  workspace_id,
  workspace_name,
  LENGTH(access_token) as token_length,
  is_active,
  created_at
FROM notion_connections
ORDER BY created_at DESC
LIMIT 5;
```

Le `token_length` devrait être > 100 (token chiffré en base64).

## 🐛 Dépannage

### Problème : "Token not found"

**Causes possibles** :
1. L'Edge Function `save-notion-connection` n'a pas été appelée
2. L'Edge Function a échoué silencieusement
3. Les RLS (Row Level Security) bloquent l'accès

**Solution** :
```bash
# Vérifier les logs de l'Edge Function
supabase functions logs save-notion-connection --tail

# Vérifier les RLS
# Dans SQL Editor :
SELECT * FROM notion_connections; -- Devrait retourner des résultats
```

### Problème : "Failed to decrypt token"

**Causes possibles** :
1. Token chiffré avec une ancienne clé
2. Token corrompu
3. Clés serveur/client différentes

**Solution** :
1. Nettoyer la BDD (Étape 1)
2. Vérifier que les clés sont identiques :
   ```bash
   pnpm verify:encryption
   ```
3. Reconnecter Notion

### Problème : "CORS error"

**Cause** : L'Edge Function n'autorise pas l'origine

**Solution** :
Vérifier que `_shared/cors.ts` autorise votre origine :
```typescript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  // ... autres origines
];
```

## ✅ Checklist de Validation

- [ ] `pnpm verify:encryption` retourne ✅
- [ ] Base de données nettoyée
- [ ] Serveur dev redémarré
- [ ] Connexion Notion réussie
- [ ] Logs "[save-notion-connection] Token encrypted successfully"
- [ ] Logs "[AuthDataManager] Token decrypted successfully"
- [ ] Token visible dans la table `notion_connections`
- [ ] Token est une longue chaîne base64 (chiffré)
- [ ] Peut charger les pages Notion dans l'app

## 📝 Rapport de Bug

Si vous rencontrez toujours des problèmes, fournissez :

1. **Logs complets** de la console navigateur (F12)
2. **Logs de l'Edge Function** : `supabase functions logs save-notion-connection --tail`
3. **Résultat de** : `pnpm verify:encryption`
4. **Contenu de la table** : `SELECT * FROM notion_connections LIMIT 1;`
5. **Version de Supabase CLI** : `supabase --version`

---

**Date de création** : 2025-01-13
**Dernière mise à jour** : 2025-01-13
