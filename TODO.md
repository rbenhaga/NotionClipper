# 📋 TODO - Notion Clipper Pro

Tâches restantes et améliorations futures (post-implémentation freemium).

---

## 🔴 PRIORITÉ 1 - Intégrations Required

### 1. Connecter Quota Checks à App.tsx

**Status**: 🔄 À faire
**Temps estimé**: 1-2h
**Complexité**: Moyenne

Les quota checks ont été implémentés dans les composants, mais doivent être câblés dans `App.tsx` :

#### FileUploadZone
```tsx
// Dans App.tsx, passer les props au FileUploadZone
<FileUploadZone
  onFileSelect={handleFileSelect}
  onQuotaCheck={async (filesCount) => {
    const summary = await subscriptionContext.quotaService.getQuotaSummary();
    const remaining = summary.files.remaining;

    return {
      canUpload: summary.files.can_use && (remaining === null || remaining >= filesCount),
      quotaReached: !summary.files.can_use,
      remaining: remaining !== null ? remaining : undefined
    };
  }}
  onQuotaExceeded={() => {
    setShowUpgradeModal(true);
    setUpgradeModalFeature('files');
    setUpgradeModalQuotaReached(true);
  }}
/>
```

#### useFocusMode
```tsx
// Dans App.tsx, passer quotaOptions au useFocusMode
const focusMode = useFocusMode(
  window.electronAPI?.focusMode,
  {
    onQuotaCheck: async () => {
      const summary = await subscriptionContext.quotaService.getQuotaSummary();
      const remaining = summary.focus_mode_time.remaining;

      return {
        canUse: summary.focus_mode_time.can_use,
        quotaReached: !summary.focus_mode_time.can_use,
        remaining: remaining !== null ? remaining : undefined
      };
    },
    onQuotaExceeded: () => {
      setShowUpgradeModal(true);
      setUpgradeModalFeature('focus_mode_time');
      setUpgradeModalQuotaReached(true);
    }
  }
);
```

#### MinimalistView (Compact Mode)
```tsx
// Dans App.tsx, gérer l'activation du Compact Mode avec check
const handleEnterCompactMode = async () => {
  // Check quota
  const summary = await subscriptionContext.quotaService.getQuotaSummary();

  if (!summary.compact_mode_time.can_use) {
    setShowUpgradeModal(true);
    setUpgradeModalFeature('compact_mode_time');
    setUpgradeModalQuotaReached(true);
    return;
  }

  // Activer Compact Mode
  // ... code existant
};
```

**Fichiers à modifier**:
- `apps/notion-clipper-app/src/react/src/App.tsx`

---

### 2. Tracker Usage Après Actions

**Status**: 🔄 À faire
**Temps estimé**: 2-3h
**Complexité**: Moyenne

Appeler `track-usage` Edge Function après chaque action consommant des quotas :

#### Après Upload Fichiers
```tsx
// Dans App.tsx, après upload réussi
if (uploadResult.success) {
  // Track usage
  await subscriptionContext.usageTrackingService.track('files', filesCount);

  // Refresh quotas
  await loadSubscriptionData();
}
```

#### Tracking Minutes Focus Mode
```tsx
// Dans useFocusMode.ts, tracker le temps toutes les minutes
useEffect(() => {
  if (!state.enabled) return;

  const interval = setInterval(async () => {
    // Track 1 minute
    if (quotaOptions?.onTrackUsage) {
      await quotaOptions.onTrackUsage(1); // 1 minute
    }
  }, 60000); // Chaque minute

  return () => clearInterval(interval);
}, [state.enabled]);
```

#### Tracking Minutes Compact Mode
```tsx
// Similaire à Focus Mode, tracker le temps d'utilisation
```

**Fichiers à modifier**:
- `apps/notion-clipper-app/src/react/src/App.tsx`
- `packages/ui/src/hooks/data/useFocusMode.ts`
- Ajouter hook `useCompactMode.ts` (ou gérer dans App.tsx)

**Props à ajouter**:
- `FocusModeQuotaCheck.onTrackUsage?: (minutes: number) => Promise<void>`

---

### 3. Ajouter PremiumBadge aux Features

**Status**: 🔄 À faire
**Temps estimé**: 30min
**Complexité**: Facile

Ajouter le badge PRO visuellement sur les features premium :

#### Dans Header.tsx
```tsx
import { PremiumFeature, PremiumBadge } from '@notion-clipper/ui';

// Bouton Focus Mode
<PremiumFeature badgeVariant="compact">
  <button onClick={handleFocusMode}>Mode Focus</button>
</PremiumFeature>

// Bouton Compact Mode
<PremiumFeature badgeVariant="compact">
  <button onClick={handleCompactMode}>Mode Compact</button>
</PremiumFeature>
```

#### Dans ConfigPanel
```tsx
// Section Mode Offline
<div className="flex items-center justify-between">
  <span>Mode Offline</span>
  <PremiumBadge variant="compact" />
</div>
```

**Fichiers à modifier**:
- `packages/ui/src/components/layout/Header.tsx`
- `packages/ui/src/components/panels/ConfigPanel.tsx`
- Autres composants affichant features premium

---

### 4. Toasts Informatifs Quotas

**Status**: 🔄 À faire
**Temps estimé**: 1h
**Complexité**: Facile

Afficher toasts quand l'utilisateur approche des limites :

```tsx
// Dans App.tsx, après chaque action
const checkAndNotifyQuotas = async () => {
  const summary = await subscriptionContext.quotaService.getQuotaSummary();

  // Alert si < 20% restant
  if (summary.clips.alert_level === 'warning') {
    notifications.show({
      type: 'warning',
      title: 'Quota clips bientôt atteint',
      message: `Plus que ${summary.clips.remaining} clips ce mois-ci`,
      duration: 5000
    });
  }

  // Similaire pour files, focus_mode_time, compact_mode_time
};
```

**Fichiers à modifier**:
- `apps/notion-clipper-app/src/react/src/App.tsx`
- Utiliser `useNotifications` hook existant

---

## 🔴 PRIORITÉ CRITIQUE - Time Tracking

### 1. Time Tracking Focus Mode

**Status**: ✅ Complété
**Temps réel**: 30min
**Complexité**: Moyenne

✅ Ajouté tracking automatique 1 minute intervals pendant Focus Mode actif

**Fichiers modifiés** :
- ✅ `packages/ui/src/hooks/data/useFocusMode.ts`
  - Ajouté `onTrackUsage?: (minutes: number) => Promise<void>` dans `FocusModeQuotaCheck`
  - Ajouté `useEffect` qui track toutes les 60s quand `state.enabled === true`
  - Logs: Start tracking, minute count, stop tracking

**Fonctionnement** :
```typescript
// Démarre quand Focus Mode activé
useEffect(() => {
  if (!state.enabled || !quotaOptions?.onTrackUsage) return;

  const interval = setInterval(async () => {
    await quotaOptions.onTrackUsage(1); // Track 1min
  }, 60000); // Chaque minute

  return () => clearInterval(interval); // Stop au disable
}, [state.enabled]);
```

### 2. Time Tracking Compact Mode

**Status**: ✅ Complété
**Temps réel**: 30min
**Complexité**: Moyenne

✅ Ajouté tracking automatique 1 minute intervals pendant Compact Mode actif

**Fichiers modifiés** :
- ✅ `packages/ui/src/components/layout/MinimalistView.tsx`
  - Import `useEffect`
  - Ajouté `onTrackCompactUsage?: (minutes: number) => Promise<void>` dans props
  - Ajouté `useEffect` qui track toutes les 60s quand `isCompactModeActive === true`
  - Logs: Start tracking, minute count, stop tracking

- ✅ `apps/notion-clipper-app/src/react/src/App.tsx`
  - Connecté `onTrackCompactUsage` dans MinimalistView
  - Callback: `await trackUsage('compact_mode_minutes', minutes)`

**Fonctionnement** :
```typescript
// Démarre quand Compact Mode activé
useEffect(() => {
  if (!isCompactModeActive || !onTrackCompactUsage) return;

  const interval = setInterval(async () => {
    await onTrackCompactUsage(1); // Track 1min
  }, 60000);

  return () => clearInterval(interval);
}, [isCompactModeActive]);
```

**Résultat** : Les quotas Focus/Compact sont maintenant **complètement fonctionnels** 🎉

---

## 🟡 PRIORITÉ 2 - Optimisations & Polish

### 5. Nettoyage Logs Production

**Status**: ✅ Complété
**Temps réel**: 30min
**Complexité**: Facile

✅ Remplacé tous les `console.log/warn/error` par `logger` dans subscription.service.ts

**Fichiers modifiés** :
- ✅ `packages/core-shared/src/services/logger.service.ts`
  - Ajouté `subscriptionLogger` et `usageLogger`
- ✅ `packages/core-shared/src/services/subscription.service.ts`
  - Import `subscriptionLogger as logger`
  - Remplacé ~20 console.log → logger.debug
  - Remplacé ~5 console.warn → logger.warn
  - Remplacé ~5 console.error → logger.error

**Logger Production-Safe** :
```typescript
// En production (NODE_ENV=production): Seuls WARN et ERROR visibles
// En dev: Tous les niveaux (DEBUG, INFO, WARN, ERROR)
export const logger = new Logger(
  process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG
);
```

**Remaining** (optionnel - Priority 3):
- `packages/ui/src/services/AuthDataManager.ts`
- `apps/notion-clipper-app/src/react/src/App.tsx`
- Hooks dans `packages/ui/src/hooks/`

---

### 6. Désactivation Visuelle Boutons Quota Atteint

**Status**: ✅ Complété
**Temps réel**: 30min
**Complexité**: Facile

✅ Désactivation visuelle des boutons/features quand quota atteint

**Fichiers modifiés**:
- ✅ `packages/ui/src/components/layout/Header.tsx`
  - **Focus Mode button**: disabled + opacity-50 + cursor-not-allowed quand `quotaSummary.focus_mode_time.can_use === false`
  - **Compact Mode button**: disabled + opacity-50 + cursor-not-allowed quand `quotaSummary.compact_mode_time.can_use === false`
  - Tooltips mis à jour pour afficher message quota atteint
  - Classes conditionnelles: `text-gray-400 dark:text-gray-600 opacity-50 cursor-not-allowed`

- ✅ `packages/ui/src/components/editor/FileUploadZone.tsx`
  - Ajouté props `quotaRemaining` et `quotaLimit` pour affichage visuel
  - **État exhausted** (quota = 0): Border rouge, icône AlertCircle, message "Quota fichiers atteint", cursor-not-allowed
  - **État warning** (quota < 20%): Border orange, icône AlertTriangle, message "Plus que X fichier(s)"
  - **État normal**: Affiche compteur "X/Y restants" de manière discrète
  - Couleurs sémantiques: Gris → Orange → Rouge

**Résultat**: Feedback visuel clair et non-punitif pour les utilisateurs FREE approchant ou ayant atteint leurs quotas ✨

---

### 7. Tests Unitaires Quota Checks

**Status**: 🔄 À faire (optionnel)
**Temps estimé**: 3-4h
**Complexité**: Moyenne

Ajouter tests Jest pour les quota checks :

```typescript
// packages/ui/src/components/editor/__tests__/FileUploadZone.test.tsx
describe('FileUploadZone Quota Checks', () => {
  it('should block upload when quota reached', async () => {
    const onQuotaCheck = jest.fn().mockResolvedValue({
      canUpload: false,
      quotaReached: true,
      remaining: 0
    });

    const { getByText } = render(
      <FileUploadZone onQuotaCheck={onQuotaCheck} />
    );

    // Upload file
    // ... fireEvent upload

    // Expect error message
    expect(getByText(/quota.*atteint/i)).toBeInTheDocument();
  });
});
```

**Fichiers à créer**:
- `packages/ui/src/components/editor/__tests__/FileUploadZone.test.tsx`
- `packages/ui/src/hooks/data/__tests__/useFocusMode.test.ts`
- `packages/core-shared/src/services/__tests__/subscription.service.test.ts`

---

## 🟢 PRIORITÉ 3 - Améliorations Futures

### 8. Analytics & Monitoring

**Status**: 🔜 Future
**Temps estimé**: 2-3h
**Complexité**: Moyenne

Tracker événements pour analytics business :

```typescript
// Intégration Mixpanel ou Amplitude
analytics.track('Quota Reached', {
  feature: 'clips',
  tier: 'free',
  used: 100,
  limit: 100
});

analytics.track('Upgrade Modal Shown', {
  feature: 'focus_mode_time',
  quotaReached: true
});

analytics.track('Upgrade Clicked', {
  source: 'quota_modal',
  feature: 'files'
});
```

**Fichiers à créer**:
- `packages/ui/src/utils/analytics.ts`

---

### 9. Notifications Push Quota Warnings

**Status**: ✅ Complété
**Temps réel**: 1h
**Complexité**: Moyenne

✅ Notifications push système quand quotas < 20% restants (> 80% utilisés)

**Fichiers modifiés**:
- ✅ `apps/notion-clipper-app/src/react/src/App.tsx`
  - Ajouté état `shownQuotaWarnings` (Set<string>) pour tracking session
  - Enhanced `checkAndShowQuotaWarnings` function:
    - **Toast notification** (in-app) via `notifications.showNotification()`
    - **Push notification** (système) via Web Notifications API
    - Demande permission au démarrage si `Notification.permission === 'default'`
    - Ne montre chaque warning qu'une fois par session (évite spam)
    - Tag unique `quota-${feature}` pour éviter doublons système
  - 4 warnings implémentés: clips, files, focus_mode_time, compact_mode_time
  - Seuil: > 80% utilisé (< 20% restant)
  - Messages encourageants: "Passez à Premium pour un usage illimité"

**Fonctionnement**:
```typescript
// Session tracking
const [shownQuotaWarnings, setShownQuotaWarnings] = useState<Set<string>>(new Set());

// Notification permission
useEffect(() => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}, []);

// Warning logic
if (summary.clips.percentage > 80 && !shownQuotaWarnings.has('clips')) {
  // Toast + Push notification
  new Notification('Notion Clipper Pro', {
    body: 'Plus que X clips ce mois-ci. Passez à Premium.',
    icon: '/icon.png',
    tag: 'quota-clips'
  });
}
```

**Résultat**: Utilisateurs avertis proactivement avant d'atteindre la limite, expérience non-intrusive ✨

---

### 10. Quota Reset Countdown

**Status**: ✅ Complété
**Temps réel**: 45min
**Complexité**: Facile

✅ Countdown temps réel jusqu'au reset des quotas (renouvellement période)

**Fichiers modifiés**:
- ✅ `packages/ui/src/components/subscription/QuotaCounter.tsx`
  - Créé composant `Countdown` avec useState + useEffect
  - Calcul temps restant en jours, heures, minutes
  - Update toutes les 60 secondes (interval 60000ms)
  - Cleanup interval sur unmount
  - Formats:
    - Compact: "Xj" ou "Xh" ou "Xmin"
    - Complet: "X jours Y heures" ou "X heures Y minutes" ou "X minutes"
  - Intégré dans Header de QuotaCounter avec icône RotateCcw
  - Utilise `summary.period_end` (ISO date string)

**Composant Countdown**:
```typescript
const Countdown: React.FC<{ targetDate: string; compact?: boolean }> = ({ targetDate, compact }) => {
  const [timeRemaining, setTimeRemaining] = useState<{ days, hours, minutes } | null>(null);

  useEffect(() => {
    const calculate = () => {
      const diff = new Date(targetDate).getTime() - new Date().getTime();
      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      };
    };

    setTimeRemaining(calculate());
    const interval = setInterval(() => setTimeRemaining(calculate()), 60000);
    return () => clearInterval(interval);
  }, [targetDate]);

  // Format display logic...
};
```

**Affichage dans Header**:
```tsx
<div className="flex items-center gap-1.5">
  <RotateCcw size={12} />
  <span>Reset dans </span>
  <span className="font-medium"><Countdown targetDate={summary.period_end} /></span>
</div>
```

**Résultat**: Utilisateurs voient exactement combien de temps avant le reset de leurs quotas, transparence totale ✨

---

### 11. Grace Period UI

**Status**: ✅ Complété
**Temps réel**: 1h30
**Complexité**: Moyenne

✅ Modal urgente pour périodes de grâce arrivant à expiration (≤ 3 jours)

**Fichiers créés**:
- ✅ `packages/ui/src/components/subscription/GracePeriodModal.tsx`
  - Composant `GracePeriodUrgentModal` avec AnimatePresence (framer-motion)
  - 3 états visuels selon urgence:
    - **Day 0** (expiré): Gradient rouge/orange, icône AlertTriangle
    - **Day 1** (dernier jour): Gradient orange/jaune, icône Clock
    - **Days 2-3**: Gradient purple/pink, icône Clock
  - Features Premium listées avec icônes:
    - Clips illimités (Zap)
    - Fichiers illimités (Shield)
    - Focus/Compact illimités (Clock)
    - Mode Offline permanent (Shield)
  - Messages d'urgence adaptés selon jours restants
  - Boutons CTA adaptatifs: "Activer Premium maintenant" vs "Continuer avec Premium"
  - Bouton secondaire: "Rester en FREE" vs "Me le rappeler plus tard"
  - Close button (X) en haut à droite
  - Backdrop blur avec z-index élevé (9998/9999)

**Fichiers modifiés**:
- ✅ `packages/ui/src/components/subscription/index.ts`
  - Export `GracePeriodUrgentModal` et `GracePeriodModalProps`

- ✅ `apps/notion-clipper-app/src/react/src/App.tsx`
  - Import `GracePeriodUrgentModal`
  - Ajouté état `showGracePeriodModal`
  - useEffect qui check quotas:
    - Détecte `is_grace_period === true`
    - Détecte `grace_period_days_remaining <= 3`
    - Affiche modal avec délai 2s (évite overwhelm au démarrage)
  - Modal intégré dans JSX avec props:
    - `isOpen={showGracePeriodModal}`
    - `daysRemaining={quotasData.grace_period_days_remaining}`
    - `onUpgrade={() => handleUpgradeNow('monthly')}`

**Design Apple/Notion**:
- Gradients vibrants mais élégants
- Animations fluides (spring damping: 25, stiffness: 300)
- Backdrop blur subtil
- Messages encourageants, jamais punitifs
- CTA clair et urgent sans être agressif
- Feature items avec icônes gradient purple/pink
- Responsive, centered, max-width 28rem

**Résultat**: Utilisateurs en grace period sont informés proactivement et encouragés à upgrade avant expiration, UX premium et respectueuse ✨

---

### 12. Premium Features Showcase

**Status**: 🔜 Future
**Temps estimé**: 3-4h
**Complexité**: Moyenne

Page dédiée présentant toutes les features premium :

```tsx
// packages/ui/src/components/subscription/PremiumShowcase.tsx
export const PremiumShowcase = () => (
  <div className="premium-showcase">
    <h2>Passez à Premium</h2>

    <FeatureCard
      icon={<Infinity />}
      title="Clips illimités"
      description="Envoyez autant de clips que vous voulez"
    />

    <FeatureCard
      icon={<Upload />}
      title="Fichiers illimités"
      description="Uploadez tous vos fichiers sans limite"
    />

    // ... autres features
  </div>
);
```

**Fichiers à créer**:
- `packages/ui/src/components/subscription/PremiumShowcase.tsx`

---

## 📊 Statistiques Progression

| Catégorie | Complété | Total | % |
|-----------|----------|-------|---|
| **Quota Checks** | 5/5 | 5 | 100% ✅ |
| **UI Premium** | 5/5 | 5 | 100% ✅ |
| **Intégrations** | 4/4 | 4 | 100% ✅ |
| **Time Tracking** | 2/2 | 2 | 100% ✅ |
| **Optimisations** | 2/3 | 3 | 67% 🔄 |
| **Futures** | 3/5 | 5 | 60% 🔄 |
| **TOTAL** | 21/24 | 24 | 88% |

---

## 🎯 Prochaines Étapes Recommandées

1. **Connecter quota checks à App.tsx** (PRIORITÉ 1)
2. **Tracker usage après actions** (PRIORITÉ 1)
3. **Ajouter PremiumBadge aux features** (PRIORITÉ 1)
4. **Toasts informatifs** (PRIORITÉ 1)
5. **Nettoyer logs production** (PRIORITÉ 2)

**Temps total estimé PRIORITÉ 1**: 5-7 heures
**Temps total estimé PRIORITÉ 2**: 2-3 heures
**Temps total estimé PRIORITÉ 3**: 10-15 heures

---

**Dernière mise à jour**: 2025-11-16
**Mainteneur**: Claude (Sonnet 4.5)
