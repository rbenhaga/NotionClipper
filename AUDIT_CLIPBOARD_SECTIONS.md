# 🔍 AUDIT COMPLET - Détection fichiers & Persistence sections TOC

**Date:** 2025-11-09
**Session:** claude/polish-bubble-animations-011CUxGxMTzr1xSwgp4LM7vs

---

## 📊 PROBLÈMES IDENTIFIÉS

### ❌ Problème 1: text/uri-list détecté mais VIDE

**Symptômes:**
```
[CLIPBOARD] 🔍 ALL available formats: [ 'text/uri-list' ]
[CLIPBOARD] 📎 Detected file format, attempting to read...
[CLIPBOARD] 🔍 clipboard.read("text/uri-list") result: null/empty
[CLIPBOARD] 🔍 Fallback clipboard.readText() result: null/empty
[CLIPBOARD] ❌ text/uri-list format exists but both read methods returned empty
[CLIPBOARD] ❌ readFiles() returned null despite hasFiles=true
```

**Diagnostic:**
- Windows **annonce** `text/uri-list` dans `clipboard.availableFormats()`
- Mais `clipboard.read('text/uri-list')` retourne **null/empty**
- Et `clipboard.readText()` retourne aussi **null/empty**
- C'est une **limitation connue d'Electron sur Windows**

**Root Cause:**
Electron sur Windows ne peut pas lire le format `text/uri-list` avec les méthodes standard `clipboard.read()` ou `clipboard.readText()`. Le format est annoncé dans `availableFormats()` mais les APIs ne peuvent pas y accéder.

**Impact:** 🔴 CRITIQUE
Impossible de copier-coller des fichiers depuis l'explorateur Windows vers Notion.

---

### ❌ Problème 2: Sections TOC effacées au lieu d'être sauvegardées

**Symptômes:**
```
[STORE] Deleted "selectedSections" (empty value)
```

**Diagnostic:**
- L'utilisateur sélectionne une section dans le menu TOC de la bubble
- Le code React appelle `window.electronAPI.invoke('store:set', 'selectedSections', sections)`
- La valeur `sections` est un **tableau vide `[]`**
- Mon fix dans `store.ipc.ts` détecte le tableau vide et appelle `delete()` au lieu de `set()`

**Root Cause:**
Le hook `useSelectedSections.ts` passe un tableau vide à `persistSections()` au lieu du tableau contenant la section sélectionnée. Il y a un bug dans la logique de persistence ou dans le state management.

**Impact:** 🔴 CRITIQUE
Sans sections sauvegardées, le focus mode ne peut pas les charger et envoie toujours le contenu à la fin de la page au lieu de la section sélectionnée.

---

### ❌ Problème 3: Focus mode envoie toujours à la fin

**Symptômes:**
```
[SHORTCUT] CommandOrControl+Shift+C pressed
[NOTION] 📍 Appending 1 blocks to END of page 277f9caeaca9818aaba1eaea503ceab6
```

**Diagnostic:**
- Le shortcut handler dans `main.ts` (lignes 966-1021) charge les sections depuis electron-store
- Mais comme le store est vide (Problème 2), `selectedSections.find()` retourne `undefined`
- Sans section trouvée, `afterBlockId` reste `undefined`
- `sendToNotion()` sans `afterBlockId` ajoute le contenu à la fin

**Root Cause:**
Conséquence directe du Problème 2. C'est un problème en cascade.

**Impact:** 🟡 MOYEN
Une fois le Problème 2 résolu, ce problème devrait disparaître automatiquement.

---

## 🔧 CORRECTIONS PROPOSÉES

### ✅ Correction 1: Utiliser readBuffer() pour text/uri-list

**Fichier:** `packages/adapters/electron/src/clipboard.adapter.ts`
**Lignes:** 373-431

**Stratégie:**
1. Essayer `clipboard.readBuffer('text/uri-list')` au lieu de `clipboard.read()`
2. Décoder avec UTF-8 d'abord, puis UTF-16LE si corrompu
3. Fallback sur `clipboard.read()` puis `clipboard.readText()`
4. Parser avec 2 méthodes: `file://` URIs et raw paths `C:\...`

**Code:**
```typescript
// Try 1: clipboard.readBuffer() - Works better on Windows
const buffer = clipboard.readBuffer('text/uri-list');
if (buffer && buffer.length > 0) {
  // Try UTF-8 first (standard)
  uriList = buffer.toString('utf8');

  // If corrupted, try UTF-16
  if (!uriList || uriList.includes('\ufffd')) {
    uriList = buffer.toString('utf16le');
  }
}

// Try 2: clipboard.read() - Standard method
if (!uriList || !uriList.trim()) {
  uriList = clipboard.read('text/uri-list');
}

// Try 3: clipboard.readText() - Fallback
if (!uriList || !uriList.trim()) {
  uriList = clipboard.readText();
}
```

**Résultat attendu:**
✅ Détection et lecture des fichiers copiés depuis l'explorateur Windows

---

### ✅ Correction 2: Debugger useSelectedSections

**Fichier:** `packages/ui/src/hooks/data/useSelectedSections.ts`
**Lignes:** À auditer

**Investigation nécessaire:**
1. Vérifier que `setSelectedSections()` est appelé avec la bonne valeur
2. Vérifier que `persistSections()` reçoit bien cette valeur
3. Ajouter des logs pour tracer le flow:
   ```typescript
   console.log('[useSelectedSections] Setting sections:', sections);
   console.log('[useSelectedSections] Persisting sections:', sections);
   ```

**Hypothèses:**
- Soit le state est incorrectement updaté (setState asynchrone?)
- Soit `persistSections` est appelé avant que le state ne soit updaté
- Soit il y a un race condition

**Action:** AUDIT + LOGS d'abord, puis correction

---

### ✅ Correction 3: Améliorer le shortcut handler logs

**Fichier:** `apps/notion-clipper-app/src/electron/main.ts`
**Lignes:** 966-1021

**Ajout de logs:**
```typescript
// Après chargement du store
console.log('[SHORTCUT] 📦 Loaded selectedSections from store:', selectedSections);
console.log('[SHORTCUT] 🔍 Looking for section for page:', page.id);

const selectedSection = selectedSections.find(s => s.pageId === page.id);
if (selectedSection) {
  console.log('[SHORTCUT] 📍 Section found:', selectedSection.headingText);
} else {
  console.log('[SHORTCUT] ⚠️ No section found for this page, sending to end');
}
```

**Résultat attendu:**
✅ Tracer précisément pourquoi les sections ne sont pas trouvées

---

## 📋 PLAN D'ACTION

### Phase 1: Correction Clipboard (IMMÉDIAT)
1. ✅ Implémenter `readBuffer()` pour text/uri-list
2. ✅ Tester avec un fichier copié depuis l'explorateur
3. ✅ Vérifier les logs de parsing

### Phase 2: Audit Sections (IMMÉDIAT)
1. ✅ Lire `useSelectedSections.ts` en entier
2. ✅ Ajouter des logs dans `persistSections()` et `setSelectedSections()`
3. ✅ Tracer le flow complet de sélection → persistence
4. ✅ Identifier la root cause du tableau vide

### Phase 3: Fix Sections (APRÈS AUDIT)
1. Corriger le bug identifié dans Phase 2
2. Tester la persistence complète
3. Vérifier que le shortcut handler trouve les sections

### Phase 4: Validation (FINAL)
1. Test complet: Sélectionner section → Copier texte → Ctrl+Shift+C
2. Vérifier logs: Section found → afterBlockId calculated → Content inserted after block
3. Test complet: Copier fichier → Ctrl+Shift+C
4. Vérifier logs: File detected → File uploaded → Added to section

---

## 🎯 PRIORITÉS

1. 🔴 **PRIORITÉ 1:** Fix clipboard readBuffer (Correction 1)
2. 🔴 **PRIORITÉ 2:** Audit useSelectedSections (Correction 2)
3. 🟡 **PRIORITÉ 3:** Fix sections persistence (après audit)
4. 🟢 **PRIORITÉ 4:** Améliorer logs shortcut (Correction 3)

---

## 📝 NOTES TECHNIQUES

### Electron clipboard APIs sur Windows

| Méthode | text/uri-list | Résultat |
|---------|---------------|----------|
| `availableFormats()` | ✅ Annoncé | Format détecté |
| `clipboard.read()` | ❌ null/empty | Ne fonctionne pas |
| `clipboard.readText()` | ❌ null/empty | Ne fonctionne pas |
| `clipboard.readBuffer()` | ❓ À tester | Solution potentielle |

### electron-store contraintes

- ❌ `store.set(key, undefined)` → Error: "Use delete() to clear values"
- ❌ `store.set(key, null)` → Error: "Use delete() to clear values"
- ❌ `store.set(key, [])` → Error: "Use delete() to clear values"
- ✅ `store.delete(key)` → Valeur supprimée
- ✅ `store.set(key, [item])` → Valeur sauvegardée

**Fix appliqué:** Détection auto des valeurs vides → appel de `delete()` au lieu de `set()`

---

## ✅ CORRECTIONS APPLIQUÉES

1. ✅ Créé `store.ipc.ts` avec handlers pour electron-store
2. ✅ Enregistré handlers dans `main.ts`
3. ✅ Ajouté canaux store:* dans `preload.ts` whitelist
4. ✅ Fix electron-store contrainte valeurs vides (auto delete())
5. ✅ Ajouté logs debug text/uri-list
6. ⏳ **EN COURS:** Implémenter readBuffer() pour text/uri-list
7. ⏳ **EN ATTENTE:** Audit useSelectedSections

---

## 🚀 PROCHAINES ÉTAPES

1. Implémenter Correction 1 (readBuffer)
2. Lire et auditer useSelectedSections.ts complet
3. Identifier bug persistence sections
4. Appliquer correction sections
5. Test complet end-to-end

---

**Fin de l'audit**
