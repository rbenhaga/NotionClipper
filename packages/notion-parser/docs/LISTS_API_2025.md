# Listes et API Notion 2025

Ce document explique comment utiliser les listes avec l'API Notion 2025 et le parser notion-parser.

## Changements dans l'API Notion 2025

L'API Notion 2025 a modifié la façon dont les listes imbriquées sont gérées :

### ❌ Ancien format (API 2022)
```json
{
  "type": "bulleted_list_item",
  "bulleted_list_item": {
    "rich_text": [...],
    "children": [
      {
        "type": "bulleted_list_item",
        "bulleted_list_item": { ... }
      }
    ]
  }
}
```

### ✅ Nouveau format (API 2025)
```json
// 1. Créer le parent
{
  "type": "bulleted_list_item",
  "bulleted_list_item": {
    "rich_text": [...],
    "color": "default"
  },
  "has_children": true
}

// 2. Ajouter les enfants via un appel séparé
// POST /blocks/{parent_block_id}/children
{
  "children": [
    {
      "type": "bulleted_list_item",
      "bulleted_list_item": { ... }
    }
  ]
}
```

## Utilisation avec notion-parser

### 1. Parser le contenu

```typescript
import { parseContent, ListHierarchyHelper } from 'notion-parser';

const markdown = `
- Parent 1
  - Enfant 1.1
  - Enfant 1.2
- Parent 2
  - Enfant 2.1
`;

const result = parseContent(markdown);
```

### 2. Générer les instructions pour l'API

```typescript
const instructions = ListHierarchyHelper.generateNotionApiInstructions(result.blocks);

console.log(instructions.rootBlocks.length); // Blocs à créer en premier
console.log(instructions.childOperations.length); // Opérations pour les enfants
```

### 3. Envoyer à l'API Notion

```typescript
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function createListsInNotion(pageId: string, instructions: NotionApiInstructions) {
  // Étape 1: Créer les blocs racines
  const rootResponse = await notion.blocks.children.append({
    block_id: pageId,
    children: instructions.rootBlocks
  });

  // Étape 2: Ajouter les enfants
  for (const operation of instructions.childOperations) {
    const parentBlockId = rootResponse.results[operation.parentBlockIndex].id;
    
    await notion.blocks.children.append({
      block_id: parentBlockId,
      children: operation.childBlocks
    });
  }
}
```

## Types de listes supportés

### Listes à puces
```markdown
- Élément 1
- Élément 2
  - Sous-élément 2.1
```

### Listes numérotées
```markdown
1. Premier
2. Deuxième
   1. Sous-élément 2.1
   2. Sous-élément 2.2
```

### Listes de tâches
```markdown
- [ ] Tâche à faire
- [x] Tâche terminée
  - [ ] Sous-tâche
```

## Formatage dans les listes

Le rich text est entièrement supporté dans les listes :

```markdown
- **Gras** et *italique*
- `Code inline` dans liste
- [Lien](https://example.com) dans liste
```

## Exemple complet

```typescript
import { parseContent, ListHierarchyHelper } from 'notion-parser';
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function addListsToPage(pageId: string, markdown: string) {
  // 1. Parser le markdown
  const result = parseContent(markdown);
  
  if (!result.success) {
    throw new Error(`Parsing failed: ${result.error}`);
  }

  // 2. Générer les instructions pour l'API
  const instructions = ListHierarchyHelper.generateNotionApiInstructions(result.blocks);

  // 3. Créer les blocs racines
  const rootResponse = await notion.blocks.children.append({
    block_id: pageId,
    children: instructions.rootBlocks
  });

  // 4. Ajouter les enfants
  for (const operation of instructions.childOperations) {
    const parentBlockId = rootResponse.results[operation.parentBlockIndex].id;
    
    await notion.blocks.children.append({
      block_id: parentBlockId,
      children: operation.childBlocks
    });
  }

  console.log(`✅ Created ${result.blocks.length} blocks with proper hierarchy`);
}

// Utilisation
const markdown = `
# Ma liste

- Parent A
  - Enfant A.1
  - Enfant A.2
- Parent B
  - Enfant B.1
`;

addListsToPage('your-page-id', markdown);
```

## Métadonnées de hiérarchie

Le `ListHierarchyHelper` fournit également des métadonnées détaillées :

```typescript
const metadata = ListHierarchyHelper.generateHierarchyMetadata(result.blocks);

console.log(metadata.rootBlocks); // Indices des blocs racines
console.log(metadata.childBlocks); // Indices des blocs enfants
console.log(metadata.parentChildMap); // Map parent -> enfants
```

## Validation

Tous les blocs générés sont automatiquement validés pour s'assurer qu'ils respectent le format de l'API Notion 2025 :

- ✅ Structure correcte (`type` + propriété correspondante)
- ✅ Rich text formaté
- ✅ Propriétés requises (`rich_text`, `color`)
- ✅ Propriété `has_children` pour les parents
- ✅ Pas de propriétés orphelines

## Migration depuis l'ancienne API

Si vous utilisez encore l'ancienne API Notion, vous pouvez continuer à utiliser le format plat généré par `result.blocks` directement. Le nouveau helper est spécifiquement conçu pour l'API 2025.