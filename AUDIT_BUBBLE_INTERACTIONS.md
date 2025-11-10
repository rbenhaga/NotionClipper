# 🔍 AUDIT COMPLET : Interactions Bubble/Menu

**Date** : 2025-11-10
**Composant** : `FloatingBubble.tsx`
**Objectif** : Corriger les problèmes d'interaction avec trackpad tap, touch, et stylus

---

## 📊 État Actuel

### ✅ Fonctionnel
- **Souris (Mouse)** : Drag et clic fonctionnent parfaitement
- **Architecture** : Utilisation de Pointer Events API (bonne pratique)
- **Seuils adaptatifs** : Différents thresholds selon le type d'input

### ❌ Problématique
1. **Trackpad tap** : Ne déclenche pas l'ouverture du menu (nécessite un vrai clic)
2. **Touch (tactile)** : Drag très bugué, événements perdus
3. **Stylus (stylet)** : Drag très bugué, événements perdus

---

## 🔍 Analyse des Problèmes

### Problème 1 : Trackpad Tap Non Détecté

**Code actuel** (ligne 487) :
```typescript
else if (duration < 180) {
  console.log('[Bubble] 🎯 Clic simple → Ouverture menu');
  setState({ type: 'menu', ... });
}
```

**Causes identifiées** :
- ⚠️ Durée trop stricte (180ms) : Un tap sur trackpad peut être légèrement plus long
- ⚠️ `preventDefault()` appelé immédiatement (ligne 416) : Peut interférer avec les événements trackpad
- ⚠️ Pas de distinction entre click et pointerUp : Trackpad peut envoyer des événements différemment

**Impact** : L'utilisateur doit faire un "vrai" clic (press down) au lieu d'un simple tap

---

### Problème 2 : Touch/Stylus Bugué

**Code actuel** (lignes 412-503) :
```typescript
const handleBubblePointerDown = useCallback((e: React.PointerEvent) => {
  e.preventDefault();  // ❌ PROBLÈME 1
  const pointerId = e.pointerId;

  // ... pas de setPointerCapture ❌ PROBLÈME 2

  window.addEventListener('pointermove', onPointerMove as any, { passive: false });
  // ❌ PROBLÈME 3: Pas de touch-action CSS
```

**Causes identifiées** :

#### A. Pas de `setPointerCapture()`
- **Problème** : Sans capture, les événements peuvent être perdus quand le pointer quitte l'élément
- **Impact** : Touch/stylus perdent le tracking lors du drag
- **Solution** : Appeler `elem.setPointerCapture(pointerId)` lors du pointerDown

#### B. `preventDefault()` immédiat sans `touch-action: none`
- **Problème** : `preventDefault()` seul ne suffit pas pour touch events
- **Impact** : Le navigateur peut quand même intercepter les gestes (scroll, zoom, etc.)
- **Solution** : Ajouter `touch-action: none` en CSS + retarder `preventDefault()`

#### C. Pas de CSS `touch-action: none`
- **Problème** : Le navigateur applique ses gestes par défaut (scroll, pinch-zoom, etc.)
- **Impact** : Les événements touch sont interceptés/annulés (`pointercancel`)
- **Solution** : Ajouter `touch-action: none` sur les éléments draggables

#### D. Events listeners sans configuration optimale
- **Problème** : `{ passive: false }` utilisé, mais configuration incomplète
- **Impact** : Certains événements peuvent être droppés
- **Solution** : Configuration optimale des listeners

---

## 🎯 Solutions Recommandées

### Solution 1 : Corriger Trackpad Tap

**Changements** :
1. ✅ Augmenter la durée de clic : `180ms → 300ms`
2. ✅ Retarder `preventDefault()` : Seulement quand le drag commence
3. ✅ Ajouter logging du `pointerType` pour debug

**Code proposé** :
```typescript
const handleBubblePointerDown = useCallback((e: React.PointerEvent) => {
  if (state.type !== 'active' && state.type !== 'idle') return;

  // ✅ NE PAS preventDefault immédiatement pour trackpad tap
  // e.preventDefault();

  const target = e.currentTarget as HTMLElement;
  target.setPointerCapture(e.pointerId);  // ✅ NOUVEAU

  const pointerId = e.pointerId;
  const startX = e.clientX;
  const startY = e.clientY;
  const startTime = performance.now();
  let isDraggingNow = false;

  const onPointerMove = (moveEvent: PointerEvent) => {
    // ...
    if (!isDraggingNow && distanceSquared > threshold) {
      isDraggingNow = true;
      moveEvent.preventDefault();  // ✅ preventDefault SEULEMENT ici
      // ...
    }
  };

  const onPointerUp = (upEvent: PointerEvent) => {
    // ...
    const duration = performance.now() - startTime;

    if (isDraggingNow) {
      // ... drag end
    }
    else if (duration < 300) {  // ✅ AUGMENTÉ 180 → 300ms
      console.log('[Bubble] 🎯 Tap/Click détecté (type:', upEvent.pointerType, ')');
      setState({ type: 'menu', ... });
    }

    target.releasePointerCapture(pointerId);  // ✅ NOUVEAU
  };
});
```

---

### Solution 2 : Corriger Touch/Stylus Drag

**Changements** :
1. ✅ Ajouter `touch-action: none` CSS sur les éléments draggables
2. ✅ Utiliser `setPointerCapture()` / `releasePointerCapture()`
3. ✅ Retarder `preventDefault()` jusqu'au début du drag
4. ✅ Gérer `pointercancel` proprement

**CSS proposé** :
```css
.floating-bubble,
.floating-menu-header {
  touch-action: none;  /* ✅ Désactive tous les gestes natifs */
  user-select: none;   /* ✅ Empêche la sélection de texte */
  -webkit-user-drag: none;  /* ✅ Empêche le drag natif */
}
```

**Code proposé** :
```typescript
const handleBubblePointerDown = useCallback((e: React.PointerEvent) => {
  // ...
  const target = e.currentTarget as HTMLElement;

  // ✅ CAPTURER le pointer pour garantir tous les events
  target.setPointerCapture(e.pointerId);

  const onPointerMove = (moveEvent: PointerEvent) => {
    if (moveEvent.pointerId !== pointerId) return;

    // ... calcul distance ...

    if (!isDraggingNow && distanceSquared > threshold) {
      isDraggingNow = true;
      moveEvent.preventDefault();  // ✅ preventDefault ICI, pas au début
      moveEvent.stopPropagation();

      // ... démarrer drag ...
    }

    if (isDraggingNow) {
      moveEvent.preventDefault();  // ✅ Continuer à prévenir pendant drag
      // ... envoyer position ...
    }
  };

  const onPointerUp = (upEvent: PointerEvent) => {
    // ... cleanup ...

    // ✅ LIBÉRER le pointer
    try {
      target.releasePointerCapture(pointerId);
    } catch (e) {
      // Ignore si déjà libéré
    }
  };

  // ✅ Gérer pointercancel (important pour touch/stylus)
  const onPointerCancel = (cancelEvent: PointerEvent) => {
    console.warn('[Bubble] ⚠️ Pointer cancelled (type:', cancelEvent.pointerType, ')');
    onPointerUp(cancelEvent);  // Traiter comme un pointerUp
  };

  window.addEventListener('pointermove', onPointerMove as any, { passive: false });
  window.addEventListener('pointerup', onPointerUp as any);
  window.addEventListener('pointercancel', onPointerCancel as any);  // ✅ NOUVEAU
});
```

---

## 📚 Références Techniques

### Electron + Pointer Events Best Practices

1. **Utiliser Pointer Events au lieu de Touch Events** (déjà fait ✅)
   - Source : MDN Web Docs, W3C Pointer Events Spec

2. **Toujours utiliser `setPointerCapture()` pour drag**
   - Garantit que tous les événements sont reçus même si le pointer quitte l'élément
   - Source : r0b.io - "Creating drag interactions with setPointerCapture"

3. **CSS `touch-action: none` est OBLIGATOIRE pour custom drag**
   - `preventDefault()` seul ne suffit pas sur Chrome/Electron
   - Source : MDN - touch-action, W3C Pointer Events Issues #387

4. **Retarder `preventDefault()` jusqu'au début du drag**
   - Permet aux taps/clicks de fonctionner normalement
   - Source : StackOverflow - "How to prevent default handling of touch events"

5. **Gérer `pointercancel` pour touch/stylus**
   - Touch/stylus peuvent être annulés par des gestes système
   - Source : StackOverflow - "Stop pointercancel event from firing"

### Limitations Electron Connues

1. **Electron Issue #8725** : Click events not working properly on touch screen devices
2. **Electron Issue #17552** : Electron does not work on touch screens
3. **Electron Issue #42382** : Vibrant BrowserWindow not responding to pointer events

**Note** : Ces issues sont partiellement résolues dans les versions récentes, mais nécessitent une implémentation correcte côté app.

---

## 🎯 Plan d'Implémentation

### Phase 1 : Corrections CSS (Priorité HAUTE)
- [x] Ajouter `touch-action: none` sur `.floating-bubble`
- [x] Ajouter `touch-action: none` sur `.floating-menu-header`
- [x] Ajouter `user-select: none` pour éviter sélection texte
- [x] Ajouter `-webkit-user-drag: none` pour éviter drag natif

### Phase 2 : Corrections JavaScript (Priorité HAUTE)
- [x] Implémenter `setPointerCapture()` / `releasePointerCapture()`
- [x] Retarder `preventDefault()` jusqu'au début du drag
- [x] Augmenter durée clic : 180ms → 300ms
- [x] Gérer `pointercancel` event
- [x] Ajouter logging du `pointerType` pour debug

### Phase 3 : Tests (Priorité HAUTE)
- [ ] Tester souris : drag + clic (ne doit pas casser)
- [ ] Tester trackpad : drag + tap
- [ ] Tester touch : drag avec doigt
- [ ] Tester stylus : drag avec stylet

### Phase 4 : Optimisations (Priorité MOYENNE)
- [ ] Vérifier performance avec touch events
- [ ] Ajuster thresholds si nécessaire
- [ ] Nettoyer les logs de debug

---

## ✅ Résultats Attendus

Après implémentation :
1. ✅ **Trackpad tap** : Ouvre le menu instantanément
2. ✅ **Touch drag** : Drag fluide sans perte d'événements
3. ✅ **Stylus drag** : Drag précis sans bugs
4. ✅ **Souris** : Comportement inchangé (aucune régression)

---

## 🔧 Notes Techniques

### Pourquoi `setPointerCapture()` est critique ?

Sans capture, voici ce qui se passe avec touch/stylus :
```
1. pointerdown sur bubble (x=100, y=100)
2. pointermove (x=105, y=102) → reçu ✅
3. pointermove (x=150, y=120) → PERDU ❌ (hors de la bubble)
4. pointerup → PERDU ❌
```

Avec capture :
```
1. pointerdown + setPointerCapture(pointerId)
2. pointermove (x=105, y=102) → reçu ✅
3. pointermove (x=150, y=120) → reçu ✅ (capturé !)
4. pointerup → reçu ✅
5. releasePointerCapture(pointerId)
```

### Pourquoi `touch-action: none` est critique ?

Sans `touch-action: none`, le navigateur intercepte les gestes :
- **Scroll** : Si l'utilisateur drag verticalement
- **Pinch-zoom** : Si deux doigts sont utilisés
- **Pan** : Si drag horizontal

Ces gestes déclenchent `pointercancel`, ce qui arrête immédiatement le drag custom.

Avec `touch-action: none`, tous ces gestes sont désactivés, garantissant que notre code reçoit 100% des événements.

---

**FIN DE L'AUDIT**
