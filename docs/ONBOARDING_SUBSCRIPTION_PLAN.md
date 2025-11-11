# 🔍 Analyse du Problème Actuel + Plan d'Action

## ❌ Problème Identifié

### Flow Actuel (INCOMPLET)
```
1. Utilisateur lance l'app
2. Onboarding → OAuth Notion
3. Récupère token Notion
4. Sauvegarde token dans config local
5. ❌ PAS d'enregistrement dans Supabase Auth
6. ❌ PAS de user_id Supabase
7. ❌ IMPOSSIBLE de créer subscription
```

**Résultat:** L'erreur `No subscription found for current user` parce qu'il n'y a **pas d'utilisateur Supabase**.

---

## ✅ Solution Complète

### Nouveau Flow (COMPLET)

```
1. Utilisateur lance l'app
2. Onboarding → OAuth Notion
3. Récupère token Notion + workspace info
4. ✅ NOUVEAU: Enregistrer dans Supabase Auth
   └─ Utiliser email du workspace Notion
   └─ Générer mot de passe aléatoire (ou passwordless)
   └─ Créer user dans Supabase Auth
5. ✅ Edge Function crée subscription FREE automatiquement
6. ✅ NOUVEAU: Modal "Découvrir Premium"
   └─ Non intrusif
   └─ Peut être ignoré → reste FREE
   └─ Propose trial 14 jours AVEC carte bancaire
7. Si trial accepté:
   └─ Ouvre Stripe Checkout
   └─ Carte enregistrée mais pas débitée
   └─ 14 jours gratuits
   └─ Prélèvement auto après trial
8. App fonctionnelle
```

---

## 📝 Détails Techniques

### 1. Enregistrement Supabase Auth après OAuth Notion

**Où:** `packages/ui/src/hooks/core/useAppInitialization.ts`

**Modifier:** `handleCompleteOnboarding()`

```typescript
const handleCompleteOnboarding = useCallback(async (token: string) => {
  try {
    console.log('[ONBOARDING] ✨ Completing onboarding...');

    // 1. Sauvegarder le token Notion
    await updateConfig({
      notionToken: token.trim(),
      onboardingCompleted: true
    });

    // 🆕 2. NOUVEAU: Enregistrer dans Supabase Auth
    if (window.electronAPI?.supabase) {
      try {
        console.log('[ONBOARDING] 🔐 Creating Supabase user...');

        // Récupérer l'email du workspace Notion
        const workspaceInfo = await window.electronAPI.invoke('notion:get-workspace-info');
        const email = workspaceInfo?.ownerEmail || `user-${Date.now()}@notionclipper.app`;

        // Créer un utilisateur Supabase (passwordless ou avec password aléatoire)
        const { data, error } = await window.electronAPI.supabase.auth.signUp({
          email: email,
          password: generateSecurePassword(), // Générer mot de passe aléatoire
          options: {
            data: {
              notion_workspace_id: workspaceInfo?.workspaceId,
              notion_workspace_name: workspaceInfo?.workspaceName,
              source: 'notion_oauth'
            }
          }
        });

        if (error) {
          // Si l'utilisateur existe déjà, se connecter
          if (error.message.includes('already registered')) {
            console.log('[ONBOARDING] User exists, signing in...');
            // Option: utiliser magic link ou OAuth email
          } else {
            throw error;
          }
        }

        console.log('[ONBOARDING] ✅ Supabase user created:', data.user?.id);

        // La subscription FREE sera créée automatiquement par Edge Function

      } catch (supabaseError) {
        console.error('[ONBOARDING] ⚠️ Supabase registration failed:', supabaseError);
        // Continuer quand même (subscription sera créée au prochain appel API)
      }
    }

    // 3. Réinitialiser NotionService
    await window.electronAPI?.invoke?.('notion:reinitialize-service');

    // 4. Charger les pages
    await loadPages();

    // 🆕 5. NOUVEAU: Afficher modal upgrade optionnel
    setShowUpgradeProposal(true);

    // 6. Marquer onboarding complété
    setOnboardingCompleted(true);
    setShowOnboarding(false);
    setLoading(false);

  } catch (error) {
    console.error('[ONBOARDING] ❌ Error:', error);
    showNotification('Erreur lors de la finalisation', 'error');
  }
}, [updateConfig, loadPages, showNotification]);
```

---

### 2. Modal "Découvrir Premium" (Non Intrusif)

**Créer:** `packages/ui/src/components/subscription/WelcomePremiumModal.tsx`

```typescript
interface WelcomePremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTrial: () => void;
  onStayFree: () => void;
}

export function WelcomePremiumModal({
  isOpen,
  onClose,
  onStartTrial,
  onStayFree
}: WelcomePremiumModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full p-8"
      >
        {/* Icon */}
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Sparkles size={32} className="text-white" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center mb-3">
          Bienvenue sur NotionClipper ! 🎉
        </h2>

        {/* Subtitle */}
        <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
          Découvrez toutes les fonctionnalités avec <strong>14 jours d'essai gratuit</strong>
        </p>

        {/* Features */}
        <div className="space-y-3 mb-6">
          {[
            { icon: Infinity, text: 'Clips illimités' },
            { icon: Files, text: 'Upload de fichiers sans limite' },
            { icon: Zap, text: 'Modes Focus & Compact illimités' },
            { icon: Headphones, text: 'Support prioritaire' }
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <Icon size={20} className="text-blue-600" />
              <span>{text}</span>
            </div>
          ))}
        </div>

        {/* Info Trial */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <p className="font-medium mb-1">Comment ça marche ?</p>
              <ul className="space-y-1 text-xs">
                <li>✅ 14 jours gratuits pour tester toutes les fonctionnalités</li>
                <li>💳 Carte bancaire requise (non débitée pendant l'essai)</li>
                <li>🔄 Annulation possible à tout moment</li>
                <li>💰 <strong>3,99€/mois</strong> après l'essai si vous continuez</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {/* Primary: Start Trial */}
          <button
            onClick={onStartTrial}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
          >
            Démarrer l'essai gratuit (14 jours)
          </button>

          {/* Secondary: Stay Free */}
          <button
            onClick={onStayFree}
            className="w-full py-3 text-gray-600 dark:text-gray-400 font-medium hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Peut-être plus tard, rester en gratuit
          </button>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-500 text-center mt-4">
          Vous pourrez passer à Premium plus tard depuis les paramètres
        </p>
      </motion.div>
    </div>
  );
}
```

---

### 3. Stripe Checkout avec Trial 14 jours + Carte Requise

**Modifier:** `supabase/functions/create-checkout/index.ts`

**Ajouter paramètre:** `trial_period_days`

```typescript
// supabase/functions/create-checkout/index.ts

serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 🆕 Récupérer les paramètres
    const { success_url, cancel_url, trial_days } = await req.json();

    // Récupérer ou créer customer Stripe
    let customerId = null;
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (!subscription?.stripe_customer_id) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id
        }
      });
      customerId = customer.id;

      // Mettre à jour la subscription avec customer_id
      await supabase
        .from('subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', user.id);
    } else {
      customerId = subscription.stripe_customer_id;
    }

    // 🆕 Créer Stripe Checkout avec trial
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: STRIPE_PREMIUM_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: success_url || 'notionclipper://subscription/success',
      cancel_url: cancel_url || 'notionclipper://subscription/canceled',

      // 🆕 TRIAL CONFIGURATION
      subscription_data: trial_days ? {
        trial_period_days: trial_days, // 14 jours
        trial_settings: {
          end_behavior: {
            // 💳 Forcer la carte bancaire pendant le trial
            missing_payment_method: 'cancel'
          }
        }
      } : undefined,

      // 🆕 Collecter la carte même pendant le trial
      payment_method_collection: 'always',

      metadata: {
        supabase_user_id: user.id,
        has_trial: trial_days ? 'true' : 'false',
        trial_days: trial_days?.toString() || '0'
      },
    });

    return new Response(
      JSON.stringify({
        url: session.url,
        session_id: session.id
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error creating checkout:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
```

---

### 4. Gérer le Webhook Stripe pour Trial

**Modifier:** `supabase/functions/webhook-stripe/index.ts`

**Ajouter gestion:** `customer.subscription.trial_will_end`

```typescript
// Événements Stripe à écouter
switch (event.type) {
  case 'checkout.session.completed': {
    const session = event.data.object;
    const subscriptionId = session.subscription;
    const customerId = session.customer;
    const userId = session.metadata.supabase_user_id;
    const hasTrial = session.metadata.has_trial === 'true';

    if (!userId) {
      console.error('No user_id in metadata');
      break;
    }

    // Récupérer la subscription Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Déterminer le tier
    const tier = hasTrial ? 'grace_period' : 'premium';
    const gracePeriodEndsAt = hasTrial
      ? new Date(stripeSubscription.trial_end * 1000)
      : null;

    // Mettre à jour dans Supabase
    const { error } = await supabase
      .from('subscriptions')
      .update({
        tier: tier,
        status: 'active',
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        stripe_price_id: stripeSubscription.items.data[0].price.id,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000),
        is_grace_period: hasTrial,
        grace_period_ends_at: gracePeriodEndsAt,
        updated_at: new Date()
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating subscription:', error);
    }
    break;
  }

  // 🆕 NOUVEAU: Trial se termine bientôt (3 jours avant)
  case 'customer.subscription.trial_will_end': {
    const subscription = event.data.object;
    const userId = subscription.metadata.supabase_user_id;

    // TODO: Envoyer email de rappel
    console.log(`Trial ending soon for user ${userId}`);
    break;
  }

  // 🆕 NOUVEAU: Subscription activée après trial
  case 'customer.subscription.updated': {
    const subscription = event.data.object;
    const userId = subscription.metadata.supabase_user_id;

    // Si trial vient de se terminer
    if (subscription.status === 'active' && !subscription.trial_end) {
      await supabase
        .from('subscriptions')
        .update({
          tier: 'premium',
          is_grace_period: false,
          grace_period_ends_at: null,
          status: 'active',
          updated_at: new Date()
        })
        .eq('user_id', userId);
    }
    break;
  }

  // ... autres événements
}
```

---

## 📊 Flow Complet avec Trial

### Scénario 1: Utilisateur accepte le trial

```
1. Onboarding → OAuth Notion ✅
2. Enregistrement Supabase Auth ✅
3. Subscription FREE créée ✅
4. Modal "Découvrir Premium" affichée
5. Utilisateur clique "Démarrer l'essai"
6. createCheckoutSession({ trial_days: 14 }) appelé
7. Stripe Checkout ouvert (avec carte requise)
8. Utilisateur entre sa carte
9. Paiement autorisé mais PAS débité
10. Webhook → tier = 'grace_period', grace_period_ends_at = +14 jours
11. Badge affiche "🎉 Essai Premium (14 jours restants)"
12. Utilisateur a accès à toutes les features Premium
13. Après 14 jours → Prélèvement automatique 3,99€
14. tier passe à 'premium'
```

### Scénario 2: Utilisateur refuse le trial

```
1-3. Identique
4. Modal "Découvrir Premium" affichée
5. Utilisateur clique "Rester en gratuit"
6. Modal se ferme
7. tier reste 'free'
8. Badge affiche "🆓 Gratuit"
9. Quotas limités (100 clips, 10 files, etc.)
10. Peut upgrader plus tard depuis ConfigPanel
```

---

## 🎯 Résumé des Modifications

### Fichiers à modifier:

1. **`packages/ui/src/hooks/core/useAppInitialization.ts`**
   - Ajouter enregistrement Supabase Auth dans `handleCompleteOnboarding`

2. **`packages/ui/src/components/subscription/WelcomePremiumModal.tsx`** (NOUVEAU)
   - Modal non intrusif pour proposer trial

3. **`supabase/functions/create-checkout/index.ts`**
   - Ajouter support `trial_period_days`
   - Configurer `payment_method_collection: 'always'`

4. **`supabase/functions/webhook-stripe/index.ts`**
   - Gérer `customer.subscription.trial_will_end`
   - Mettre à jour tier après trial

5. **`apps/notion-clipper-app/src/react/src/App.tsx`**
   - Ajouter state pour modal upgrade
   - Gérer acceptance/refus trial

---

## ✅ Avantages de cette Solution

1. **Expérience utilisateur fluide** : OAuth Notion + Supabase automatique
2. **Non intrusif** : Peut refuser le trial et rester free
3. **Sécurisé** : Carte requise mais pas débitée pendant trial
4. **Conversion optimale** : Trial 14 jours encourage l'adoption
5. **Pas de friction** : Prélèvement automatique après trial
6. **Transparent** : Utilisateur sait exactement quand il sera débité

---

**🎊 Prêt à implémenter ?**

Je peux créer tous ces fichiers et modifications si tu veux !
