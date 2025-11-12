# 🔐 Guide d'Implémentation des Edge Functions pour OAuth

## 📋 Vue d'ensemble

Actuellement, les clés OAuth (Google, Notion) sont stockées dans les variables d'environnement Electron côté client. Cela présente des risques de sécurité car:
- Les secrets peuvent être extraits du code client
- Les tokens sont exposés dans le code JavaScript
- Pas de contrôle centralisé sur les clés

**Solution**: Déplacer l'échange de tokens OAuth vers des Supabase Edge Functions sécurisées.

## 🎯 Architecture Proposée

### Avant (Actuel)
```
Client Electron → OAuth Provider (Google/Notion)
                ↓
            Token Exchange (avec client_secret exposé)
                ↓
            Supabase Auth
```

### Après (Sécurisé)
```
Client Electron → OAuth Provider (Google/Notion)
                ↓
            Authorization Code
                ↓
        Supabase Edge Function
                ↓
            Token Exchange (client_secret dans Supabase Vault)
                ↓
            Supabase Auth
```

## 📁 Structure des Fichiers

```
supabase/
├── functions/
│   ├── google-oauth/
│   │   └── index.ts
│   ├── notion-oauth/
│   │   └── index.ts
│   └── shared/
│       └── oauth-utils.ts
└── .env.local (pour développement local)
```

## 🛠️ Étape 1: Configuration Supabase

### 1.1 Installer Supabase CLI

```bash
npm install -g supabase
```

### 1.2 Initialiser le projet Supabase

```bash
cd /path/to/NotionClipper
supabase init
```

### 1.3 Configurer les secrets Supabase

```bash
# Google OAuth
supabase secrets set GOOGLE_CLIENT_ID=your-client-id
supabase secrets set GOOGLE_CLIENT_SECRET=your-client-secret

# Notion OAuth
supabase secrets set NOTION_CLIENT_ID=298d872b-594c-808a-bdf4-00379b703b97
supabase secrets set NOTION_CLIENT_SECRET=your-secret
```

## 📝 Étape 2: Créer les Edge Functions

### 2.1 Edge Function pour Google OAuth

Créer `supabase/functions/google-oauth/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface OAuthRequest {
  code: string;
  redirectUri: string;
  codeVerifier?: string; // Pour PKCE
}

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    // Parse request body
    const { code, redirectUri, codeVerifier }: OAuthRequest = await req.json()

    // Get secrets from Supabase Vault
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      throw new Error('OAuth credentials not configured')
    }

    // Exchange authorization code for tokens
    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
    })

    // Add PKCE verifier if present
    if (codeVerifier) {
      tokenBody.append('code_verifier', codeVerifier)
    }

    // Call Google token endpoint
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenBody,
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      throw new Error(`Token exchange failed: ${error}`)
    }

    const tokenData = await tokenResponse.json()

    // Fetch user info
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    })

    const userInfo = await userInfoResponse.json()

    // Create or update Supabase user
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userInfo.email,
      email_confirm: true,
      user_metadata: {
        provider: 'google',
        full_name: userInfo.name,
        avatar_url: userInfo.picture,
        google_access_token: tokenData.access_token,
        google_refresh_token: tokenData.refresh_token,
      }
    })

    if (authError) throw authError

    return new Response(JSON.stringify({
      success: true,
      userId: authData.user.id,
      email: userInfo.email,
      userInfo: {
        name: userInfo.name,
        picture: userInfo.picture,
        email: userInfo.email,
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      status: 200,
    })

  } catch (error: any) {
    console.error('Google OAuth error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      status: 400,
    })
  }
})
```

### 2.2 Edge Function pour Notion OAuth

Créer `supabase/functions/notion-oauth/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface OAuthRequest {
  code: string;
  redirectUri: string;
}

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    const { code, redirectUri }: OAuthRequest = await req.json()

    // Get secrets from Supabase Vault
    const NOTION_CLIENT_ID = Deno.env.get('NOTION_CLIENT_ID')
    const NOTION_CLIENT_SECRET = Deno.env.get('NOTION_CLIENT_SECRET')

    if (!NOTION_CLIENT_ID || !NOTION_CLIENT_SECRET) {
      throw new Error('OAuth credentials not configured')
    }

    // Exchange authorization code for tokens (Notion uses Basic Auth)
    const credentials = btoa(`${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`)

    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    })

    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: tokenBody,
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      throw new Error(`Token exchange failed: ${error}`)
    }

    const tokenData = await tokenResponse.json()

    // Create or update Supabase user
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Use workspace info for user creation
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: `notion-${tokenData.workspace_id}@notion-clipper.local`, // Temporary email
      email_confirm: true,
      user_metadata: {
        provider: 'notion',
        workspace_id: tokenData.workspace_id,
        workspace_name: tokenData.workspace_name,
        workspace_icon: tokenData.workspace_icon,
        notion_access_token: tokenData.access_token,
      }
    })

    if (authError) throw authError

    return new Response(JSON.stringify({
      success: true,
      userId: authData.user.id,
      token: tokenData.access_token,
      workspace: {
        id: tokenData.workspace_id,
        name: tokenData.workspace_name,
        icon: tokenData.workspace_icon,
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      status: 200,
    })

  } catch (error: any) {
    console.error('Notion OAuth error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      status: 400,
    })
  }
})
```

## 🔧 Étape 3: Modifier le Code Electron

### 3.1 Mettre à jour UnifiedOAuthManager

Dans `apps/notion-clipper-app/src/electron/services/unified-oauth-manager.ts`:

```typescript
/**
 * Exchange authorization code for access token via Supabase Edge Function
 * This keeps client secrets secure on the server
 */
private async exchangeCodeForToken(
  provider: OAuthProvider,
  config: OAuthProviderConfig,
  code: string,
  codeVerifier?: string
): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }> {
  const redirectUri = this.server.getCallbackUrl();

  // Determine Edge Function URL
  const edgeFunctionUrl = provider === 'google'
    ? `${process.env.SUPABASE_URL}/functions/v1/google-oauth`
    : `${process.env.SUPABASE_URL}/functions/v1/notion-oauth`;

  // Call Edge Function instead of provider directly
  const response = await fetch(edgeFunctionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      code,
      redirectUri,
      codeVerifier, // For PKCE (Google)
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[UnifiedOAuth] Edge Function failed:`, errorText);
    throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'OAuth failed');
  }

  return {
    accessToken: data.token || data.userInfo?.email, // Temporary
    refreshToken: data.refreshToken,
    expiresIn: data.expiresIn,
  };
}
```

### 3.2 Supprimer les Secrets du Code Client

Dans `.env` ou configuration Electron, **supprimer**:
```bash
# ❌ NE PLUS UTILISER
# GOOGLE_CLIENT_SECRET=...
# NOTION_CLIENT_SECRET=...
```

**Garder** uniquement les identifiants publics:
```bash
# ✅ OK - Public client IDs
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
NOTION_CLIENT_ID=298d872b-594c-808a-bdf4-00379b703b97

# ✅ OK - Supabase public keys
SUPABASE_URL=https://rijjtngbgahxdjflfyhi.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🚀 Étape 4: Déploiement

### 4.1 Déployer les Edge Functions

```bash
# Se connecter à Supabase
supabase login

# Lier au projet
supabase link --project-ref your-project-ref

# Déployer les fonctions
supabase functions deploy google-oauth
supabase functions deploy notion-oauth
```

### 4.2 Tester les Edge Functions

```bash
# Test local (development)
supabase start
supabase functions serve google-oauth --env-file supabase/.env.local

# Test avec curl
curl -X POST http://localhost:54321/functions/v1/google-oauth \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "test-code",
    "redirectUri": "http://localhost:8080/oauth/callback",
    "codeVerifier": "test-verifier"
  }'
```

## 🔒 Avantages de cette Architecture

### Sécurité
- ✅ Client secrets jamais exposés au client
- ✅ Tokens gérés côté serveur
- ✅ Rotation des secrets sans rebuild du client
- ✅ Logs centralisés des tentatives OAuth

### Maintenance
- ✅ Mise à jour des clés sans redeployer l'app
- ✅ Monitoring centralisé via Supabase Dashboard
- ✅ Rate limiting et protection DDoS via Supabase
- ✅ Conformité RGPD/CCPA simplifiée

### Performance
- ✅ Pas de bundle size augmenté côté client
- ✅ Edge Functions déployées globalement (faible latence)
- ✅ Caching possible au niveau Edge Function

## 📊 Migration Progressive

### Phase 1: Déploiement Parallèle
1. Déployer les Edge Functions
2. Garder l'ancien système actif
3. Tester avec un petit % d'utilisateurs

### Phase 2: Migration Graduelle
1. Feature flag pour basculer entre ancien/nouveau système
2. Monitoring des erreurs
3. Rollback facile si problème

### Phase 3: Décommissionnement
1. 100% des utilisateurs sur Edge Functions
2. Supprimer l'ancien code OAuth
3. Supprimer les secrets du client

## 🐛 Debugging

### Logs Edge Functions
```bash
# Voir les logs en temps réel
supabase functions logs google-oauth --follow
```

### Test Local
```bash
# Lancer Supabase localement
supabase start

# Tester avec curl
curl -X POST http://localhost:54321/functions/v1/google-oauth \
  -H "Authorization: Bearer anon-key" \
  -H "Content-Type: application/json" \
  -d @test-request.json
```

## 📚 Ressources

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Supabase Secrets Management](https://supabase.com/docs/guides/functions/secrets)
- [Google OAuth 2.0 Desktop Apps](https://developers.google.com/identity/protocols/oauth2/native-app)
- [Notion OAuth Documentation](https://developers.notion.com/docs/authorization)

## ✅ Checklist d'Implémentation

- [ ] Installer Supabase CLI
- [ ] Initialiser le projet Supabase
- [ ] Configurer les secrets dans Supabase Vault
- [ ] Créer Edge Function pour Google OAuth
- [ ] Créer Edge Function pour Notion OAuth
- [ ] Tester les Edge Functions localement
- [ ] Modifier UnifiedOAuthManager pour utiliser Edge Functions
- [ ] Supprimer les client secrets du code Electron
- [ ] Déployer les Edge Functions en production
- [ ] Tester le flow OAuth complet
- [ ] Monitoring et logs
- [ ] Documentation utilisateur mise à jour

---

**Note**: Cette implémentation nécessite un projet Supabase actif et des crédits pour les Edge Functions. Le tier gratuit de Supabase inclut 500,000 invocations/mois, largement suffisant pour une app desktop.
