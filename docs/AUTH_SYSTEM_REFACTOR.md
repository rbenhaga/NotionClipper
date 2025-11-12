# Système d'authentification - Refonte complète

## 🎯 Objectif

Remplacer le système actuel (emails factices basés sur workspace ID) par un **vrai système d'authentification moderne** avec OAuth social et gestion email/password.

---

## ❌ Problèmes du système actuel

1. **Emails factices** : `747096bafa944fc78b731dd7e7652dec@notionclipperapp.com`
   - Pas de vraie adresse email utilisateur
   - Impossible de contacter l'utilisateur
   - Pas de récupération de mot de passe

2. **Pas de gestion de compte** :
   - L'utilisateur ne peut pas gérer son profil
   - Pas de déconnexion/reconnexion
   - Perte du token Notion = perte du compte

3. **Sécurité** :
   - Mot de passe déterministe (hash du workspace ID)
   - Pas de vérification email
   - Pas de 2FA possible

4. **UX confuse** :
   - L'utilisateur ne comprend pas qu'il a un compte
   - Notion OAuth sert à la fois d'auth et d'intégration

---

## ✅ Solution proposée

### **Architecture à 3 niveaux**

```
┌─────────────────────────────────────────────────────────┐
│ Niveau 1: AUTHENTIFICATION UTILISATEUR                  │
│ (Qui es-tu ?)                                           │
├─────────────────────────────────────────────────────────┤
│ • OAuth Google                                          │
│ • OAuth Apple                                           │
│ • Email/Password avec vérification                      │
│                                                         │
│ → Crée: auth.users + user_profiles + subscriptions     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Niveau 2: CONNEXION NOTION (INTÉGRATION API)           │
│ (Quel workspace Notion ?)                              │
├─────────────────────────────────────────────────────────┤
│ • OAuth Notion (API token)                             │
│ • Lié au compte utilisateur authentifié                │
│                                                         │
│ → Crée: notion_connections (user_id + workspace_id)    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Niveau 3: ABONNEMENT PREMIUM (OPTIONNEL)               │
│ (Veux-tu upgrader ?)                                   │
├─────────────────────────────────────────────────────────┤
│ • WelcomePremiumModal                                  │
│ • Trial 14 jours + 2,99€/mois                          │
│                                                         │
│ → Met à jour: subscriptions.tier (free → grace_period) │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 Nouveau flow d'onboarding

### **1. Premier lancement** (utilisateur non authentifié)

```
┌─────────────┐
│  Welcome    │  Écran de bienvenue
│  Screen     │  • Logo + Animation
└──────┬──────┘  • "Commencer" button
       │
       ↓
┌─────────────┐
│    Auth     │  Choix méthode d'authentification
│   Choice    │  • "Continuer avec Google" 🔵
└──────┬──────┘  • "Continuer avec Apple" 🍎
       │          • "S'inscrire avec email" ✉️
       │          • "Se connecter" (si compte existe)
       ↓
       ├─── Google OAuth ──→ Callback → User créé ✅
       ├─── Apple OAuth ──→ Callback → User créé ✅
       └─── Email Form ──→ Signup → Email vérifié → User créé ✅
                ↓
       ┌─────────────┐
       │   Notion    │  Connexion au workspace Notion
       │   Connect   │  • "Connecter Notion" button
       └──────┬──────┘  • OAuth Notion (API token)
              │
              ↓
       ┌─────────────┐
       │  Welcome    │  Proposition upgrade premium
       │  Premium    │  • "Démarrer l'essai (14j)" 💎
       │   Modal     │  • "Rester en gratuit" 🆓
       └──────┬──────┘
              │
              ↓
       ┌─────────────┐
       │     App     │  Application prête
       │    Ready    │  • Clips
       └─────────────┘  • Workspaces
                        • Settings
```

### **2. Connexion existante**

```
┌─────────────┐
│    Auth     │  Login avec méthode choisie
│    Login    │  • Google OAuth
└──────┬──────┘  • Apple OAuth
       │          • Email + Password
       ↓
       [Check notion_connections]
       │
       ├─── ✅ Token existe ──→ App prête
       └─── ❌ Pas de token ──→ Connexion Notion requise
```

---

## 🗄️ Schéma de base de données

### **Tables existantes**

```sql
-- auth.users (Supabase Auth - gérée automatiquement)
-- id, email, encrypted_password, email_confirmed_at, etc.

-- subscriptions (déjà existante)
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL UNIQUE,
  tier text NOT NULL DEFAULT 'free', -- 'free', 'grace_period', 'premium'
  status text NOT NULL DEFAULT 'active',
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_end timestamptz,
  is_grace_period boolean DEFAULT false,
  cancel_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### **Nouvelles tables**

```sql
-- user_profiles
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  auth_provider text NOT NULL, -- 'google', 'apple', 'email'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- notion_connections
CREATE TABLE notion_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workspace_id text NOT NULL,
  workspace_name text,
  workspace_icon text,
  access_token_encrypted text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_synced_at timestamptz,
  is_active boolean DEFAULT true,
  UNIQUE(user_id, workspace_id)
);
```

### **Triggers automatiques**

```sql
-- Créer automatiquement user_profile + subscription après auth
CREATE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Créer le profil
  INSERT INTO user_profiles (id, email, full_name, avatar_url, auth_provider)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'provider', 'email')
  );

  -- Créer la subscription FREE
  INSERT INTO subscriptions (user_id, tier, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

---

## 🔧 Composants UI à créer/modifier

### **Nouveaux composants**

1. **AuthScreen** (`packages/ui/src/components/auth/AuthScreen.tsx`) ✅ CRÉÉ
   - Choix méthode auth (Google, Apple, Email)
   - Formulaire signup email/password
   - Formulaire login email/password

2. **NotionConnectScreen** (`packages/ui/src/components/auth/NotionConnectScreen.tsx`)
   - Explique pourquoi on connecte Notion
   - Bouton OAuth Notion
   - Gestion multi-workspaces

### **Composants à modifier**

1. **Onboarding** (`packages/ui/src/components/onboarding/Onboarding.tsx`)
   - Écran 1: Welcome
   - Écran 2: AuthScreen
   - Écran 3: NotionConnectScreen
   - ~~Écran OAuth actuel~~ (remplacé)

2. **App.tsx** (`apps/notion-clipper-app/src/react/src/App.tsx`)
   - Wrapper `<AuthProvider>` pour gérer la session
   - Check auth status au démarrage
   - Redirection login si non authentifié
   - Gestion multi-workspaces

3. **ConfigPanel** (`packages/ui/src/components/panels/ConfigPanel.tsx`)
   - Section "Compte" avec email, profil
   - Bouton "Déconnexion"
   - Gestion des workspaces Notion connectés

---

## 🚀 Plan d'implémentation

### **Phase 1: Backend (Supabase)** ⏱️ 2h

- [ ] Exécuter migration SQL (tables + triggers)
- [ ] Configurer OAuth Google dans Supabase
- [ ] Configurer OAuth Apple dans Supabase
- [ ] Tester créations automatiques (profile + subscription)

### **Phase 2: Components Auth** ⏱️ 3h

- [x] Créer `AuthScreen.tsx` ✅
- [ ] Créer `NotionConnectScreen.tsx`
- [ ] Créer `AuthProvider.tsx` (context + hooks)
- [ ] Exporter composants dans `index.ts`

### **Phase 3: Modifier Onboarding** ⏱️ 2h

- [ ] Intégrer AuthScreen dans Onboarding
- [ ] Séparer OAuth Notion du flow auth
- [ ] Ajouter gestion multi-workspaces
- [ ] Tester flow complet nouveau user

### **Phase 4: App Integration** ⏱️ 2h

- [ ] Wrapper `<AuthProvider>` dans App.tsx
- [ ] Check session au démarrage
- [ ] Stocker notion_connection après OAuth
- [ ] Afficher WelcomePremiumModal après setup

### **Phase 5: Account Management** ⏱️ 2h

- [ ] Section "Compte" dans ConfigPanel
- [ ] Gestion profil (nom, avatar)
- [ ] Bouton déconnexion
- [ ] Liste workspaces Notion connectés

### **Phase 6: Migration Users** ⏱️ 1h

- [ ] Script de migration des users actuels
- [ ] Nettoyer les emails factices
- [ ] Tester avec données réelles

### **Phase 7: Tests & Polish** ⏱️ 2h

- [ ] Tester tous les flows (signup, login, notion connect)
- [ ] Tester trial + subscription
- [ ] UX polish (animations, erreurs)
- [ ] Documentation utilisateur

---

## 📝 Avantages de cette architecture

✅ **Sécurité**
- Vraies adresses email vérifiées
- OAuth sécurisé (Google, Apple)
- Séparation auth utilisateur / intégration Notion
- Support 2FA possible (futur)

✅ **UX**
- Flow clair et moderne
- Gestion de compte complète
- Multi-workspaces supporté
- Récupération mot de passe possible

✅ **Maintenabilité**
- Architecture claire (3 niveaux)
- Tables bien structurées
- Triggers automatiques
- RLS bien configuré

✅ **Évolutivité**
- Support GitHub, Microsoft OAuth (futur)
- API keys pour intégrations tierces (futur)
- Teams / Organisations (futur)

---

## 💡 Migration utilisateurs actuels

Pour les utilisateurs existants avec emails factices :

```sql
-- 1. Identifier les utilisateurs avec emails factices
SELECT id, email FROM auth.users
WHERE email LIKE '%@notionclipperapp.com';

-- 2. Leur envoyer un email de migration (via app)
-- "Mettez à jour votre compte avec une vraie adresse email"

-- 3. Flow migration:
-- • User clique "Mettre à jour email"
-- • Formulaire: nouvel email + confirmation
-- • Envoi email vérification
-- • Update auth.users.email après confirmation
```

---

## ⚠️ Considérations

1. **Email confirmation** :
   - Activer/désactiver selon besoin
   - Peut ralentir l'onboarding
   - Recommandation: désactiver pour OAuth, activer pour email/password

2. **Backward compatibility** :
   - Garder le code actuel le temps de la migration
   - Feature flag pour basculer nouveau système
   - Migration douce des users existants

3. **Rate limiting** :
   - Limiter tentatives login
   - Captcha si nécessaire
   - Supabase gère ça nativement

4. **RGPD** :
   - Politique de confidentialité
   - Consentement tracking
   - Export/Suppression données

---

## 🎯 Timeline estimée

- **Total**: ~14 heures de développement
- **Migration users**: ~2 heures supplémentaires
- **Tests & déploiement**: ~2 heures

**Total général: 18 heures** sur 2-3 jours

---

## 🚦 Décision

Veux-tu que j'implémente cette refonte complète maintenant, ou préfères-tu :

**Option A**: Implémenter maintenant (architecture propre, ~18h travail)
**Option B**: Garder la solution temporaire et refactor plus tard
**Option C**: Implémenter une version simplifiée (seulement OAuth Google + email, ~8h)

**Recommandation**: Option A pour une base solide et professionnelle.
