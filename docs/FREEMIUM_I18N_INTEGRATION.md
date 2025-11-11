# 🌍 Intégration i18n pour le système Freemium

Ce document explique comment utiliser les traductions i18n dans les composants du système freemium/premium.

## ✅ Ce qui a été fait

1. **Traductions complètes** pour 9 langues :
   - 🇬🇧 English (en)
   - 🇫🇷 Français (fr)
   - 🇪🇸 Español (es)
   - 🇩🇪 Deutsch (de)
   - 🇮🇹 Italiano (it)
   - 🇵🇹 Português (pt)
   - 🇯🇵 日本語 (ja)
   - 🇰🇷 한국어 (ko)
   - 🇸🇦 العربية (ar)

2. **Clés de traduction** disponibles :
   - Noms des tiers (free, premium, gracePeriod)
   - Noms des features (clips, files, focusMode, compactMode)
   - Messages de quotas
   - Contenu de la modal d'upgrade
   - Messages d'avertissement
   - Actions et CTAs

3. **Types TypeScript** : Toutes les clés sont typées pour l'autocomplétion

## 📚 Utilisation dans les composants

### 1. Importer le hook de traduction

```tsx
import { useTranslation } from '@notion-clipper/i18n';
```

### 2. Utiliser dans un composant

#### Exemple : SubscriptionBadge

```tsx
import React from 'react';
import { useTranslation } from '@notion-clipper/i18n';
import { SubscriptionTier } from '@notion-clipper/core-shared/src/types/subscription.types';

export const SubscriptionBadge: React.FC<{ tier: SubscriptionTier }> = ({ tier }) => {
  const { t } = useTranslation();

  const getLabel = () => {
    switch (tier) {
      case SubscriptionTier.PREMIUM:
        return t('subscription.premium'); // "Premium"
      case SubscriptionTier.GRACE_PERIOD:
        return t('subscription.gracePeriod'); // "Premium Trial"
      case SubscriptionTier.FREE:
      default:
        return t('subscription.free'); // "Free"
    }
  };

  return <div className="badge">{getLabel()}</div>;
};
```

#### Exemple : QuotaCounter avec interpolation

```tsx
import React from 'react';
import { useTranslation } from '@notion-clipper/i18n';

export const QuotaCounter: React.FC<{ used: number; limit: number }> = ({ used, limit }) => {
  const { t } = useTranslation();

  const remaining = limit - used;

  return (
    <div>
      <p>
        {t('subscription.remainingThisMonth', {
          remaining: remaining.toString(),
          total: limit.toString(),
          feature: t('subscription.clips'),
        })}
        {/* Output FR: "50/100 Clips restants ce mois-ci" */}
        {/* Output EN: "50/100 Clips remaining this month" */}
      </p>
    </div>
  );
};
```

#### Exemple : UpgradeModal

```tsx
import React from 'react';
import { useTranslation } from '@notion-clipper/i18n';

export const UpgradeModal: React.FC = () => {
  const { t } = useTranslation();

  const features = [
    'featureUnlimitedClips',
    'featureUnlimitedFiles',
    'featureUnlimitedModes',
    'featureNoWordLimit',
    'featurePrioritySupport',
  ];

  return (
    <div className="modal">
      <h2>{t('subscription.upgradeTitle')}</h2>
      <p>{t('subscription.upgradeSubtitle')}</p>

      <ul>
        {features.map((feature) => (
          <li key={feature}>
            {t(`subscription.${feature}` as any)}
          </li>
        ))}
      </ul>

      <div className="price">{t('subscription.upgradePrice')}</div>

      <button>{t('subscription.upgradePrimary')}</button>
      <button>{t('subscription.upgradeSecondary')}</button>
    </div>
  );
};
```

## 🎯 Clés de traduction disponibles

### Tiers
- `subscription.free` - "Gratuit" / "Free"
- `subscription.premium` - "Premium" / "Premium"
- `subscription.gracePeriod` - "Essai Premium" / "Premium Trial"

### Features
- `subscription.clips` - "Clips"
- `subscription.files` - "Fichiers" / "Files"
- `subscription.focusMode` - "Mode Focus" / "Focus Mode"
- `subscription.compactMode` - "Mode Compact" / "Compact Mode"
- `subscription.unlimited` - "Illimité" / "Unlimited"

### Quotas (avec interpolation)
- `subscription.remainingThisMonth` - "{remaining}/{total} {feature} restants ce mois-ci"
- `subscription.quotaReached` - "Limite mensuelle de {feature} atteinte"
- `subscription.resetsIn` - "Réinitialisation dans {days}j"

### Upgrade Modal
- `subscription.upgradeTitle` - "Passez à Premium"
- `subscription.upgradeSubtitle` - "Débloquez tout le potentiel..."
- `subscription.upgradePrice` - "3,99€/mois" (adapté par langue)
- `subscription.upgradePrimary` - "Passer à Premium"
- `subscription.upgradeSecondary` - "Rester en gratuit"

### Features Premium
- `subscription.featureUnlimitedClips` - "Clips illimités"
- `subscription.featureUnlimitedFiles` - "Upload de fichiers sans limite"
- `subscription.featureUnlimitedModes` - "Modes Focus et Compact en illimité"
- `subscription.featureNoWordLimit` - "Aucune limite de longueur de texte"
- `subscription.featurePrioritySupport` - "Support prioritaire"

### Messages spécifiques par feature

#### Clips
- `subscription.clipsQuotaTitle` - "Plus de clips disponibles"
- `subscription.clipsQuotaReached` - "Vous avez atteint votre limite..."
- `subscription.clipsQuotaRemaining` - "Plus que {remaining} clips ce mois-ci"

#### Files
- `subscription.filesQuotaTitle` - "Plus de fichiers disponibles"
- `subscription.filesQuotaReached` - "Vous avez atteint votre limite..."
- `subscription.filesQuotaRemaining` - "Plus que {remaining} fichiers ce mois-ci"

#### Focus Mode
- `subscription.focusModeQuotaTitle` - "Mode Focus épuisé"
- `subscription.focusModeQuotaReached` - "Vous avez utilisé tout votre temps..."
- `subscription.focusModeQuotaRemaining` - "Plus que {remaining} minutes..."

#### Compact Mode
- `subscription.compactModeQuotaTitle` - "Mode Compact épuisé"
- `subscription.compactModeQuotaReached` - "Vous avez utilisé tout votre temps..."
- `subscription.compactModeQuotaRemaining` - "Plus que {remaining} minutes..."

### Warnings
- `subscription.warningAlmostExhausted` - "⚠️ Bientôt épuisé : {remaining}/{total} restants"
- `subscription.warningAttention` - "Attention : {remaining}/{total} restants ce mois-ci"

### Trust Indicators
- `subscription.securePayment` - "Paiement sécurisé"
- `subscription.noCommitment` - "Sans engagement"
- `subscription.cancelAnytime` - "Annulez à tout moment"

### Actions
- `subscription.seeOptions` - "Voir les options"
- `subscription.learnMore` - "En savoir plus"
- `subscription.upgradeNow` - "Passer à Premium maintenant"

## 🔄 Mettre à jour subscription.config.ts

Pour utiliser i18n au lieu des messages hardcodés, mettre à jour le fichier de configuration :

```typescript
// Avant (hardcodé)
export const SUBSCRIPTION_MESSAGES = {
  FREE_TIER: {
    WELCOME: 'Profitez de NotionClipper gratuitement',
    // ...
  }
};

// Après (avec i18n) - À faire dans les composants directement
// Les messages sont maintenant récupérés via t('subscription.freeWelcome')
```

## 💡 Bonnes pratiques

1. **Toujours utiliser le hook** : Ne pas hardcoder les chaînes de caractères
2. **Interpolation** : Utiliser les paramètres pour les valeurs dynamiques
3. **Type safety** : Les clés de traduction sont typées
4. **Fallback** : Si une traduction manque, le système affiche la clé

## 🧪 Tester les traductions

```tsx
import { LocaleProvider } from '@notion-clipper/i18n';

// Wrapper votre app
<LocaleProvider initialLocale="fr">
  <App />
</LocaleProvider>

// Changer la langue dynamiquement
const { setLocale } = useTranslation();
setLocale('ja'); // Passe en japonais
```

## 📝 Ajouter de nouvelles traductions

1. Ajouter la clé dans tous les fichiers `subscription.ts` (9 langues)
2. Mettre à jour l'interface dans `packages/i18n/src/types.ts`
3. Utiliser la nouvelle clé avec `t('subscription.nouvelleClé')`

## ✅ Prochaines étapes

1. Mettre à jour les composants UI existants pour utiliser i18n
2. Remplacer les messages hardcodés dans subscription.config.ts
3. Tester avec différentes langues
4. Vérifier la cohérence des traductions

---

**Créé avec ❤️ par l'équipe NotionClipper**
