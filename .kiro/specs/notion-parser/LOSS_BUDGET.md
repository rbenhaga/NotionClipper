# 📊 LOSS BUDGET - Définition Rigoureuse

**Date**: 16 Décembre 2024  
**Objectif**: Définir EXACTEMENT ce qu'on préserve, dégrade, et drop

---

## 🎯 PRINCIPE FONDAMENTAL

> **"Non-lossy" est un mensonge marketing si on ne définit pas précisément le périmètre.**

Ce document définit le **contrat de fidélité** entre:
- Notion API (source/destination)
- ClipperDoc (format canonique interne)
- BlockNote (vue/éditeur)

---

## 📋 MATRICE DE FIDÉLITÉ PAR BLOC

### Légende
- ✅ **PRESERVE** : Round-trip garanti 100%
- ⚠️ **DEGRADE** : Converti en équivalent proche (perte acceptable)
- ❌ **DROP** : Non supporté, ignoré ou placeholder
- 🔄 **CUSTOM** : Nécessite un custom block BlockNote

| Bloc Notion | Notion → Clipper | Clipper → BN | BN → Clipper | Clipper → Notion | Fidélité |
|-------------|------------------|--------------|--------------|------------------|----------|
| paragraph | ✅ | ✅ | ✅ | ✅ | 100% |
| heading_1/2/3 | ✅ | ✅ | ✅ | ✅ | 100% |
| bulleted_list_item | ✅ | ✅ | ✅ | ✅ | 100% |
| numbered_list_item | ✅ | ✅ | ✅ | ✅ | 100% |
| to_do | ✅ | ✅ | ✅ | ✅ | 100% |
| toggle | ✅ | 🔄 | 🔄 | ✅ | 95% |
| quote | ✅ | 🔄 | 🔄 | ✅ | 95% |
| callout | ✅ | 🔄 | 🔄 | ✅ | 90% |
| code | ✅ | ✅ | ✅ | ✅ | 100% |
| divider | ✅ | ✅ | ✅ | ✅ | 100% |
| image | ✅ | ✅ | ✅ | ✅ | 95% |
| video | ✅ | ✅ | ✅ | ✅ | 90% |
| audio | ✅ | ⚠️ | ⚠️ | ✅ | 80% |
| file | ✅ | ⚠️ | ⚠️ | ✅ | 80% |
| bookmark | ✅ | 🔄 | 🔄 | ✅ | 90% |
| equation | ✅ | 🔄 | 🔄 | ✅ | 95% |
| table | ✅ | ⚠️ | ⚠️ | ✅ | 85% |
| **column_list** | ✅ | ❌ | ❌ | ⚠️ | 60% |
| **synced_block** | ✅ | ❌ | ❌ | ⚠️ | 50% |
| **template** | ❌ | ❌ | ❌ | ❌ | 0% |
| **link_preview** | ⚠️ | ⚠️ | ⚠️ | ⚠️ | 70% |
| **breadcrumb** | ❌ | ❌ | ❌ | ❌ | 0% |
| **table_of_contents** | ❌ | ❌ | ❌ | ❌ | 0% |
| **child_page** | ❌ | ❌ | ❌ | ❌ | 0% |
| **child_database** | ❌ | ❌ | ❌ | ❌ | 0% |

---

## 📝 RICH TEXT - Fidélité Détaillée

| Annotation | Preserve | Notes |
|------------|----------|-------|
| bold | ✅ 100% | |
| italic | ✅ 100% | |
| underline | ✅ 100% | |
| strikethrough | ✅ 100% | |
| code | ✅ 100% | |
| color (text) | ✅ 100% | 10 couleurs Notion |
| color (background) | ✅ 100% | 10 couleurs Notion |
| link | ✅ 100% | |
| **mention (user)** | ⚠️ 70% | Converti en texte "@name" |
| **mention (page)** | ⚠️ 70% | Converti en lien |
| **mention (date)** | ⚠️ 80% | Converti en texte date |
| **mention (database)** | ❌ 0% | Non supporté |
| **equation inline** | ⚠️ 80% | Converti en code inline |


---

## 🔴 PERTES ACCEPTÉES (Explicites)

### 1. Columns (column_list + column)
**Perte**: Layout multi-colonnes → séquence linéaire
**Raison**: BlockNote core ne supporte pas les colonnes (XL package)
**Dégradation**: 
```
[column_list]
  [column] A
  [column] B
→ 
[paragraph] --- Column 1 ---
[...contenu A...]
[paragraph] --- Column 2 ---
[...contenu B...]
```

### 2. Synced Blocks
**Perte**: Synchronisation temps réel entre blocs
**Raison**: Concept Notion-specific, pas de standard WYSIWYG
**Dégradation**:
- Original: Préservé comme bloc normal + metadata `_syncedBlockId`
- Référence: Converti en placeholder "[Synced from: {id}]" + lien

### 3. Mentions
**Perte**: Interactivité (hover, click)
**Raison**: BlockNote ne supporte pas les mentions Notion nativement
**Dégradation**:
- User: "@John Doe" (texte avec style)
- Page: "[Page Title](notion://page/{id})" (lien)
- Date: "December 16, 2024" (texte)

### 4. Templates
**Perte**: Totale
**Raison**: Feature Notion-specific
**Dégradation**: Ignoré (non importé)

### 5. Child Pages / Databases
**Perte**: Totale
**Raison**: Hors scope (on clippe du contenu, pas des structures)
**Dégradation**: Placeholder "[Child page: {title}]"

---

## 🟡 DÉGRADATIONS CONTRÔLÉES

### 1. Tables
**Ce qu'on préserve**:
- Contenu des cellules
- Nombre de colonnes/lignes
- Header row

**Ce qu'on perd**:
- Largeur des colonnes (reset à égal)
- Row header (converti en column header)
- Formatage avancé dans cellules (simplifié)

### 2. Callouts
**Ce qu'on préserve**:
- Texte
- Icône (emoji)
- Couleur de fond

**Ce qu'on perd**:
- Icônes custom (URL) → emoji par défaut 💡
- Children complexes → aplatis

### 3. Media (Audio/Video/File)
**Ce qu'on préserve**:
- URL
- Caption

**Ce qu'on perd**:
- Fichiers uploadés Notion (URL temporaire) → bookmark
- Preview metadata

---

## 🟢 GARANTIES ABSOLUES (Non-négociables)

### 1. Texte
- Tout le texte est préservé à 100%
- Aucune troncation
- Encodage UTF-8 préservé (emoji, unicode)

### 2. Structure hiérarchique
- Nesting des listes préservé
- Parent-child relationships préservés
- Ordre des blocs préservé

### 3. IDs Notion
- Chaque bloc Notion a un ID préservé dans ClipperDoc
- Mapping bidirectionnel stable
- Permet le diff/patch

### 4. Formatage de base
- Bold, italic, underline, strikethrough, code
- Couleurs (10 text + 10 background)
- Liens

---

## 📊 MÉTRIQUES DE FIDÉLITÉ

### Score Global par Use Case

| Use Case | Fidélité Attendue | Acceptable ? |
|----------|-------------------|--------------|
| Article de blog | 95% | ✅ |
| Notes de réunion | 90% | ✅ |
| Documentation technique | 85% | ✅ |
| Page avec colonnes | 60% | ⚠️ |
| Page avec synced blocks | 50% | ⚠️ |
| Database view | 0% | ❌ |

### Règle de Décision
- **> 90%** : Import/export sans warning
- **70-90%** : Warning "Some formatting may be lost"
- **< 70%** : Warning explicite + confirmation utilisateur
- **0%** : Bloc ignoré + notification

---

## 🔄 STRATÉGIE DE RECONCILIATION (Sync)

### Problème: Move/Reorder/Nesting

Le diff/patch naïf ne gère pas:
1. **Move**: Bloc déplacé (même contenu, position différente)
2. **Reorder**: Ordre des blocs changé
3. **Nesting change**: Bloc indenté/désindenté

### Solution: Mapping Stable + Heuristiques

```typescript
interface ClipperBlockMapping {
  clipperId: string;        // ID stable interne
  notionBlockId: string;    // ID Notion (peut changer si recréé)
  contentHash: string;      // Hash du contenu pour détecter les edits
  parentClipperId: string;  // Pour le nesting
  orderIndex: number;       // Pour le reorder
  lastSyncedAt: Date;
  syncStatus: 'synced' | 'modified' | 'new' | 'deleted' | 'moved';
}
```

### Algorithme de Reconciliation

```
1. Pour chaque bloc dans ClipperDoc:
   a. Si clipperId existe dans mapping:
      - Si contentHash différent → UPDATE
      - Si parentClipperId différent → MOVE (delete + create)
      - Si orderIndex différent → REORDER
   b. Sinon → CREATE

2. Pour chaque mapping sans bloc correspondant:
   → DELETE

3. Appliquer dans l'ordre:
   a. DELETE (évite les conflits de position)
   b. UPDATE (in-place)
   c. CREATE (avec after: pour position)
   d. REORDER (via delete + create si nécessaire)
```

### Limitations API Notion

- `PATCH /blocks/{id}` : Update in-place (pas de move)
- `DELETE /blocks/{id}` : Suppression
- `PATCH /blocks/{id}/children` : Append (pas d'insert at position)
- **Pas de "move block"** → delete + create

### Conséquence
Un bloc "déplacé" dans l'éditeur = nouveau notionBlockId après sync.
C'est acceptable car on garde le clipperId stable.
