# 🎯 Clipper Pro Design System

## Principes fondamentaux

Inspiré par Apple et Notion, ce design system suit ces règles :

1. **Un seul CTA primaire** : Violet (#9333ea) partout
2. **Densité adaptative** : comfortable (64px) / compact (44px)
3. **Sélection style Notion** : fond teinté + trait gauche
4. **Un seul scroll** : pas de scroll imbriqué
5. **États explicites** : hover, focus, disabled, loading

---

## Tokens CSS

Tous les tokens sont dans `src/styles/design-system.css` et utilisent des CSS custom properties.

### Couleurs

```css
--ds-primary: #9333ea;        /* CTA unique */
--ds-primary-hover: #7c3aed;
--ds-primary-subtle: rgba(147, 51, 234, 0.08);

--ds-success: #22c55e;
--ds-error: #ef4444;
--ds-warning: #f59e0b;
```

### Spacing (base 8px)

```css
--ds-space-1: 4px;
--ds-space-2: 8px;
--ds-space-3: 12px;
--ds-space-4: 16px;
--ds-space-6: 24px;
--ds-space-8: 32px;
```

### Densité

```css
--ds-list-item-height-comfortable: 64px;
--ds-list-item-height-compact: 44px;
```

---

## Composants

### Button

```tsx
import { Button, IconButton } from '@notion-clipper/ui';

// Primary (violet) - CTA unique
<Button variant="primary">Envoyer</Button>

// Secondary (outline)
<Button variant="secondary">Annuler</Button>

// Ghost (minimal)
<Button variant="ghost">Options</Button>

// Danger (rouge)
<Button variant="danger">Supprimer</Button>

// Loading state
<Button variant="primary" isLoading loadingText="Envoi...">
  Envoyer
</Button>

// Sizes
<Button size="sm">Petit</Button>
<Button size="md">Normal</Button>
<Button size="lg">Grand</Button>

// Icon button
<IconButton icon={<Settings />} aria-label="Paramètres" />
```

### List Item (PageCard)

```tsx
// Utilise automatiquement le contexte de densité
<PageCard
  page={page}
  isSelected={isSelected}
  isFavorite={isFavorite}
  onClick={handleClick}
  onToggleFavorite={handleFavorite}
/>

// Classes CSS disponibles
.ds-list-item              // Base
.ds-list-item.density-compact  // Mode compact
.ds-list-item.is-selected  // Sélectionné (fond + trait gauche)
```

### Tabs vs Actions

```tsx
// TABS = modes de navigation
<TabBar
  tabs={[
    { id: 'suggested', label: 'Suggérés', icon: 'TrendingUp' },
    { id: 'favorites', label: 'Favoris', icon: 'Star' },
  ]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>

// ACTIONS = boutons d'action
<ActionBar
  actions={[
    { id: 'voice', label: 'Voice', icon: <Mic />, onClick: handleVoice },
    { id: 'template', label: 'Template', icon: <FileText />, disabled: true, disabledReason: 'Coming soon' },
  ]}
/>
```

### Panel (ancré, pas flottant)

```tsx
<SectionTargetPanel
  isOpen={isPanelOpen}
  onClose={() => setIsPanelOpen(false)}
  pageId={selectedPage.id}
  pageTitle={selectedPage.title}
  selectedSection={selectedSection}
  onSectionSelect={handleSectionSelect}
  onClearSection={handleClearSection}
/>
```

---

## Contexte de densité

```tsx
import { DensityProvider, useDensity } from '@notion-clipper/ui';

// Provider (dans App.tsx)
<DensityProvider platform="app" defaultDensity="comfortable">
  <App />
</DensityProvider>

// Extension
<DensityProvider platform="extension" defaultDensity="compact">
  <Extension />
</DensityProvider>

// Hook
const { density, isCompact, toggleDensity } = useDensity();
```

---

## Classes utilitaires

```css
/* Scrollbar unifié */
.ds-scrollbar

/* Badges */
.ds-badge
.ds-badge-primary
.ds-badge-success
.ds-badge-warning
.ds-badge-error

/* Inputs */
.ds-input

/* Spinner */
.ds-spinner
.ds-spinner-sm

/* Skeleton loading */
.ds-skeleton
```

---

## Règles d'or

1. **CTA primaire = violet solid** (jamais gradient pour les actions)
2. **Gradient = marketing only** (upgrade, pro, badges)
3. **Un seul scroll par vue**
4. **Disabled = opacity 0.5 + cursor not-allowed**
5. **Focus visible = ring violet**
6. **Dense par défaut en extension**

---

## Migration

Pour migrer un composant existant :

1. Remplacer les classes Tailwind par les classes `ds-*`
2. Utiliser `useDensityOptional()` pour la densité
3. Remplacer les boutons par `<Button variant="..." />`
4. Utiliser les CSS variables `var(--ds-*)` pour les couleurs

---

## Intégration dans l'App

### 1. Ajouter le DensityProvider

```tsx
// App.tsx
import { DensityProvider } from '@notion-clipper/ui';

function App() {
  return (
    <DensityProvider platform="app" defaultDensity="comfortable">
      <LocaleProvider>
        <SubscriptionProvider>
          {/* ... rest of app */}
        </SubscriptionProvider>
      </LocaleProvider>
    </DensityProvider>
  );
}
```

### 2. Pour l'extension (mode compact par défaut)

```tsx
// Extension.tsx
import { DensityProvider } from '@notion-clipper/ui';

function Extension() {
  return (
    <DensityProvider platform="extension" defaultDensity="compact">
      <MinimalistView {...props} />
    </DensityProvider>
  );
}
```

### 3. Importer le design system CSS

Le fichier `design-system.css` est automatiquement importé via `index.css`.
Assurez-vous que votre app importe les styles :

```tsx
import '@notion-clipper/ui/styles';
```
