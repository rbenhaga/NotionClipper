# 🔧 Guide de Configuration Supabase

Ce guide vous explique comment configurer votre base de données Supabase pour que l'authentification fonctionne correctement.

## ⚠️ Problème Actuel

Vous rencontrez probablement cette erreur lors de la création de compte :

```
Database error saving new user
```

Cela est dû au trigger `handle_new_user()` qui ne supporte pas les emails NULL (nécessaire pour OAuth Notion).

## 📋 Étapes de Configuration

### 1. Exécuter la migration SQL

1. Allez dans votre dashboard Supabase: https://supabase.com/dashboard
2. Sélectionnez votre projet **Notion Clipper**
3. Dans le menu de gauche, cliquez sur **SQL Editor**
4. Cliquez sur **New query**
5. Copiez et collez le contenu du fichier : `database/migrations/002_fix_handle_new_user_null_email.sql`
6. Cliquez sur **Run** pour exécuter la migration

### 2. Vérifier la Configuration OAuth

#### Google OAuth (Optionnel)

Si vous voulez utiliser Google OAuth :

1. Allez dans Google Cloud Console : https://console.cloud.google.com/
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Activez l'API **Google+ API** ou **Google Identity**
4. Allez dans **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Type : **Desktop application**
6. Nom : `Notion Clipper Desktop`
7. Copiez le **Client ID** et le **Client Secret**
8. Créez un fichier `.env` à la racine du projet :

```env
# Google OAuth
GOOGLE_CLIENT_ID=votre-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=votre-client-secret

# Notion OAuth (déjà configuré)
NOTION_CLIENT_ID=298d872b-594c-808a-bdf4-00379b703b97
NOTION_CLIENT_SECRET=secret_xxxx

# Supabase
SUPABASE_URL=https://rijjtngbgahxdjflfyhi.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

9. Dans Google Cloud Console, ajoutez l'URI de redirection :
   - `http://localhost:8080/oauth/callback`

#### Notion OAuth (Déjà Configuré)

Votre Notion OAuth est déjà configuré avec :
- Client ID : `298d872b-594c-808a-bdf4-00379b703b97`
- Redirect URI : `http://localhost:8080/oauth/callback`

### 3. Configuration Supabase Auth

1. Dans votre dashboard Supabase, allez dans **Authentication** → **Settings**
2. **Email Confirmations** : DÉSACTIVÉ (pour le développement)
3. **Email Auth** : ACTIVÉ
4. **Auto Confirm** : ACTIVÉ (pour le développement)

### 4. Tester l'Authentification

Redémarrez l'application et testez :

#### Test 1 : Email/Password
1. Cliquez sur "Créer un compte"
2. Entrez un email et mot de passe (min 8 caractères)
3. Cliquez sur "Créer mon compte"
4. ✅ Le compte doit être créé sans erreur

#### Test 2 : Notion OAuth
1. Cliquez sur "Continuer avec Notion"
2. Le navigateur doit s'ouvrir avec la page Notion OAuth
3. Connectez-vous à Notion et autorisez l'app
4. ✅ Vous devez être redirigé et connecté

#### Test 3 : Google OAuth (si configuré)
1. Cliquez sur "Continuer avec Google"
2. Le navigateur doit s'ouvrir avec la page Google OAuth
3. Sélectionnez votre compte Google
4. ✅ Vous devez être redirigé et connecté

## 🔐 Sécurité des Clés API

### ⚠️ IMPORTANT : Ne PAS commiter les clés

Les clés OAuth (Google, Notion) sont actuellement dans les variables d'environnement Electron. Pour plus de sécurité, elles devraient être dans Supabase Edge Functions.

### Migration Future : Edge Functions

TODO : Créer une Edge Function Supabase pour gérer OAuth de manière sécurisée :

```typescript
// supabase/functions/oauth-google/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  // Les clés sont dans les secrets Supabase, pas exposées au client
  const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
  const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')

  // Gérer l'échange de tokens OAuth de manière sécurisée
  // ...
})
```

## 📊 Structure de la Base de Données

Après la migration, votre base de données aura :

### Table `user_profiles`
- `id` : UUID (référence vers `auth.users.id`)
- `email` : TEXT (peut être NULL pour Notion OAuth)
- `full_name` : TEXT
- `avatar_url` : TEXT
- `auth_provider` : TEXT ('email', 'google', 'notion')
- `created_at` : TIMESTAMP
- `updated_at` : TIMESTAMP

### Trigger `handle_new_user()`
- Créé automatiquement un profil lors de l'inscription
- Supporte les emails NULL (pour Notion)
- Utilise COALESCE pour les valeurs par défaut
- Gestion d'erreurs pour ne pas bloquer la création de compte

## 🐛 Résolution de Problèmes

### Erreur : "Database error saving new user"

→ Vous n'avez pas exécuté la migration SQL. Voir Étape 1.

### Erreur : "OAuth server not available"

→ Le serveur OAuth local n'a pas démarré. Redémarrez l'application.

### Rien ne se passe quand je clique sur "Continuer avec Notion"

→ Vérifiez les logs dans la console développeur (Cmd+Option+I sur Mac, F12 sur Windows/Linux).
→ Vérifiez que `NOTION_CLIENT_ID` et `NOTION_CLIENT_SECRET` sont dans les variables d'environnement.

### Le navigateur ne s'ouvre pas

→ Vérifiez que l'app Electron a les permissions pour ouvrir le navigateur.

### Erreur : "redirect_uri_mismatch"

→ Dans votre configuration OAuth (Google ou Notion), l'URI de redirection doit être exactement :
   `http://localhost:8080/oauth/callback`

## 💡 Conseils

- **Développement** : Désactivez l'email confirmation dans Supabase Auth
- **Production** : Activez l'email confirmation et utilisez un domaine custom
- **Sécurité** : Stockez les clés OAuth dans Supabase Vault, pas dans .env
- **Logs** : Vérifiez la console pour voir les détails des erreurs OAuth

## 📞 Support

Si vous rencontrez des problèmes :

1. Vérifiez les logs dans la console développeur
2. Vérifiez que la migration SQL a bien été exécutée
3. Vérifiez que les variables d'environnement sont correctes
4. Redémarrez complètement l'application

---

**Prochaines étapes** :
1. ✅ Exécuter la migration SQL
2. ✅ Tester l'authentification Email/Password
3. ✅ Tester Notion OAuth
4. ⏳ Configurer Google OAuth (optionnel)
5. ⏳ Migrer les clés vers Supabase Edge Functions (production)
