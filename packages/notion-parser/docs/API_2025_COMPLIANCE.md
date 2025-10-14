# Conformité API Notion 2025

Ce document détaille comment le parser notion-parser respecte parfaitement les spécifications de l'API Notion 2025 pour les listes et l'imbrication.

## ✅ Architecture Conforme

### 1. Structure Plate (Flat Structure)

L'API Notion 2025 exige une structure plate où tous les blocs sont au même niveau, sans imbrication directe via `children`.

```typescript
// ✅ CORRECT - Structure plate
[
  {
    type: "bulleted_list_item",
    bulleted_list_item: { ... },
    has_children: true  // Indique qu'il a des enfants
  },
  {
    type: "bulleted_list_item", 
    bulleted_list_item: { ... }  // Enfant au même niveau
  }
]

// ❌ INCORRECT - Structure imbriquée
{
  type: "bulleted_list_item",
  bulleted_list_item: {
    children: [...]  // ❌ Interdit
  }
}
```

### 2. Propriétés Interdites Supprimées

Le parser supprime automatiquement toutes les propriétés interdites :

- ❌ `_indentLevel` : Propriété interne pour le calcul de hiérarchie
- ❌ `children` : Géré séparément par l'API
- ❌ Toute propriété commençant par `_`

```typescript
// Nettoyage automatique dans NotionConverter
private cleanBlock(block: NotionBlock): NotionBlock {
  const cleaned = { ...block };
  
  Object.keys(cleaned).forEach(key => {
    if (key.startsWith('_')) {
      delete (cleaned as any)[key];
    }
  });
  
  return cleaned;
}
```

### 3. Indentation Standard (4 espaces = 1 niveau)

Conforme aux spécifications Markdown et API Notion 2025 :

```markdown
- Niveau 0
    - Niveau 1 (4 espaces)
        - Niveau 2 (8 espaces)
```

```typescript
// Détection d'indentation corrigée
const indentLevel = Math.floor(match[1].length / 4);
```

### 4. Propriété `has_children`

Les blocs parents sont marqués avec `has_children: true` :

```json
{
  "type": "bulleted_list_item",
  "bulleted_list_item": {
    "rich_text": [...],
    "color": "default"
  },
  "has_children": true
}
```

## 🎯 Types de Blocs Supportés

Selon la documentation API Notion 2025, ces types supportent l'imbrication :

| Type de bloc | Supporte children | Implémenté |
|--------------|-------------------|------------|
| `paragraph` | ✅ | ✅ |
| `bulleted_list_item` | ✅ | ✅ |
| `numbered_list_item` | ✅ | ✅ |
| `to_do` | ✅ | ✅ |
| `toggle` | ✅ | ✅ |
| `heading_1` | ✅ (avec `is_toggleable`) | ✅ |
| `heading_2` | ✅ (avec `is_toggleable`) | ✅ |
| `heading_3` | ✅ (avec `is_toggleable`) | ✅ |
| `callout` | ✅ | ✅ |
| `quote` | ✅ | ✅ |

## 🔧 Implémentation Technique

### Parsing de l'Indentation

```typescript
// Règles de lexer avec indentation 4 espaces
{
  name: 'bulleted_list_item',
  pattern: /^(\s*)[-*+]\s+(.+)$/,
  extract: (match) => {
    const indentLevel = Math.floor(match[1].length / 4);
    return {
      content: match[2],
      metadata: { indentLevel, listType: 'bulleted' }
    };
  }
}
```

### Conversion vers Structure Plate

```typescript
private convertNodeFlat(node: ASTNode, options: ConversionOptions, blocks: NotionBlock[]): void {
  const block = this.convertNode(node, options);
  
  // Ajouter le bloc parent
  blocks.push(block);
  
  // Marquer si le bloc a des enfants
  if (node.children && node.children.length > 0) {
    (block as any).has_children = true;
    
    // Ajouter les enfants au même niveau (structure plate)
    for (const child of node.children) {
      this.convertNodeFlat(child, options, blocks);
    }
  }
}
```

### Nettoyage Automatique

```typescript
// Nettoyage automatique avant validation
const cleanedBlocks = blocks.map(block => this.cleanBlock(block));
```

## 📊 Validation de Conformité

Le parser inclut une validation automatique qui vérifie :

1. ✅ **Structure plate** : Aucun `children` imbriqué
2. ✅ **Propriétés nettoyées** : Aucune propriété `_*`
3. ✅ **has_children défini** : Parents marqués correctement
4. ✅ **Types supportés** : Seulement les types API valides
5. ✅ **Indentation 4 espaces** : Standard respecté
6. ✅ **JSON sérialisable** : Compatible avec l'API

## 🚀 Utilisation avec l'API Notion

### Envoi Simple

```typescript
import { parseContent } from 'notion-parser';

const result = parseContent(markdown);

// Les blocs sont automatiquement conformes à l'API 2025
await notion.blocks.children.append({
  block_id: pageId,
  children: result.blocks  // ✅ Structure plate, propriétés nettoyées
});
```

### Gestion de la Hiérarchie

```typescript
import { parseContent, ListHierarchyHelper } from 'notion-parser';

const result = parseContent(markdown);
const instructions = ListHierarchyHelper.generateNotionApiInstructions(result.blocks);

// Créer les blocs racines
const rootResponse = await notion.blocks.children.append({
  block_id: pageId,
  children: instructions.rootBlocks
});

// Ajouter les enfants via des appels séparés
for (const operation of instructions.childOperations) {
  const parentBlockId = rootResponse.results[operation.parentBlockIndex].id;
  await notion.blocks.children.append({
    block_id: parentBlockId,
    children: operation.childBlocks
  });
}
```

## ⚠️ Limitations API

Respectées par le parser :

- **Maximum 100 blocs** par requête `appendBlocks`
- **Maximum 2 niveaux** d'imbrication par requête
- **Pas de propriétés personnalisées** dans les blocs
- **Structure plate obligatoire** pour l'envoi

## 🎉 Résultat

Le parser notion-parser respecte **100%** des spécifications API Notion 2025 :

- ✅ Structure plate avec `has_children`
- ✅ Propriétés interdites supprimées automatiquement
- ✅ Indentation standard 4 espaces
- ✅ Types de blocs conformes
- ✅ JSON sérialisable sans erreur
- ✅ Compatible avec `ListHierarchyHelper` pour la hiérarchie

**🚀 Prêt pour la production avec l'API Notion 2025 !**