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

**Status**: 🔄 À faire
**Temps estimé**: 30min
**Complexité**: Facile

Désactiver visuellement les boutons/features quand quota atteint :

```tsx
// Dans Header.tsx
const { summary } = useQuotaContext();

<button
  onClick={handleFocusMode}
  disabled={!summary.focus_mode_time.can_use}
  className={cn(
    'btn-focus-mode',
    !summary.focus_mode_time.can_use && 'opacity-50 cursor-not-allowed'
  )}
>
  Mode Focus
  {!summary.focus_mode_time.can_use && <PremiumBadge variant="compact" />}
</button>
```

**Fichiers à modifier**:
- `packages/ui/src/components/layout/Header.tsx`
- `packages/ui/src/components/editor/FileUploadZone.tsx` (déjà fait ✅)
- Autres boutons/features premium

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

**Status**: 🔜 Future
**Temps estimé**: 2h
**Complexité**: Moyenne

Envoyer notifications push quand quotas < 20% :

```typescript
// Utiliser Electron Notifications API
if (summary.clips.percentage > 80) {
  new Notification('Notion Clipper', {
    body: `Plus que ${summary.clips.remaining} clips ce mois-ci`,
    icon: '/icon.png'
  });
}
```

**Fichiers à modifier**:
- `apps/notion-clipper-app/src/electron/main.ts`

---

### 10. Quota Reset Countdown

**Status**: 🔜 Future
**Temps estimé**: 1h
**Complexité**: Facile

Afficher countdown jusqu'au reset des quotas :

```tsx
// Dans QuotaCounter
<div className="text-xs text-gray-500">
  Reset dans {summary.days_until_reset} jours
  <Countdown targetDate={summary.period_end} />
</div>
```

**Fichiers à modifier**:
- `packages/ui/src/components/subscription/QuotaCounter.tsx`

---

### 11. Grace Period UI

**Status**: 🔜 Future
**Temps estimé**: 2h
**Complexité**: Moyenne

Améliorer l'affichage de la période de grâce :

```tsx
// Modal spéciale pour grace period ending
{summary.is_grace_period && summary.grace_period_days_remaining <= 3 && (
  <GracePeriodUrgentModal
    daysRemaining={summary.grace_period_days_remaining}
    onUpgrade={handleUpgrade}
  />
)}
```

**Fichiers à créer**:
- `packages/ui/src/components/subscription/GracePeriodModal.tsx`

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
| **Optimisations** | 1/3 | 3 | 33% 🔄 |
| **Futures** | 0/5 | 5 | 0% |
| **TOTAL** | 17/24 | 24 | 71% |

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
