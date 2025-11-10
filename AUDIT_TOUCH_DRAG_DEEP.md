# 🔬 AUDIT APPROFONDI : Touch/Stylus Drag Performance

**Date** : 2025-11-10
**Problème** : Le drag touch/stylus ne suit pas le doigt, vibre, et n'est pas fluide
**Objectif** : Identifier toutes les causes et implémenter des solutions optimisées

---

## 🚨 Symptômes Observés

1. **La fenêtre ne suit pas le doigt** : Décalage visible entre le doigt et la fenêtre
2. **Vibrations/Jitter** : La fenêtre tremble pendant le drag
3. **Lag perceptible** : Latence entre le mouvement du doigt et le déplacement de la fenêtre
4. **Mouse drag fonctionne bien** : Le problème est spécifique à touch/stylus

---

## 🔍 Analyse Architecture Actuelle

### Flux des Événements (Touch/Stylus)

```
1. RENDERER PROCESS (React)
   └─> FloatingBubble.tsx : handleBubblePointerDown()
       └─> onPointerDown (React.PointerEvent)
           └─> setPointerCapture(pointerId) ← ⚠️ PROBLÈME 1
               └─> window.addEventListener('pointermove', ...)

2. CHAQUE POINTERMOVE
   └─> onPointerMove(PointerEvent)
       └─> Calcul : distanceSquared
           └─> electronAPI.send('bubble:drag-move', {
                 x: moveEvent.screenX,  ← ⚠️ PROBLÈME 2
                 y: moveEvent.screenY
               })

3. IPC LAYER (Electron)
   └─> preload.ts : send()
       └─> ipcRenderer.send('bubble:drag-move', data) ← ⚠️ LATENCE IPC

4. MAIN PROCESS (Electron)
   └─> focus-mode.ipc.ts : ipcMain.on('bubble:drag-move')
       └─> floatingBubble.onDragMove(position)
           └─> FloatingBubble.ts : applyDragMove()
               └─> window.setBounds({  ← ⚠️ PROBLÈME 3
                     x: newX,
                     y: newY,
                     width, height
                   }, false)
```

**Latence totale estimée** : 16-50ms par frame !

---

## 🐛 Problèmes Identifiés

### Problème 1 : setPointerCapture() avec Touch

**Code actuel** (FloatingBubble.tsx:424) :
```typescript
target.setPointerCapture(pointerId);
```

**Issues** :
- **Latence supplémentaire** : setPointerCapture() peut introduire 5-10ms de latence sur touch events
- **Sampling rate réduit** : Certains navigateurs/Electron réduisent le sampling rate des touch events capturés
- **Pas nécessaire** : Avec `touch-action: none`, les événements ne sont pas perdus

**Impact** : +5-10ms de latence, sampling rate potentiellement réduit

---

### Problème 2 : Envoi de CHAQUE pointermove sans throttle

**Code actuel** (FloatingBubble.tsx:467-472) :
```typescript
if (isDraggingNow) {
  moveEvent.preventDefault();
  electronAPIRef.current?.send?.('bubble:drag-move', {
    x: Math.round(moveEvent.screenX),
    y: Math.round(moveEvent.screenY)
  });
}
```

**Issues** :
- **Trop d'événements** : Touch events peuvent fire à 120Hz+ sur certains écrans
- **IPC overhead** : Chaque send() a un coût de ~2-5ms
- **Main process surchargé** : setBounds() appelé 120+ fois/seconde
- **Pas de batching** : Pas d'utilisation de requestAnimationFrame

**Impact** : +10-30ms de latence cumulée, vibrations dues au surcharge

---

### Problème 3 : screenX/screenY imprécis avec touch

**Code actuel** :
```typescript
x: Math.round(moveEvent.screenX),
y: Math.round(moveEvent.screenY)
```

**Issues** :
- **screenX/screenY peut être imprécis** : Certains navigateurs/Electron ne reportent pas correctement screenX/screenY pour touch events
- **Pas de sub-pixel precision** : Math.round() élimine la précision sub-pixel
- **Peut causer des sauts** : Si screenX/screenY "saute" entre les événements

**Impact** : Vibrations/jitter visibles

---

### Problème 4 : Pas de requestAnimationFrame

**Code actuel** : Envoi direct dans onPointerMove

**Issues** :
- **Pas synchronisé avec le rendering** : Les updates ne sont pas alignés avec le frame rate du navigateur
- **Updates peuvent être droppés** : Si trop d'updates arrivent avant le prochain frame
- **Rendering inefficace** : Le navigateur peut essayer de render à chaque update

**Impact** : Jitter visuel, performance dégradée

---

### Problème 5 : IPC send() synchrone mais coûteux

**Code actuel** : `ipcRenderer.send()` pour chaque mouvement

**Issues** :
- **Pas vraiment "synchrone"** : send() est non-blocking mais pas instantané
- **Serialization overhead** : L'objet position doit être sérialisé
- **Context switch** : Renderer → Main process a un coût
- **120+ calls/seconde** : Avec touch haute fréquence

**Impact** : +2-5ms par événement, surcharge cumulative

---

### Problème 6 : setBounds() appelé trop fréquemment

**Code actuel** (FloatingBubble.ts:482-487) :
```typescript
this.window.setBounds({
  x: newX,
  y: newY,
  width: this.initialBounds.width,
  height: this.initialBounds.height
}, false);
```

**Issues** :
- **setBounds() n'est pas instantané** : Peut prendre 2-8ms selon le système
- **Peut causer des repaints** : Même avec `false`, le window manager doit update
- **120+ calls/seconde** : Avec touch haute fréquence
- **Window manager throttle** : L'OS peut throttler les updates

**Impact** : Vibrations car le window manager ne peut pas suivre

---

## 🎯 Solutions Optimisées

### Solution 1 : Retirer setPointerCapture() pour touch/stylus

**Rationale** :
- Avec `touch-action: none`, les événements ne sont PAS perdus
- setPointerCapture() ajoute de la latence inutile
- Mouse events peuvent garder setPointerCapture() (aucun problème)

**Code proposé** :
```typescript
const handleBubblePointerDown = useCallback((e: React.PointerEvent) => {
  // ...

  const target = e.currentTarget as HTMLElement;
  const pointerId = e.pointerId;

  // ✅ OPTIMISATION: setPointerCapture SEULEMENT pour mouse
  if (e.pointerType === 'mouse') {
    try {
      target.setPointerCapture(pointerId);
    } catch (err) {
      console.warn('[Bubble] Failed to capture pointer:', err);
    }
  }

  // ...
});
```

**Gain attendu** : -5-10ms latence

---

### Solution 2 : Throttle avec requestAnimationFrame

**Rationale** :
- Limiter les updates à 60fps (16.67ms) au lieu de 120+fps
- Synchroniser avec le rendering du navigateur
- Batching automatique des événements

**Code proposé** :
```typescript
const handleBubblePointerDown = useCallback((e: React.PointerEvent) => {
  // ...
  let rafId: number | null = null;
  let lastPosition: { x: number; y: number } | null = null;

  const sendDragUpdate = () => {
    if (lastPosition && isDraggingNow) {
      electronAPIRef.current?.send?.('bubble:drag-move', lastPosition);
      lastPosition = null;
    }
    rafId = null;
  };

  const onPointerMove = (moveEvent: PointerEvent) => {
    // ... calcul threshold ...

    if (isDraggingNow) {
      moveEvent.preventDefault();

      // ✅ Stocker la dernière position
      lastPosition = {
        x: Math.round(moveEvent.screenX),
        y: Math.round(moveEvent.screenY)
      };

      // ✅ Throttle avec RAF (60fps max)
      if (!rafId) {
        rafId = requestAnimationFrame(sendDragUpdate);
      }
    }
  };

  // ...
});
```

**Gain attendu** : -20-30ms latence cumulée, plus fluide

---

### Solution 3 : Utiliser clientX/clientY + window position

**Rationale** :
- clientX/clientY est plus précis que screenX/screenY pour touch events
- On peut calculer la position screen en ajoutant window.screenX/screenY
- Évite les imprécisions de l'API screenX/screenY

**Code proposé** :
```typescript
const onPointerMove = (moveEvent: PointerEvent) => {
  // ...

  if (isDraggingNow) {
    moveEvent.preventDefault();

    // ✅ OPTIMISATION: Calculer screenX/screenY depuis clientX/clientY
    // Plus précis pour touch/stylus
    const screenX = window.screenX + moveEvent.clientX;
    const screenY = window.screenY + moveEvent.clientY;

    lastPosition = {
      x: Math.round(screenX),
      y: Math.round(screenY)
    };

    if (!rafId) {
      rafId = requestAnimationFrame(sendDragUpdate);
    }
  }
};
```

**Gain attendu** : Moins de jitter, plus précis

---

### Solution 4 : Optimiser setBounds() avec throttle côté main

**Rationale** :
- Même avec RAF côté renderer, on peut throttler côté main
- Utiliser setImmediate() ou process.nextTick() pour batcher
- Éviter d'appeler setBounds() si la position n'a pas vraiment changé

**Code proposé** (FloatingBubble.ts) :
```typescript
private lastAppliedPosition: { x: number; y: number } | null = null;
private pendingUpdate: (() => void) | null = null;

onDragMove(position: { x: number; y: number }): void {
  if (!this.window || this.window.isDestroyed() || !this.dragStartPos || !this.initialBounds) {
    return;
  }

  try {
    if (typeof position.x !== 'number' || typeof position.y !== 'number' ||
        isNaN(position.x) || isNaN(position.y)) {
      console.error('[BUBBLE] Invalid position values:', position);
      return;
    }

    const posX = Math.round(position.x);
    const posY = Math.round(position.y);

    // ✅ OPTIMISATION: Éviter les updates identiques
    if (this.lastAppliedPosition &&
        this.lastAppliedPosition.x === posX &&
        this.lastAppliedPosition.y === posY) {
      return;
    }

    // ✅ OPTIMISATION: Batcher avec setImmediate
    if (!this.pendingUpdate) {
      this.pendingUpdate = () => {
        this.applyDragMove({ x: posX, y: posY });
        this.lastAppliedPosition = { x: posX, y: posY };
        this.pendingUpdate = null;
      };
      setImmediate(this.pendingUpdate);
    } else {
      // Update la position pendante
      this.lastAppliedPosition = { x: posX, y: posY };
    }
  } catch (error) {
    console.error('[BUBBLE] Error on drag move:', error);
  }
}
```

**Gain attendu** : -5-10ms, moins de setBounds() calls

---

### Solution 5 : CSS will-change pour optimisation rendering

**Rationale** :
- Indiquer au browser que l'élément va bouger
- Permet au browser d'optimiser le rendering
- Crée un nouveau compositing layer

**Code proposé** (FloatingBubble.tsx) :
```typescript
style={{
  width: 48,
  height: 48,
  borderRadius: '50%',
  // ...
  touchAction: 'none',
  willChange: 'transform',  // ✅ NOUVEAU
  transform: 'translateZ(0)',  // ✅ Force GPU acceleration
}}
```

**Gain attendu** : Rendering plus fluide

---

### Solution 6 : Éviter preventDefault() excessif

**Rationale** :
- `touch-action: none` CSS suffit pour bloquer les gestes
- preventDefault() dans chaque pointermove peut causer des stutters
- Seulement nécessaire quand le drag démarre

**Code proposé** :
```typescript
const onPointerMove = (moveEvent: PointerEvent) => {
  // ...

  if (!isDraggingNow && distanceSquared > threshold) {
    isDraggingNow = true;
    moveEvent.preventDefault();  // ✅ Seulement ici
    // ...
  }

  if (isDraggingNow) {
    // ❌ NE PAS preventDefault() ici si touch-action: none est défini
    // moveEvent.preventDefault();

    lastPosition = { ... };
    // ...
  }
};
```

**Gain attendu** : -2-5ms par événement

---

## 📊 Optimisations Combinées

### Architecture Optimisée

```
1. RENDERER PROCESS (React)
   └─> FloatingBubble.tsx : handleBubblePointerDown()
       └─> onPointerDown
           └─> setPointerCapture() SEULEMENT si mouse
               └─> window.addEventListener('pointermove', ...)

2. CHAQUE POINTERMOVE (120Hz)
   └─> onPointerMove()
       └─> Calcul position (clientX/clientY + window position)
           └─> Stocker dans lastPosition
               └─> Schedule RAF si pas déjà scheduled

3. REQUESTANIMATIONFRAME (60Hz max)
   └─> sendDragUpdate()
       └─> electronAPI.send('bubble:drag-move', lastPosition)
           └─> Réduction de 120Hz → 60Hz = 50% moins d'IPC calls

4. MAIN PROCESS (avec setImmediate batching)
   └─> focus-mode.ipc.ts : ipcMain.on('bubble:drag-move')
       └─> floatingBubble.onDragMove(position)
           └─> Batch avec setImmediate
               └─> window.setBounds() SEULEMENT si position a changé
```

**Latence totale optimisée** : 5-15ms par frame (vs 16-50ms avant)

---

## 🎯 Gains Attendus

| Optimisation | Latence Réduite | Fluidité |
|--------------|-----------------|----------|
| Retirer setPointerCapture (touch) | -5-10ms | ⭐⭐ |
| RAF throttle (60fps) | -20-30ms | ⭐⭐⭐⭐⭐ |
| clientX/clientY + window pos | -2-5ms | ⭐⭐⭐ (moins de jitter) |
| setImmediate batching | -5-10ms | ⭐⭐⭐ |
| CSS will-change | 0ms (rendering) | ⭐⭐⭐⭐ |
| Retirer preventDefault() excessif | -2-5ms/evt | ⭐⭐ |
| **TOTAL** | **-34-60ms** | **⭐⭐⭐⭐⭐** |

---

## 🔧 Plan d'Implémentation

### Phase 1 : Optimisations Renderer (PRIORITÉ HAUTE)
1. ✅ Implémenter RAF throttle avec requestAnimationFrame
2. ✅ Utiliser clientX/clientY + window position
3. ✅ Retirer setPointerCapture() pour touch/stylus
4. ✅ Retirer preventDefault() excessif dans le loop
5. ✅ Ajouter CSS will-change + translateZ(0)

### Phase 2 : Optimisations Main Process (PRIORITÉ MOYENNE)
1. ✅ Implémenter setImmediate batching dans onDragMove
2. ✅ Éviter setBounds() si position identique
3. ✅ Tracking de lastAppliedPosition

### Phase 3 : Tests (PRIORITÉ HAUTE)
1. ⏳ Tester souris (ne doit pas casser)
2. ⏳ Tester touch drag
3. ⏳ Tester stylus drag
4. ⏳ Mesurer latence avec console.time()

---

## 📚 Références Techniques

### Connaissances Electron
1. **IPC Performance** : `ipcRenderer.send()` a ~2-5ms de latence
2. **setBounds() Performance** : 2-8ms selon le window manager
3. **Touch Events** : Peuvent fire à 120Hz+ sur écrans haute fréquence
4. **requestAnimationFrame** : Synchronise à 60fps (16.67ms)

### Best Practices
1. **Throttle high-frequency events** : RAF ou debounce
2. **Batch window operations** : setImmediate ou process.nextTick
3. **GPU acceleration** : will-change + translateZ(0)
4. **Avoid excessive preventDefault()** : CSS touch-action suffit
5. **Prefer clientX/clientY** : Plus précis que screenX/screenY pour touch

---

## ⚠️ Pièges à Éviter

1. **Ne PAS utiliser setTimeout/setInterval** : Pas synchronisé avec rendering
2. **Ne PAS appeler setBounds() sans vérifier** : Coûteux si position identique
3. **Ne PAS capturer le pointer pour touch si inutile** : Ajoute latence
4. **Ne PAS Math.round() trop tôt** : Perd la précision sub-pixel
5. **Ne PAS oublier de cleanup RAF** : Memory leaks possible

---

**FIN DE L'AUDIT APPROFONDI**
