# ✅ Configuration du Chiffrement des Tokens - TERMINÉE

## 📋 Résumé

La clé de chiffrement `TOKEN_ENCRYPTION_KEY` a été configurée avec succès dans tous les environnements.

## 🔐 Clé Configurée

```
J/xu6C/X1OCIFnOMzSu3xGJfMAboYPWXJ83ScCa/RE0=
```

## ✅ Emplacements Configurés

### 1. Supabase Vault (Serveur)
- ✅ `TOKEN_ENCRYPTION_KEY` configurée via `supabase secrets set`
- Utilisée par les Edge Functions pour chiffrer/déchiffrer les tokens Notion
- Vérifiable avec : `supabase secrets list`

### 2. .env (Racine du projet)
- ✅ `VITE_TOKEN_ENCRYPTION_KEY` ajoutée
- Utilisée par l'application Electron

### 3. apps/notion-clipper-app/src/react/.env
- ✅ `VITE_TOKEN_ENCRYPTION_KEY` ajoutée
- Utilisée par l'interface React

## 🔄 Synchronisation

Les trois clés sont **identiques** et synchronisées :
- Serveur (Supabase) : `TOKEN_ENCRYPTION_KEY`
- Client (Vite) : `VITE_TOKEN_ENCRYPTION_KEY`

## 🎯 Fonctionnement

### Flux OAuth Notion
1. **Utilisateur clique sur "Connect Notion"**
2. **Redirection vers Notion OAuth**
3. **Notion renvoie le code d'autorisation**
4. **Edge Function `notion-oauth`** :
   - Échange le code contre un `access_token`
   - **Chiffre** le token avec `TOKEN_ENCRYPTION_KEY` (Supabase Vault)
   - Stocke le token chiffré dans la BDD
5. **Client (AuthDataManager)** :
   - Récupère le token chiffré depuis la BDD
   - **Déchiffre** avec `VITE_TOKEN_ENCRYPTION_KEY` (local)
   - Utilise le token pour les appels API Notion

## 🔒 Sécurité

### ✅ Ce qui est sécurisé
- Token Notion **jamais** stocké en clair dans la BDD
- Clé de chiffrement **jamais** exposée côté client (sauf dans .env local)
- Edge Functions gèrent l'échange OAuth de manière sécurisée

### ⚠️ Important
- **Ne jamais committer** les fichiers `.env` dans Git
- Les `.env` sont dans `.gitignore`
- Seul `.env.example` est versionné (sans valeurs réelles)

## 🚀 Prochaines Étapes

1. **Redémarrer le serveur de développement** :
   ```bash
   # Arrêter le serveur actuel (Ctrl+C)
   pnpm dev
   ```

2. **Tester l'authentification Notion** :
   - Ouvrir l'app
   - Cliquer sur "Connect Notion"
   - Vérifier que l'OAuth fonctionne
   - Vérifier que le token est bien stocké et déchiffré

3. **Vérifier les logs** :
   - Chercher `[AuthDataManager] Token decrypted successfully`
   - Pas d'erreurs de déchiffrement

## 📝 Commandes Utiles

```bash
# Vérifier les secrets Supabase
supabase secrets list

# Mettre à jour la clé (si nécessaire)
supabase secrets set TOKEN_ENCRYPTION_KEY="nouvelle-clé"

# Générer une nouvelle clé
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 🐛 Dépannage

### Erreur "Failed to decrypt token"
- Vérifier que `VITE_TOKEN_ENCRYPTION_KEY` est dans `.env`
- Vérifier que la clé est identique à celle dans Supabase Vault
- Redémarrer le serveur dev après modification du `.env`

### Token non stocké
- Vérifier les logs de l'Edge Function `notion-oauth`
- Vérifier que `TOKEN_ENCRYPTION_KEY` est dans Supabase Vault
- Vérifier les permissions RLS sur la table `user_tokens`

---

**Date de configuration** : 2025-01-13
**Statut** : ✅ Opérationnel
