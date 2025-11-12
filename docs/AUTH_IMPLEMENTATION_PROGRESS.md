# Progression de l'implémentation - Système d'authentification complet

## ✅ Phase 2 Complétée: Components Auth (100%)

### Composants créés

#### 1. **AuthContext.tsx** - Gestion globale de l'état d'authentification
✅ Créé et exporté dans `packages/ui/src/contexts/`

**Fonctionnalités:**
- Session management avec Supabase Auth
- Support OAuth (Google, Apple)
- Support Email/Password
- Chargement automatique du profil utilisateur
- Écoute des changements d'état d'authentification
- Refresh automatique de session

**API:**
```typescript
interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  profile: UserProfile | null;

  signUp: (email, password, fullName?) => Promise<{user, error}>;
  signIn: (email, password) => Promise<{user, error}>;
  signInWithOAuth: (provider: 'google' | 'apple') => Promise<{error}>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}
```

#### 2. **AuthScreen.tsx** - Interface d'authentification moderne
✅ Créé et exporté dans `packages/ui/src/components/auth/`

**Fonctionnalités:**
- 3 modes: choice, signup, login
- Boutons OAuth Google/Apple avec animations
- Formulaires email/password avec validation
- Toggle de visibilité du mot de passe
- Gestion des erreurs avec messages clairs
- Design Apple/Notion premium

**UI:**
- Gradients et animations Framer Motion
- Icônes Lucide React (Mail, Lock, User, Eye, Chrome, Apple)
- Responsive et dark mode
- Formulaires avec validation côté client

#### 3. **NotionConnectScreen.tsx** - Connexion workspace Notion
✅ Créé et exporté dans `packages/ui/src/components/auth/`

**Fonctionnalités:**
- Interface de connexion au workspace Notion
- Liste des fonctionnalités avec icônes
- Note de sécurité avec bouclier
- Support multi-workspaces (préparé)

**Design Premium:**
- Cercles blur animés en arrière-plan (effet Apple)
- Bouton gradient avec effet shine au hover
- Animations smooth avec Framer Motion
- Icône Notion grande taille avec ombre portée
- Responsive et dark mode

#### 4. **Onboarding.tsx** - Intégration du nouveau flow
✅ Modifié avec support backward compatible

**Changements:**
- Ajout feature flag `useNewAuthFlow` (défaut: false)
- Nouveau flow: Welcome → Auth → Notion → Complete
- Ancien flow préservé: Welcome → Notion → Complete
- Support des 2 signatures de callback:
  - Ancien: `(token, workspace) => void`
  - Nouveau: `(data: {userId, email, notionToken, workspace}) => void`
- Rendu conditionnel des étapes selon le feature flag

#### 5. **Exports et Index**
✅ Tous les composants et contexts exportés correctement

- `packages/ui/src/contexts/index.ts` - AuthContext exports
- `packages/ui/src/components/index.ts` - AuthScreen, NotionConnectScreen exports
- `packages/ui/src/index.ts` - Context exports dans package principal

---

## 🔄 Phase 1: Backend (Supabase) - À EXÉCUTER

### Migration SQL prête
✅ Fichier créé: `supabase/migrations/20241112_add_profiles_and_connections.sql`

**Contenu:**
- Table `user_profiles` avec RLS
- Table `notion_connections` avec RLS multi-workspace
- Fonction `handle_new_user()` - Trigger automatique
- Création auto profil + subscription FREE
- Triggers `updated_at` automatiques

### ⚠️ Actions requises (Manuel)

#### 1. Exécuter la migration SQL
**Méthode:** Supabase SQL Editor (manuel requis)

1. Ouvrir le SQL Editor:
   ```
   https://supabase.com/dashboard/project/rijjtngbgahxdjflfyhi/sql/new
   ```

2. Copier-coller le contenu de:
   ```
   supabase/migrations/20241112_add_profiles_and_connections.sql
   ```

3. Cliquer sur "Run" pour exécuter

4. Vérifier que les tables sont créées:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('user_profiles', 'notion_connections');
   ```

#### 2. Configurer OAuth Google

1. Aller dans: **Authentication → Providers → Google**

2. Activer Google OAuth

3. Ajouter les credentials:
   - Client ID: (depuis Google Cloud Console)
   - Client Secret: (depuis Google Cloud Console)

4. Configurer Redirect URLs autorisées:
   ```
   https://rijjtngbgahxdjflfyhi.supabase.co/auth/v1/callback
   ```

5. Dans Google Cloud Console:
   - Créer un projet OAuth 2.0
   - Ajouter les redirect URIs Supabase
   - Scopes nécessaires: email, profile

#### 3. Configurer OAuth Apple (Optionnel)

1. Aller dans: **Authentication → Providers → Apple**

2. Activer Apple OAuth

3. Créer un Service ID sur Apple Developer:
   - Sign in with Apple capability
   - Return URLs: Supabase callback URL

4. Configurer dans Supabase:
   - Services ID
   - Team ID
   - Key ID
   - Private Key (.p8)

---

## 📋 Phase 3: Intégration dans App.tsx - PROCHAINE ÉTAPE

### Changements à apporter

#### 1. Wrapper avec AuthProvider

**Fichier:** `apps/notion-clipper-app/src/react/src/App.tsx`

```tsx
import { AuthProvider } from '@notion-clipper/ui';

function App() {
  return (
    <AuthProvider supabaseClient={supabaseClient}>
      <LocaleProvider>
        <SubscriptionProvider supabaseClient={supabaseClient}>
          {/* ... rest of app */}
        </SubscriptionProvider>
      </LocaleProvider>
    </AuthProvider>
  );
}
```

#### 2. Activer le nouveau flow d'onboarding

```tsx
<Onboarding
  mode="default"
  variant="app"
  platform={platform}
  supabaseClient={supabaseClient}
  useNewAuthFlow={true} // ← Activer le nouveau flow
  onComplete={handleNewOnboardingComplete}
/>
```

#### 3. Nouveau handler pour onComplete

```tsx
const handleNewOnboardingComplete = async (data: {
  userId: string;
  email: string;
  notionToken: string;
  workspace: { id: string; name: string; icon?: string }
}) => {
  console.log('[App] New onboarding completed:', data);

  // 1. Sauvegarder le token Notion dans la notion_connection
  if (supabaseClient) {
    await supabaseClient
      .from('notion_connections')
      .insert({
        user_id: data.userId,
        workspace_id: data.workspace.id,
        workspace_name: data.workspace.name,
        workspace_icon: data.workspace.icon,
        access_token_encrypted: data.notionToken, // TODO: Chiffrer le token
        is_active: true
      });
  }

  // 2. Sauvegarder le token localement (backward compatibility)
  await handleCompleteOnboarding(data.notionToken, data.workspace);

  // 3. Afficher le WelcomePremiumModal
  setShowWelcomePremiumModal(true);
};
```

#### 4. Supprimer la logique de fake email

**À supprimer dans `handleCompleteOnboardingWithModal`:**
```tsx
// ❌ Cette logique n'est plus nécessaire avec le nouveau flow
// const cleanWorkspaceId = workspace.id.replace(/-/g, '');
// const email = `${cleanWorkspaceId}@notionclipperapp.com`;
// await supabaseClient.auth.signUp({ email, password, ... });
```

---

## 🎯 Phase 4: Account Management - TODO

### ConfigPanel - Section Compte

**Fichier:** `packages/ui/src/components/panels/ConfigPanel.tsx`

**Fonctionnalités à ajouter:**
- Affichage email + avatar utilisateur
- Édition nom complet
- Bouton déconnexion
- Liste des workspaces Notion connectés
- Bouton "Connecter un autre workspace"

**UI:**
```tsx
<div className="space-y-4">
  <div className="flex items-center gap-4">
    <img src={profile.avatar_url} className="w-16 h-16 rounded-full" />
    <div>
      <h3>{profile.full_name}</h3>
      <p className="text-sm text-gray-500">{profile.email}</p>
    </div>
  </div>

  <button onClick={signOut}>Déconnexion</button>

  <div className="border-t pt-4">
    <h4>Workspaces Notion connectés</h4>
    {notionConnections.map(conn => (
      <div key={conn.id}>
        <span>{conn.workspace_icon}</span>
        <span>{conn.workspace_name}</span>
      </div>
    ))}
  </div>
</div>
```

---

## 🧪 Phase 7: Tests - TODO

### Tests à effectuer

#### 1. Flow d'authentification complet
- [ ] Inscription avec email/password
- [ ] Connexion avec email/password
- [ ] OAuth Google (si configuré)
- [ ] OAuth Apple (si configuré)
- [ ] Création automatique profil + subscription
- [ ] Connexion Notion après auth
- [ ] Affichage WelcomePremiumModal

#### 2. Gestion de compte
- [ ] Affichage profil dans ConfigPanel
- [ ] Modification nom
- [ ] Déconnexion
- [ ] Reconnexion

#### 3. Multi-workspaces
- [ ] Connexion workspace 1
- [ ] Connexion workspace 2
- [ ] Switch entre workspaces
- [ ] Déconnexion d'un workspace

#### 4. Trial et subscription
- [ ] Démarrer trial depuis modal
- [ ] Vérification tier = 'grace_period' pendant trial
- [ ] Fin de trial → tier = 'premium' ou retour 'free'

---

## 📊 État d'avancement global

| Phase | Nom | Statut | Estimation |
|-------|-----|--------|------------|
| 1 | Backend (Supabase) | ⏸️ À exécuter | ~15 min |
| 2 | Components Auth | ✅ Complété | ~3h |
| 3 | Modifier Onboarding | ✅ Complété | ~2h |
| 4 | App Integration | 🔄 En cours | ~2h |
| 5 | Account Management | ⏳ À faire | ~2h |
| 6 | Migration Users | ⏳ À faire | ~1h |
| 7 | Tests & Polish | ⏳ À faire | ~2h |

**Total complété:** ~5h / ~14h (36%)

---

## 🎨 Design System Implémenté

Tous les composants respectent le design Apple/Notion:

### Palette de couleurs
- Gradients: blue-600 → purple-600 → pink-600
- Backgrounds: Blur circles animés
- Shadows: drop-shadow avec opacity

### Animations
- Framer Motion pour toutes les transitions
- Effets hover: scale, translate, opacity
- Loading states avec spinners personnalisés

### Typographie
- Titles: font-semibold, tracking-tight
- Body: text-gray-600 dark:text-gray-400
- Responsive: text-[26px] desktop, text-[22px] mobile

### Components réutilisables
- Blur circles background (NotionConnectScreen)
- Gradient buttons avec shine effect
- Feature cards avec icônes gradient
- Security notes avec Shield icon

---

## 💡 Recommandations

### Sécurité
1. **Chiffrer les tokens Notion** dans `notion_connections.access_token_encrypted`
   - Utiliser un service de chiffrement côté serveur
   - Créer un Edge Function pour chiffrer/déchiffrer

2. **Ajouter 2FA** (futur)
   - Supabase supporte MFA nativement
   - Facile à intégrer avec AuthContext

### UX
1. **Email de bienvenue** après inscription
   - Configurer dans Supabase Email Templates
   - Personnaliser avec design Notion Clipper

2. **Récupération de mot de passe**
   - Déjà supporté par Supabase
   - Créer une page de reset dans l'app

3. **Onboarding progressif**
   - Afficher tips après première connexion
   - Tour guidé des fonctionnalités

### Performance
1. **Lazy loading** des composants auth
   - Charger AuthScreen seulement si non-authentifié
   - React.lazy() pour NotionConnectScreen

2. **Cache des profils**
   - AuthContext garde le profil en mémoire
   - Refresh seulement si nécessaire

---

## 🚀 Next Steps (Ordre recommandé)

1. **Exécuter la migration SQL** (15 min)
   - Ouvrir Supabase SQL Editor
   - Copier-coller le fichier de migration
   - Run et vérifier

2. **Configurer OAuth Google** (30 min)
   - Google Cloud Console
   - Supabase Dashboard
   - Tester la connexion

3. **Intégrer dans App.tsx** (1-2h)
   - Wrapper AuthProvider
   - Activer useNewAuthFlow
   - Nouveau handler onComplete
   - Supprimer fake email logic

4. **Tester le flow complet** (30 min)
   - Inscription → Auth → Notion → Trial
   - Vérifier DB (profil, connection, subscription)

5. **Account Management** (2h)
   - Section Compte dans ConfigPanel
   - Liste workspaces
   - Déconnexion

6. **Tests et Polish** (2h)
   - Tous les flows
   - Error handling
   - Animations finales

---

## 📞 Support

Questions ou problèmes durant l'implémentation ?

1. Vérifier les logs console (`[Auth]`, `[App]`, `[Onboarding]`)
2. Vérifier les tables Supabase (SQL Editor)
3. Tester avec Supabase Table Editor
4. Vérifier les RLS policies (doivent être bien configurées)

**Documentation:**
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [OAuth Providers Setup](https://supabase.com/docs/guides/auth/social-login)
- [RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
